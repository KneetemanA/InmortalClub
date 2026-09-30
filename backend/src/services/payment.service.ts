import prisma from '../config/database';
import { argentinaDate, monthRange, PaymentInputError, splitPayment } from '../utils/payment';
import { CreatePaymentDTO } from '../types';
import { PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { AuditService } from './audit.service';

const auditService = new AuditService();
const paymentUserSelect = {
    id:true, name:true, email:true, roleId:true, active:true, createdAt:true,
    role:{select:{id:true,name:true}},
} satisfies Prisma.UserSelect;

export class PaymentService {
    async deletePayment(paymentId: string, userId: string) {
        return prisma.$transaction(async tx => {
            const payment = await tx.payment.findUnique({where:{id:paymentId}});
            if (!payment) throw new PaymentInputError('Pago no encontrado');
            // La eliminación y su auditoría se confirman juntas.
            await tx.auditLog.create({data:{
                userId, action:'DELETE', entity:'PAYMENT', entityId:paymentId,
                oldData:{memberId:payment.memberId,planId:payment.planId,userId:payment.userId,
                    appliedBenefitId:payment.appliedBenefitId,cancellationReason:payment.cancellationReason,
                    priceOriginal:Number(payment.priceOriginal),discountPercentage:Number(payment.discountPercentage),
                    discountAmount:Number(payment.discountAmount),finalAmount:Number(payment.finalAmount),
                    cashAmount:Number(payment.cashAmount),transferAmount:Number(payment.transferAmount),
                    paymentMethod:payment.paymentMethod,status:payment.status,prorated:payment.prorated,
                    paymentDate:payment.paymentDate.toISOString(),expirationDate:payment.expirationDate.toISOString()},
            }});
            await tx.payment.delete({where:{id:paymentId}});
            return {id:paymentId};
        });
    }
    async updateExpiration(paymentId: string, expirationDate: Date, userId: string) {
        const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!existing || existing.status !== 'PAID') throw new PaymentInputError('El pago no existe o está cancelado');
        const updated = await prisma.payment.update({ where: { id: paymentId }, data: { expirationDate } });
        await auditService.logAction({ userId, action: 'UPDATE', entity: 'PAYMENT', entityId: paymentId,
            oldData: { expirationDate: existing.expirationDate }, newData: { expirationDate } });
        return updated;
    }
    async getNotRenewed(month: string) {
        const { start, end } = monthRange(month);
        return prisma.member.findMany({
            where: { status: 'ACTIVE', AND: [
                { payments: { some: { status: 'PAID', paymentDate: { lt: start } } } },
                { payments: { none: { status: 'PAID', paymentDate: { gte: start, lt: end } } } },
            ] },
            include: { benefits: { include: { benefit: true } }, payments: {
                where: { status: 'PAID', paymentDate: { lt: end } }, orderBy: { paymentDate: 'desc' }, take: 1, include: { plan: true },
            } }, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        });
    }
    // Registrar nuevo pago
    async createPayment(data: CreatePaymentDTO) {
        // Verificar que el miembro existe
        const member = await prisma.member.findUnique({
            where: { id: data.memberId },
            include: {
                benefits: {
                    where: { active: true },
                    include: { benefit: true },
                },
            },
        });

        if (!member) {
            throw new Error('Miembro no encontrado');
        }

        if (member.status !== 'ACTIVE') {
            throw new Error('El miembro está inactivo');
        }

        // Verificar que el plan existe
        const plan = await prisma.plan.findUnique({
            where: { id: data.planId },
        });

        if (!plan) {
            throw new Error('Plan no encontrado');
        }

        // Calcular descuentos
        let discountPercentage = 0;
        let discountAmount = 0;
        let finalAmount = Number(plan.price);
        let appliedBenefitId = null;

        // Si se especifica un beneficio
        if (data.appliedBenefitId) {
            const benefit = await prisma.benefit.findUnique({
                where: { id: data.appliedBenefitId },
            });

            if (!benefit) {
                throw new Error('Beneficio no encontrado');
            }

            // Verificar que el beneficio solo aplica a Full Pass
            if (benefit.onlyFullPass && plan.name !== 'Full Pass') {
                throw new Error('Este beneficio solo aplica al plan Full Pass');
            }

            discountPercentage = Number(benefit.discountPercentage);
            discountAmount = (Number(plan.price) * discountPercentage) / 100;
            finalAmount = Number(plan.price) - discountAmount;
            appliedBenefitId = data.appliedBenefitId;
        }

        // Verificar que el miembro no tenga un pago activo (no vencido)
        const existingActivePayment = await prisma.payment.findFirst({
            where: {
                memberId: data.memberId,
                status: 'PAID',
                expirationDate: {
                    gt: new Date(),
                },
            },
        });

        // Si tiene pago activo, podemos opcionalmente permitir pago anticipado
        // o dar un mensaje de advertencia
        if (existingActivePayment) {
            // Opción: permitir pago anticipado (nuevo pago antes del vencimiento)
            // Lo dejamos pasar pero registramos como pago anticipado
        }

        const split = splitPayment(finalAmount, data.paymentMethod, data.cashAmount);
        // Crear el pago
        const payment = await prisma.payment.create({
            data: {
                memberId: data.memberId,
                planId: data.planId,
                userId: data.userId,
                appliedBenefitId: appliedBenefitId,
                priceOriginal: plan.price,
                discountPercentage: discountPercentage,
                discountAmount: discountAmount,
                finalAmount: finalAmount,
                ...split,
                paymentDate: new Date(),
                expirationDate: data.expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                paymentMethod: data.paymentMethod,
                status: 'PAID',
            },
            include: {
                member: {
                    include: {
                        benefits: {
                            include: { benefit: true },
                        },
                    },
                },
                plan: true,
                appliedBenefit: true,
                user: { select: paymentUserSelect },
            },
        });

        if (data.userId) {
            await auditService.logAction({
                userId: data.userId,
                action: 'CREATE',
                entity: 'PAYMENT',
                entityId: payment.id,
                newData: {
                    id: payment.id,
                    memberId: payment.memberId,
                    planId: payment.planId,
                    finalAmount: payment.finalAmount,
                    paymentMethod: payment.paymentMethod,
                    expirationDate: payment.expirationDate,
                },
            });
        }

        return payment;
    }

    // Obtener todos los pagos con filtros
    async getPayments(filters: {
        memberId?: string;
        status?: PaymentStatus;
        startDate?: Date;
        endDate?: Date;
    }) {
        const where: any = {};

        if (filters.memberId) {
            where.memberId = filters.memberId;
        }

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.startDate || filters.endDate) {
            where.paymentDate = {};
            if (filters.startDate) {
                where.paymentDate.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.paymentDate.lte = filters.endDate;
            }
        }

        return prisma.payment.findMany({
            where,
            include: {
                member: {
                    include: {
                        benefits: {
                            include: { benefit: true },
                        },
                    },
                },
                plan: true,
                appliedBenefit: true,
                user: { select: paymentUserSelect },
            },
            orderBy: {
                paymentDate: 'desc',
            },
        });
    }

    // Obtener pagos de un miembro específico
    async getMemberPayments(memberId: string) {
        return prisma.payment.findMany({
            where: {
                memberId,
            },
            include: {
                plan: true,
                appliedBenefit: true,
                user: { select: paymentUserSelect },
            },
            orderBy: {
                paymentDate: 'desc',
            },
        });
    }

    // Obtener el último pago de un miembro
    async getLastPayment(memberId: string) {
        return prisma.payment.findFirst({
            where: {
                memberId,
                status: 'PAID',
            },
            include: {
                plan: true,
                appliedBenefit: true,
            },
            orderBy: {
                paymentDate: 'desc',
            },
        });
    }

    // Verificar si un miembro está al día
    async checkMemberPaymentStatus(memberId: string) {
        const lastPayment = await this.getLastPayment(memberId);

        if (!lastPayment) {
            return {
                isPaid: false,
                status: 'NO_PAGOS',
                message: 'El miembro no tiene pagos registrados',
                lastPayment: null,
            };
        }

        const now = new Date();
        const isPaid = new Date(lastPayment.expirationDate) > now;

        // Calcular días de atraso si corresponde
        let daysOverdue = 0;
        if (!isPaid) {
            const diffTime = now.getTime() - new Date(lastPayment.expirationDate).getTime();
            daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // Calcular días restantes si está al día
        let daysRemaining = 0;
        if (isPaid) {
            const diffTime = new Date(lastPayment.expirationDate).getTime() - now.getTime();
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
            isPaid,
            status: isPaid ? 'AL_DIA' : 'VENCIDO',
            daysRemaining: isPaid ? daysRemaining : 0,
            daysOverdue: !isPaid ? daysOverdue : 0,
            lastPayment,
        };
    }

    // Obtener miembros con pagos vencidos
    async getMembersWithOverduePayments() {
        const now = new Date();

        // Obtener todos los pagos activos (no vencidos)
        const activePayments = await prisma.payment.findMany({
            where: {
                status: 'PAID',
                expirationDate: {
                    gt: now,
                },
            },
            distinct: ['memberId'],
            select: {
                memberId: true,
            },
        });

        const activeMemberIds: string[] = activePayments.map(p => p.memberId);

        // Obtener todos los miembros activos
        const allActiveMembers = await prisma.member.findMany({
            where: {
                status: 'ACTIVE',
            },
            select: {
                id: true,
            },
        });

        // Filtrar los que no tienen pagos activos
        const overdueMemberIds = allActiveMembers
            .filter(m => !activeMemberIds.includes(m.id))
            .map(m => m.id);

        // Obtener los miembros con sus detalles
        const overdueMembers = await prisma.member.findMany({
            where: {
                id: {
                    in: overdueMemberIds,
                },
            },
            include: {
                benefits: {
                    include: { benefit: true },
                },
                payments: {
                    where: { status: 'PAID' },
                    take: 1,
                    orderBy: {
                        paymentDate: 'desc',
                    },
                    include: {
                        plan: true,
                    },
                },
            },
        });

        return overdueMembers;
    }

    // Obtener miembros con cuotas próximas a vencer (dentro de N días)
    async getUpcomingExpirations(days: number = 7) {
        const now = new Date();
        const futureLimit = new Date();
        futureLimit.setDate(futureLimit.getDate() + days);

        const upcomingPayments = await prisma.payment.findMany({
            where: {
                status: 'PAID',
                expirationDate: {
                    gte: now,
                    lte: futureLimit,
                },
                member: {
                    status: 'ACTIVE',
                },
            },
            distinct: ['memberId'],
            orderBy: {
                expirationDate: 'asc',
            },
            include: {
                member: {
                    include: {
                        benefits: {
                            include: { benefit: true },
                        },
                    },
                },
                plan: true,
                appliedBenefit: true,
            },
        });

        return upcomingPayments.map((p) => {
            const diffTime = new Date(p.expirationDate).getTime() - now.getTime();
            const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            return {
                ...p,
                daysRemaining,
            };
        });
    }

    // Obtener estadísticas de pagos
    async getPaymentStats() {
        const now = new Date();
        const {year, month} = argentinaDate(now);
        const {start: startOfMonth, end: endOfMonth} = monthRange(`${year}-${String(month).padStart(2, '0')}`);

        const monthlyPayments = await prisma.payment.findMany({
            where: {
                paymentDate: {
                    gte: startOfMonth,
                    lt: endOfMonth,
                },
                status: 'PAID',
            },
        });

        const totalMonthlyIncome = monthlyPayments.reduce(
            (sum: number, p: any) => sum + Number(p.finalAmount),
            0
        );

        const paymentsByMethod = await prisma.payment.groupBy({
            by: ['paymentMethod'],
            _count: true,
            _sum: { finalAmount: true },
            where: {
                paymentDate: {
                    gte: startOfMonth,
                    lt: endOfMonth,
                },
                status: 'PAID',
            },
        });

        // ✅ CORREGIDO: Usar findMany con distinct para obtener miembros únicos
        const uniqueMembersWithActivePayments = await prisma.payment.findMany({
            where: {
                status: 'PAID',
                expirationDate: {
                    gt: now,
                },
            },
            select: {
                memberId: true,
            },
            distinct: ['memberId'],
        });

        const activePaymentsCount = uniqueMembersWithActivePayments.length;

        return {
            monthlyPayments: {
                count: monthlyPayments.length,
                total: totalMonthlyIncome,
            },
            paymentsByMethod: paymentsByMethod.map(p => ({
                method: p.paymentMethod,
                count: p._count,
                total: p._sum.finalAmount || 0,
            })),
            activeMembersWithPayments: activePaymentsCount,
        };
    }

    // Renovar plan (crear nuevo pago basado en el último)
    async renewPlan(memberId: string, userId: string, paymentMethod: PaymentMethod, cashAmount?: number, expirationDate?: Date) {
        const lastPayment = await this.getLastPayment(memberId);

        if (!lastPayment) {
            throw new Error('El miembro no tiene pagos anteriores');
        }

        // Verificar que el miembro está activo
        const member = await prisma.member.findUnique({
            where: { id: memberId },
        });

        if (!member || member.status !== 'ACTIVE') {
            throw new Error('El miembro no está activo');
        }

        // Usar el mismo plan y beneficios del último pago
        const newPayment = await this.createPayment({
            memberId,
            planId: lastPayment.planId,
            userId,
            appliedBenefitId: lastPayment.appliedBenefitId || undefined,
            paymentMethod,
            cashAmount,
            expirationDate: expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        return newPayment;
    }

    // Cancelar pago (solo si está permitido)
    async cancelPayment(paymentId: string, reason: string, userId: string) {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new Error('Pago no encontrado');
        }

        if (payment.status === 'CANCELLED') {
            throw new Error('El pago ya está cancelado');
        }

        // Verificar que no esté vencido (opcional)
        if (new Date(payment.expirationDate) < new Date()) {
            throw new Error('No se puede cancelar un pago vencido');
        }

        const cancelledPayment = await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'CANCELLED',
                cancellationReason: reason,
            },
            include: {
                member: true,
                plan: true,
                user: { select: paymentUserSelect },
            },
        });

        if (userId) {
            await auditService.logAction({
                userId,
                action: 'CANCEL',
                entity: 'PAYMENT',
                entityId: paymentId,
                oldData: { status: payment.status, finalAmount: payment.finalAmount },
                newData: { status: 'CANCELLED', cancellationReason: reason },
            });
        }

        return cancelledPayment;
    }
}
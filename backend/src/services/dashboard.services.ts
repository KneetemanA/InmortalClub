import prisma from '../config/database';
import { MemberStatus } from '@prisma/client';

export class DashboardService {
    // Obtener todas las estadísticas del dashboard
    async getDashboardStats() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Ejecutar todas las consultas en paralelo
        const [
            totalMembers,
            activeMembers,
            newMembersThisMonth,
            expiredMembers,
            monthlyIncome,
            monthlyExpense,
            paymentsByPlan,
            recentPayments,
            overdueMembers,
        ] = await Promise.all([
            // Total de miembros
            prisma.member.count(),

            // Miembros activos
            prisma.member.count({
                where: { status: MemberStatus.ACTIVE },
            }),

            // Nuevos miembros del mes
            prisma.member.count({
                where: {
                    importKey:null,
                    enrollmentDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            }),

            // Miembros que dejaron de asistir (inactivos)
            prisma.member.count({
                where: { status: MemberStatus.INACTIVE },
            }),

            // Ingresos del mes (de pagos de cuotas)
            prisma.payment.aggregate({
                where: {
                    paymentDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                    status: 'PAID',
                },
                _sum: {
                    finalAmount: true,
                },
            }),

            // Egresos del mes (movimientos financieros)
            prisma.financialMovement.aggregate({
                where: {
                    type: 'EXPENSE',
                    movementDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
                _sum: {
                    amount: true,
                },
            }),

            // Pagos agrupados por plan
            prisma.payment.groupBy({
                by: ['planId'],
                where: {
                    paymentDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                    status: 'PAID',
                },
                _count: true,
                _sum: {
                    finalAmount: true,
                },
            }),

            // Últimos 10 pagos
            prisma.payment.findMany({
                take: 10,
                where: {
                    status: 'PAID',
                },
                orderBy: {
                    paymentDate: 'desc',
                },
                include: {
                    member: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                    plan: {
                        select: {
                            name: true,
                        },
                    },
                },
            }),

            // Miembros con pagos vencidos (activos pero sin pago vigente)
            this.getOverdueMembers(),
        ]);

        // Obtener nombres de los planes
        const planNames = await prisma.plan.findMany({
            select: {
                id: true,
                name: true,
            },
        });

        const planMap = planNames.reduce((acc: any, p) => {
            acc[p.id] = p.name;
            return acc;
        }, {});

        // Formatear pagos por plan
        const formattedPaymentsByPlan = paymentsByPlan.map((p: any) => ({
            planName: planMap[p.planId] || 'Desconocido',
            count: p._count,
            total: p._sum.finalAmount || 0,
        }));

        // Ingresos totales del mes (suma de todos los pagos)
        const totalMonthlyIncome = Number(monthlyIncome._sum.finalAmount) || 0;
        const totalMonthlyExpense = Number(monthlyExpense._sum.amount) || 0;

        return {
            summary: {
                totalMembers,
                activeMembers,
                inactiveMembers: expiredMembers,
                newMembersThisMonth,
                activePercentage: totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0,
            },
            financial: {
                monthlyIncome: totalMonthlyIncome,
                monthlyExpense: totalMonthlyExpense,
                balance: totalMonthlyIncome - totalMonthlyExpense,
            },
            paymentsByPlan: formattedPaymentsByPlan,
            recentPayments,
            overdueMembers,
            alerts: {
                overdueCount: overdueMembers.length,
                expiredCount: expiredMembers,
                newMembers: newMembersThisMonth,
            },
        };
    }

    // Obtener miembros con pagos vencidos
    async getOverdueMembers() {
        const now = new Date();

        // Obtener todos los miembros activos
        const activeMembers = await prisma.member.findMany({
            where: {
                status: MemberStatus.ACTIVE,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                importedExpirationDate:true,
                currentPlan:{select:{name:true}},
            },
        });

        // Obtener los IDs de miembros con pagos activos
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

        const activeMemberIds = activePayments.map(p => p.memberId);

        // Filtrar miembros que no tienen pagos activos
        const overdueMembers = activeMembers.filter(
            m => !activeMemberIds.includes(m.id) && !(m.importedExpirationDate && m.importedExpirationDate > now)
        );

        // Obtener el último pago de cada miembro vencido
        const membersWithLastPayment = await Promise.all(
            overdueMembers.map(async (member) => {
                const lastPayment = await prisma.payment.findFirst({
                    where: {
                        memberId: member.id,
                        status: 'PAID',
                    },
                    orderBy: {
                        expirationDate: 'desc',
                    },
                    select: {
                        expirationDate: true,
                        plan: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });

                const expirationDate=lastPayment?.expirationDate || member.importedExpirationDate;
                const daysOverdue = expirationDate
                    ? Math.ceil((now.getTime() - expirationDate.getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                return {
                    ...member,
                    lastPlan: member.currentPlan?.name || lastPayment?.plan?.name || 'Plan pendiente',
                    lastPaymentDate: expirationDate || null,
                    daysOverdue,
                };
            })
        );

        // Ordenar por días de atraso (mayor primero)
        return membersWithLastPayment.sort((a, b) => b.daysOverdue - a.daysOverdue);
    }

    // Obtener estadísticas rápidas para el header del dashboard
    async getQuickStats() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [activeMembers, monthlyIncome, overdueCount] = await Promise.all([
            prisma.member.count({
                where: { status: MemberStatus.ACTIVE },
            }),
            prisma.payment.aggregate({
                where: {
                    paymentDate: {
                        gte: startOfMonth,
                    },
                    status: 'PAID',
                },
                _sum: {
                    finalAmount: true,
                },
            }),
            this.getOverdueMembers().then(members => members.length),
        ]);

        return {
            activeMembers,
            monthlyIncome: monthlyIncome._sum.finalAmount || 0,
            overdueCount,
        };
    }
}
import prisma from '../config/database';
import { CreateMemberDTO, UpdateMemberDTO } from '../types';
import { MemberStatus, PaymentMethod } from '@prisma/client';
import { AuditService } from './audit.service';

const auditService = new AuditService();

export class MemberService {
  // Crear nuevo miembro
  async createMember(data: CreateMemberDTO) {
    // Validar que el plan existe
    const plan = await prisma.plan.findUnique({
      where: { id: data.planId },
    });

    if (!plan) {
      throw new Error('Plan no encontrado');
    }

    // Si tiene beneficio, verificar que existe y es válido
    let finalPrice = Number(plan.price);
    let discountPercentage = 0;
    let discountAmount = 0;

    if (data.benefitId) {
      const benefit = await prisma.benefit.findUnique({
        where: { id: data.benefitId },
      });

      if (!benefit || !benefit.active) {
        throw new Error('Beneficio no encontrado');
      }

      // Verificar que el beneficio solo aplica a Full Pass
      if (benefit.onlyFullPass) {
        const planData = await prisma.plan.findUnique({
          where: { id: data.planId },
        });
        if (planData?.name !== 'Full Pass') {
          throw new Error('Este beneficio solo aplica al plan Full Pass');
        }
      }

      discountPercentage = Number(benefit.discountPercentage);
      discountAmount = (Number(plan.price) * discountPercentage) / 100;
      finalPrice = Number(plan.price) - discountAmount;
    }

    // Crear el miembro
    const member = await prisma.member.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        dni: data.dni,
        phone: data.phone,
        email: data.email,
        birthDate: data.birthDate,
        notes: data.notes,
        status: MemberStatus.ACTIVE,
        // Si tiene beneficio, crear relación
        benefits: data.benefitId ? {
          create: {
            benefitId: data.benefitId,
            startDate: new Date(),
            relation: 'HOLDER',
            active: true,
          },
        } : undefined,
        // Crear el primer pago
        payments: {
          create: {
            planId: data.planId,
            userId: data.userId,
            appliedBenefitId: data.benefitId || null,
            priceOriginal: plan.price,
            discountPercentage: discountPercentage,
            discountAmount: discountAmount,
            finalAmount: finalPrice,
            paymentDate: new Date(),
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
            paymentMethod: data.paymentMethod,
            status: 'PAID',
          },
        },
      },
      include: {
        benefits: {
          include: {
            benefit: true,
          },
        },
        payments: {
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

    if (data.userId) {
      await auditService.logAction({
        userId: data.userId,
        action: 'CREATE',
        entity: 'MEMBER',
        entityId: member.id,
        newData: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          dni: member.dni,
          planId: data.planId,
          benefitId: data.benefitId,
        },
      });
    }

    return member;
  }

  // Obtener todos los miembros activos
  async getActiveMembers() {
    return prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
      },
      include: {
        benefits: {
          include: {
            benefit: true,
          },
        },
        payments: {
          take: 1,
          orderBy: {
            paymentDate: 'desc',
          },
          include: {
            plan: true,
          },
        },
      },
      orderBy: {
        firstName: 'asc',
      },
    });
  }

  // Obtener miembro por ID con todos los detalles
  async getMemberById(id: string) {
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        benefits: {
          include: {
            benefit: true,
          },
        },
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
          include: {
            plan: true,
            appliedBenefit: true,
          },
        },
      },
    });

    if (!member) {
      throw new Error('Miembro no encontrado');
    }

    return member;
  }

  // Actualizar miembro
  async updateMember(id: string, data: UpdateMemberDTO, userId?: string) {
    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Miembro no encontrado');
    }

    const member = await prisma.member.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        birthDate: data.birthDate,
        notes: data.notes,
        status: data.status,
      },
    });

    if (userId) {
      await auditService.logAction({
        userId,
        action: 'UPDATE',
        entity: 'MEMBER',
        entityId: id,
        oldData: existing,
        newData: member,
      });
    }

    return member;
  }

  // Dar de baja (soft delete)
  async deactivateMember(id: string, userId?: string) {
    const member = await prisma.member.update({
      where: { id },
      data: {
        status: MemberStatus.INACTIVE,
      },
    });

    if (userId) {
      await auditService.logAction({
        userId,
        action: 'UPDATE',
        entity: 'MEMBER',
        entityId: id,
        oldData: { status: MemberStatus.ACTIVE },
        newData: { status: MemberStatus.INACTIVE },
      });
    }

    return member;
  }

  // Reactivar miembro
  async activateMember(id: string, userId?: string) {
    const member = await prisma.member.update({
      where: { id },
      data: {
        status: MemberStatus.ACTIVE,
      },
    });

    if (userId) {
      await auditService.logAction({
        userId,
        action: 'UPDATE',
        entity: 'MEMBER',
        entityId: id,
        oldData: { status: MemberStatus.INACTIVE },
        newData: { status: MemberStatus.ACTIVE },
      });
    }

    return member;
  }

  // Buscar miembros por nombre o DNI
  async searchMembers(query: string) {
    return prisma.member.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { dni: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        benefits: {
          include: {
            benefit: true,
          },
        },
        payments: {
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
  }

  // Obtener estadísticas de miembros
  async getMemberStats() {
    // Obtener todos los miembros activos y sus planes
    const activeMembers = await prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
      },
      include: {
        payments: {
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

    // Contar por plan
    const byPlan = activeMembers.reduce((acc: any, member) => {
      const planName = member.payments[0]?.plan?.name || 'Sin plan';
      acc[planName] = (acc[planName] || 0) + 1;
      return acc;
    }, {});

    // Convertir a formato esperado
    const byPlanArray = Object.entries(byPlan).map(([name, count]) => ({
      name,
      count,
    }));

    return {
      total: activeMembers.length,
      active: activeMembers.length,
      inactive: 0, // Podrías calcular esto también
      byPlan: byPlan,
    };
  }

  // Verificar si un miembro está al día
  async checkMemberStatus(memberId: string) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        payments: {
          take: 1,
          orderBy: {
            expirationDate: 'desc',
          },
        },
      },
    });

    if (!member) {
      throw new Error('Miembro no encontrado');
    }

    const lastPayment = member.payments[0];
    const isActive = member.status === MemberStatus.ACTIVE;
    const isPaid = lastPayment && new Date(lastPayment.expirationDate) > new Date();

    return {
      isActive,
      isPaid,
      lastPayment,
      status: isActive && isPaid ? 'AL_DIA' : 'ATRASADO',
    };
  }
}

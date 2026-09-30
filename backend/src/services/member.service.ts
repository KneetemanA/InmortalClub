import prisma from '../config/database';
import {memberExpiration} from '../utils/member-coverage';
import { PaymentInputError, proratedMonth, splitPayment } from '../utils/payment';
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

    const now = new Date();
    const proportional = data.prorated ? proratedMonth(finalPrice, now) : undefined;
    finalPrice = proportional?.amount ?? finalPrice;
    const originalPrice = proportional ? proratedMonth(Number(plan.price), now).amount : Number(plan.price);
    discountAmount = Math.round((originalPrice - finalPrice) * 100) / 100;
    const split = splitPayment(finalPrice, data.paymentMethod, data.cashAmount);
    // Crear el miembro
    const member = await prisma.member.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        dni: data.dni,
        phone: data.phone,
        email: data.email === '' ? null : data.email,
        birthDate: data.birthDate,
        notes: data.notes,
        currentPlanId: data.planId,
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
            priceOriginal: originalPrice,
            discountPercentage: discountPercentage,
            discountAmount: discountAmount,
            finalAmount: finalPrice,
            ...split,
            prorated: !!data.prorated,
            paymentDate: now,
            expirationDate: data.expirationDate || proportional?.expirationDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            paymentMethod: data.paymentMethod,
            status: 'PAID',
          },
        },
      },
      include: {
        currentPlan: true,
        benefits: {
          include: {
            benefit: true,
          },
        },
        payments: {
          where:{status:'PAID'},
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
        currentPlan: true,
        benefits: {
          include: {
            benefit: true,
          },
        },
        payments: {
          where:{status:'PAID'},
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
        currentPlan: true,
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
    const {existing, member} = await prisma.$transaction(async tx => {
      const existing = await tx.member.findUnique({where:{id},include:{benefits:{where:{active:true},include:{benefit:true}},payments:{where:{status:'PAID'},take:1,orderBy:{paymentDate:'desc'}}}});
      if(!existing)throw new PaymentInputError('Miembro no encontrado');
      if(!existing.importKey && (data.dni===null || data.phone==='' || data.lastName===''))throw new PaymentInputError('DNI, teléfono y apellido son obligatorios para un socio nuevo');
      const planId=data.currentPlanId === undefined ? existing.currentPlanId || existing.payments[0]?.planId : data.currentPlanId;
      const plan=planId ? await tx.plan.findUnique({where:{id:planId}}) : null;
      if(planId && (!plan || !plan.active))throw new PaymentInputError('Plan no encontrado o inactivo');
      const benefitId=data.benefitId === undefined ? existing.benefits[0]?.benefitId : data.benefitId;
      const benefit=benefitId ? await tx.benefit.findUnique({where:{id:benefitId}}) : null;
      if(benefitId && (!benefit || !benefit.active))throw new PaymentInputError('Beneficio no encontrado o inactivo');
      if(benefit?.onlyFullPass && plan?.name!=='Full Pass')throw new PaymentInputError('Este beneficio solo aplica al plan Full Pass');
      if(data.benefitId !== undefined) {
        await tx.memberBenefit.updateMany({where:{memberId:id,active:true},data:{active:false}});
        if(data.benefitId)await tx.memberBenefit.upsert({where:{memberId_benefitId:{memberId:id,benefitId:data.benefitId}},
          create:{memberId:id,benefitId:data.benefitId,startDate:new Date(),active:true},update:{active:true,endDate:null}});
      }
      const member=await tx.member.update({where:{id},data:{firstName:data.firstName,lastName:data.lastName,dni:data.dni,
        phone:data.phone,email:data.email === '' ? null : data.email,birthDate:data.birthDate,notes:data.notes,
        status:data.status,currentPlanId:data.currentPlanId},include:{currentPlan:true,benefits:{include:{benefit:true}}}});
      return {existing,member};
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
        currentPlan: true,
        benefits: {
          include: {
            benefit: true,
          },
        },
        payments: {
          where:{status:'PAID'},
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
        currentPlan:true,
        payments: {
          where:{status:'PAID'},
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
      const planName = member.currentPlan?.name || member.payments[0]?.plan?.name || 'Sin plan';
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
          where:{status:'PAID'},
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
    const expirationDate = memberExpiration(member);
    const isPaid = !!expirationDate && expirationDate > new Date();

    return {
      isActive,
      isPaid,
      lastPayment,
      expirationDate,
      status: isActive && isPaid ? 'AL_DIA' : 'ATRASADO',
    };
  }
}

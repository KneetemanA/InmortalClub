import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { createBenefitSchema } from '../validations/benefit.validation';
class BenefitInputError extends Error { constructor(message:string, public statusCode=400){super(message)} }
import prisma from '../config/database';
import { AuditService } from './audit.service';

const auditService = new AuditService();

export class BenefitService {
  async createBenefit(data: { name: string; description?: string; discountPercentage: number; onlyFullPass: boolean }, userId: string) {
    const benefit = await prisma.benefit.create({
      data: { ...data, name: data.name.trim(), type: 'CUSTOM' },
    });
    await auditService.logAction({ userId, action: 'CREATE', entity: 'BENEFIT', entityId: benefit.id, newData: benefit });
    return benefit;
  }
  async updateBenefit(id: string, data: Partial<z.infer<typeof createBenefitSchema>> & {active?:boolean}, userId: string) {
    return prisma.$transaction(async tx => {
      const existing = await tx.benefit.findUnique({where:{id}});
      if (!existing) throw new BenefitInputError('Beneficio no encontrado',404);
      const benefit = await tx.benefit.update({where:{id},data});
      await tx.auditLog.create({data:{userId,action:'UPDATE',entity:'BENEFIT',entityId:id,oldData:existing,newData:benefit}});
      return benefit;
    });
  }

  async deleteBenefit(id: string, userId: string) {
    try {
      return await prisma.$transaction(async tx => {
        const existing = await tx.benefit.findUnique({where:{id},include:{_count:{select:{memberBenefits:true,appliedPayments:true}}}});
        if (!existing) throw new BenefitInputError('Beneficio no encontrado',404);
        if (existing._count.memberBenefits || existing._count.appliedPayments) throw new BenefitInputError('Este beneficio tiene socios o pagos asociados. Desactivalo para conservar el historial.',409);
        await tx.benefit.delete({where:{id}});
        await tx.auditLog.create({data:{userId,action:'DELETE',entity:'BENEFIT',entityId:id,oldData:existing}});
        return existing;
      });
    } catch(error) {
      if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2003') throw new BenefitInputError('Este beneficio tiene historial. Desactivalo en lugar de eliminarlo.',409);
      throw error;
    }
  }

  async getBenefits(onlyActive: boolean = true) {
    return prisma.benefit.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async getBenefitById(id: string) {
    const benefit = await prisma.benefit.findUnique({
      where: { id },
    });

    if (!benefit) {
      throw new Error('Beneficio no encontrado');
    }

    return benefit;
  }
}

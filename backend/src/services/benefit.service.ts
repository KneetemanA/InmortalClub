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

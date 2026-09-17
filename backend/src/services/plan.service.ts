import prisma from '../config/database';
import { AuditService } from './audit.service';

const auditService = new AuditService();

export interface CreatePlanDTO {
  name: string;
  description?: string;
  price: number;
  active?: boolean;
}

export interface UpdatePlanDTO {
  name?: string;
  description?: string;
  price?: number;
  active?: boolean;
}

export class PlanService {
  async getPlans(onlyActive: boolean = false) {
    return prisma.plan.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: { price: 'asc' },
    });
  }

  async getPlanById(id: string) {
    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new Error('Plan no encontrado');
    }

    return plan;
  }

  async createPlan(data: CreatePlanDTO, userId?: string) {
    const existing = await prisma.plan.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new Error('Ya existe un plan con ese nombre');
    }

    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        active: data.active !== undefined ? data.active : true,
      },
    });

    if (userId) {
      await auditService.logAction({
        userId,
        action: 'CREATE',
        entity: 'PLAN',
        entityId: plan.id,
        newData: plan,
      });
    }

    return plan;
  }

  async updatePlan(id: string, data: UpdatePlanDTO, userId?: string) {
    const existing = await this.getPlanById(id);

    if (data.name && data.name !== existing.name) {
      const nameConflict = await prisma.plan.findUnique({
        where: { name: data.name },
      });
      if (nameConflict) {
        throw new Error('Ya existe otro plan con ese nombre');
      }
    }

    const updated = await prisma.plan.update({
      where: { id },
      data,
    });

    if (userId) {
      await auditService.logAction({
        userId,
        action: 'UPDATE',
        entity: 'PLAN',
        entityId: updated.id,
        oldData: existing,
        newData: updated,
      });
    }

    return updated;
  }

  async togglePlanStatus(id: string, userId?: string) {
    const existing = await this.getPlanById(id);
    const newStatus = !existing.active;

    const updated = await prisma.plan.update({
      where: { id },
      data: { active: newStatus },
    });

    if (userId) {
      await auditService.logAction({
        userId,
        action: 'UPDATE',
        entity: 'PLAN',
        entityId: updated.id,
        oldData: { active: existing.active },
        newData: { active: updated.active },
      });
    }

    return updated;
  }
}

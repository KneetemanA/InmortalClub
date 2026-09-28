import prisma from '../config/database';
import { AuditAction, Prisma } from '@prisma/client';

export interface LogActionParams {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  oldData?: any;
  newData?: any;
}

export interface AuditFilters {
  entity?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class AuditService {
  /**
   * Registra una acción en el log de auditoría
   */
  async logAction(params: LogActionParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          oldData: params.oldData ? (params.oldData as Prisma.InputJsonValue) : undefined,
          newData: params.newData ? (params.newData as Prisma.InputJsonValue) : undefined,
        },
      });
    } catch (error) {
      console.error('Error registrando auditoría:', error);
      // No bloqueamos el flujo principal si falla el log
      return null;
    }
  }

  /**
   * Obtiene logs de auditoría con filtros y paginación
   */
  async getLogs(filters: AuditFilters = {}) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (filters.entity) {
      where.entity = filters.entity;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: {
                select: { name: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

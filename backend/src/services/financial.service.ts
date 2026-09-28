import prisma from '../config/database';
import { FinancialMovementType } from '@prisma/client';
import { AuditService } from './audit.service';

const auditService = new AuditService();

export interface CreateIncomeDTO {
  categoryId: string;
  userId: string;
  amount: number;
  description?: string;
  movementDate?: Date;
}

export interface CreateExpenseDTO {
  categoryId: string;
  userId: string;
  amount: number;
  description?: string;
  movementDate?: Date;
}

export class FinancialService {
  // Registrar ingreso
  async createIncome(data: CreateIncomeDTO) {
    // Verificar que la categoría existe y es de tipo INCOME
    const category = await prisma.financialCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new Error('Categoría no encontrada');
    }

    if (category.type !== 'INCOME') {
      throw new Error('La categoría no es de tipo INGRESO');
    }

    return prisma.financialMovement.create({
      data: {
        type: 'INCOME',
        categoryId: data.categoryId,
        userId: data.userId,
        amount: data.amount,
        description: data.description,
        movementDate: data.movementDate || new Date(),
      },
      include: {
        category: true,
        user: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  // Registrar egreso
  async createExpense(data: CreateExpenseDTO) {
    // Verificar que la categoría existe y es de tipo EXPENSE
    const category = await prisma.financialCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new Error('Categoría no encontrada');
    }

    if (category.type !== 'EXPENSE') {
      throw new Error('La categoría no es de tipo EGRESO');
    }

    return prisma.financialMovement.create({
      data: {
        type: 'EXPENSE',
        categoryId: data.categoryId,
        userId: data.userId,
        amount: data.amount,
        description: data.description,
        movementDate: data.movementDate || new Date(),
      },
      include: {
        category: true,
        user: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  // Obtener movimientos con filtros
  async getMovements(filters: {
    type?: FinancialMovementType;
    categoryId?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }) {
    const where: any = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      where.movementDate = {};
      if (filters.startDate) {
        where.movementDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.movementDate.lte = filters.endDate;
      }
    }

    return prisma.financialMovement.findMany({
      where,
      include: {
        category: true,
        user: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        movementDate: 'desc',
      },
    });
  }

  // Obtener resumen financiero (incluye cuotas de socios y movimientos extra)
  async getFinancialSummary(startDate: Date, endDate: Date, categoryId?: string) {
    const [movements, payments] = await Promise.all([
      (categoryId === 'MEMBERSHIP' ? Promise.resolve([]) : prisma.financialMovement.findMany({
        where: {
          ...(categoryId ? { categoryId } : {}),
          movementDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          category: true,
        },
      })),
      (categoryId && categoryId !== 'MEMBERSHIP' ? Promise.resolve([]) : prisma.payment.findMany({
        where: {
          paymentDate: {
            gte: startDate,
            lte: endDate,
          },
          status: 'PAID',
        },
        include: {
          plan: { select: { name: true } },
          member: { select: { firstName: true, lastName: true } },
        },
      })),
    ]);

    const filteredMovements = categoryId === 'MEMBERSHIP' ? [] : movements;

    // Ingresos por cuotas de membresía
    const membershipIncome = payments.reduce(
      (sum, p) => sum + Number(p.finalAmount),
      0
    );

    // Ingresos extra de movimientos
    const otherIncome = filteredMovements
      .filter((m) => m.type === 'INCOME')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const totalIncome = membershipIncome + otherIncome;

    const totalExpense = filteredMovements
      .filter((m) => m.type === 'EXPENSE')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const balance = totalIncome - totalExpense;

    // Agrupar por categoría
    const byCategory = filteredMovements.reduce((acc: any, m) => {
      const key = m.categoryId;
      if (!acc[key]) {
        acc[key] = {
          category: m.category.name,
          type: m.type,
          total: 0,
          count: 0,
        };
      }
      acc[key].total += Number(m.amount);
      acc[key].count += 1;
      return acc;
    }, {});

    // Agregar cuotas de membresía a las categorías
    if (membershipIncome > 0 || payments.length > 0) {
      byCategory['MEMBERSHIP'] = {
        category: 'Cuotas de Membresía',
        type: 'INCOME',
        total: membershipIncome,
        count: payments.length,
      };
    }

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        membershipIncome,
        otherIncome,
        totalIncome,
        totalExpense,
        balance,
      },
      paymentsCount: payments.length,
      byCategory: Object.values(byCategory),
      movements: filteredMovements,
    };
  }

  // Semana de lunes a domingo, mes calendario y año calendario de la fecha indicada.
  async getPeriodSummaries(anchor: Date = new Date(), categoryId?: string, timezoneOffsetMinutes = 0) {
    const offset = timezoneOffsetMinutes * 60_000;
    const local = new Date(anchor.getTime() - offset);
    const day = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
    const monday = new Date(day);
    monday.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
    const start = (year: number, month: number, dayOfMonth: number) => new Date(Date.UTC(year, month, dayOfMonth) + offset);
    const end = (year: number, month: number, dayOfMonth: number) => new Date(Date.UTC(year, month, dayOfMonth) + offset - 1);
    const ranges = {
      weekly: [start(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()), end(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 7)],
      monthly: [start(day.getUTCFullYear(), day.getUTCMonth(), 1), end(day.getUTCFullYear(), day.getUTCMonth() + 1, 1)],
      yearly: [start(day.getUTCFullYear(), 0, 1), end(day.getUTCFullYear() + 1, 0, 1)],
    } as const;
    const [weekly, monthly, yearly] = await Promise.all(
      Object.values(ranges).map(([start, end]) => this.getFinancialSummary(start, end, categoryId))
    );
    return { weekly, monthly, yearly };
  }

  // Obtener balance del día (incluye cuotas y movimientos del día)
  async getDailyBalance(date: Date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [movements, payments] = await Promise.all([
      prisma.financialMovement.findMany({
        where: {
          movementDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          category: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          paymentDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: 'PAID',
        },
        include: {
          plan: { select: { name: true } },
        },
      }),
    ]);

    const membershipIncome = payments.reduce(
      (sum, p) => sum + Number(p.finalAmount),
      0
    );

    const otherIncome = movements
      .filter((m) => m.type === 'INCOME')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const totalIncome = membershipIncome + otherIncome;

    const totalExpense = movements
      .filter((m) => m.type === 'EXPENSE')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    return {
      date: startOfDay,
      membershipIncome,
      otherIncome,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      paymentsCount: payments.length,
      movements,
    };
  }

  // Obtener balance del mes
  async getMonthlyBalance(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return this.getFinancialSummary(startDate, endDate);
  }

  // Eliminar movimiento con auditoría
  async deleteMovement(movementId: string, userId?: string) {
    const movement = await prisma.financialMovement.findUnique({
      where: { id: movementId },
    });

    if (!movement) {
      throw new Error('Movimiento no encontrado');
    }

    const deleted = await prisma.financialMovement.delete({
      where: { id: movementId },
    });

    if (userId) {
      await auditService.logAction({
        userId,
        action: 'DELETE',
        entity: 'FINANCIAL_MOVEMENT',
        entityId: movementId,
        oldData: {
          id: movement.id,
          type: movement.type,
          amount: movement.amount,
          categoryId: movement.categoryId,
        },
      });
    }

    return deleted;
  }

  // Obtener todas las categorías
  async getCategories(type?: 'INCOME' | 'EXPENSE') {
    const where: any = { active: true };
    if (type) {
      where.type = type;
    }

    return prisma.financialCategory.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });
  }

  // Crear categoría con verificación de unicidad y auditoría
  async createCategory(name: string, type: 'INCOME' | 'EXPENSE', userId?: string) {
    const upperName = name.trim().toUpperCase();

    const existing = await prisma.financialCategory.findUnique({
      where: {
        name_type: {
          name: upperName,
          type,
        },
      },
    });

    if (existing) {
      throw new Error(`La categoría '${upperName}' ya existe para el tipo ${type}`);
    }

    const category = await prisma.financialCategory.create({
      data: {
        name: upperName,
        type,
        active: true,
      },
    });

    if (userId) {
      await auditService.logAction({
        userId,
        action: 'CREATE',
        entity: 'FINANCIAL_CATEGORY',
        entityId: category.id,
        newData: category,
      });
    }

    return category;
  }
}

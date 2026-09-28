import { z } from 'zod';

export const createIncomeSchema = z.object({
  categoryId: z.string().uuid('ID de categoría inválido'),
  amount: z.number().positive('El monto debe ser positivo'),
  description: z.string().optional(),
  movementDate: z.string().transform(str => new Date(str)).optional(),
});

export const createExpenseSchema = z.object({
  categoryId: z.string().uuid('ID de categoría inválido'),
  amount: z.number().positive('El monto debe ser positivo'),
  description: z.string().optional(),
  movementDate: z.string().transform(str => new Date(str)).optional(),
});

export const financialSummarySchema = z.object({
  startDate: z.string().refine(value => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida'),
  endDate: z.string().refine(value => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida'),
  categoryId: z.union([z.uuid(), z.literal('MEMBERSHIP')]).optional(),
}).refine(x => new Date(x.startDate) <= new Date(x.endDate), 'El inicio debe ser anterior al fin');

export const periodSummarySchema = z.object({
  date: z.iso.datetime({ offset: true }).optional(),
  categoryId: z.union([z.uuid(), z.literal('MEMBERSHIP')]).optional(),
  timezoneOffsetMinutes: z.coerce.number().int().min(-840).max(840).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(2, 'El nombre de la categoría debe tener al menos 2 caracteres'),
  type: z.enum(['INCOME', 'EXPENSE']),
});

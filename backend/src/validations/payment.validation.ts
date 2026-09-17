import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const createPaymentSchema = z.object({
  memberId: z.string().uuid('ID de miembro inválido'),
  planId: z.string().uuid('ID de plan inválido'),
  appliedBenefitId: z.string().uuid('ID de beneficio inválido').optional(),
  paymentMethod: z.enum([PaymentMethod.CASH, PaymentMethod.TRANSFER]),
  expirationDate: z.string().transform(str => new Date(str)).optional(),
});

export const renewPlanSchema = z.object({
  paymentMethod: z.enum([PaymentMethod.CASH, PaymentMethod.TRANSFER]),
});

export const cancelPaymentSchema = z.object({
  reason: z.string().min(3, 'El motivo debe tener al menos 3 caracteres'),
});
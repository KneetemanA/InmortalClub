import { z } from 'zod';
export const expirationDateSchema = z.iso.date().transform(s => new Date(`${s}T23:59:59.999-03:00`));
export const paymentFields = {
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'MIXED']),
  paymentDate:z.iso.date().transform(s=>new Date(`${s}T12:00:00-03:00`)).optional(),
  amount:z.coerce.number().positive().optional(),
  cashAmount: z.coerce.number().positive().optional(),
  expirationDate: expirationDateSchema.optional(),
};
export const createPaymentSchema = z.object({
  memberId: z.uuid(), planId: z.uuid(), appliedBenefitId: z.uuid().optional(), ...paymentFields,
});
export const renewPlanSchema = z.object(paymentFields);
export const updateExpirationSchema = z.object({ expirationDate: expirationDateSchema });
export const cancelPaymentSchema = z.object({ reason: z.string().min(3, 'El motivo debe tener al menos 3 caracteres') });

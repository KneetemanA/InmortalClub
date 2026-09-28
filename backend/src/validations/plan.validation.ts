import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(2, 'El nombre del plan debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  price: z.number().positive('El precio debe ser un número positivo'),
  active: z.boolean().optional(),
});

export const updatePlanSchema = z.object({
  name: z.string().min(2, 'El nombre del plan debe tener al menos 2 caracteres').optional(),
  description: z.string().optional(),
  price: z.number().positive('El precio debe ser un número positivo').optional(),
  active: z.boolean().optional(),
});

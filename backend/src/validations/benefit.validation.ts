import { z } from 'zod';

export const createBenefitSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  discountPercentage: z.number().positive().max(100),
  onlyFullPass: z.boolean(),
});

export const updateBenefitSchema = createBenefitSchema.partial().extend({active:z.boolean().optional()}).refine(data=>Object.keys(data).length>0,'Indicá al menos un cambio');

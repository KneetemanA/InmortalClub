import { z } from 'zod';

export const createBenefitSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  discountPercentage: z.number().positive().max(100),
  onlyFullPass: z.boolean(),
});

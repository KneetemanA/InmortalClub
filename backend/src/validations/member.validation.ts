import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const createMemberSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  dni: z.string().regex(/^\d{7,8}$/, 'DNI inválido (debe ser de 7 u 8 dígitos)'),
  phone: z.string().regex(/^[0-9+\-\s()]{8,15}$/, 'Teléfono inválido'),
  email: z.string().email('Email inválido').optional(),
  birthDate: z.string().transform(str => new Date(str)).optional(),
  notes: z.string().optional(),
  planId: z.string().uuid('ID de plan inválido'),
  benefitId: z.string().uuid('ID de beneficio inválido').optional(),
  paymentMethod: z.enum([PaymentMethod.CASH, PaymentMethod.TRANSFER]),
});

export const updateMemberSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').optional(),
  phone: z.string().regex(/^[0-9+\-\s()]{8,15}$/, 'Teléfono inválido').optional(),
  email: z.string().email('Email inválido').optional(),
  birthDate: z.string().transform(str => new Date(str)).optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
import { z } from 'zod';
import { paymentFields } from './payment.validation';

export const createMemberSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  dni: z.string().regex(/^\d{7,8}$/, 'DNI inválido (debe ser de 7 u 8 dígitos)'),
  phone: z.string().regex(/^[0-9+\-\s()]{8,15}$/, 'Teléfono inválido'),
  email: z.string().email('Email inválido').optional(),
  birthDate: z.iso.date().transform(str => new Date(`${str}T12:00:00-03:00`)).optional(),
  notes: z.string().optional(),
  planId: z.string().uuid('ID de plan inválido'),
  benefitId: z.string().uuid('ID de beneficio inválido').optional(),
  ...paymentFields,
  prorated: z.boolean().optional(),
});

export const updateMemberSchema = z.object({
  dni: z.union([z.string().regex(/^\d{7,8}$/, 'DNI inválido'),z.literal('').transform(()=>null)]).optional(),
  currentPlanId:z.union([z.uuid(),z.literal('').transform(()=>null)]).optional(),
  benefitId:z.union([z.uuid(),z.literal('').transform(()=>null)]).optional(),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  lastName: z.union([z.string().min(2),z.literal('')]).optional(),
  phone: z.union([z.string().regex(/^[0-9+\-\s()]{8,15}$/, 'Teléfono inválido'),z.literal('')]).optional(),
  email: z.union([z.email(), z.literal('')]).optional(),
  birthDate: z.union([z.iso.date().transform(str => new Date(`${str}T12:00:00-03:00`)), z.literal('').transform(() => null)]).optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
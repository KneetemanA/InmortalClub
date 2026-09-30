import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  roleName: z.enum(['ADMIN', 'RECEPTIONIST']),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  newPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email('Email inválido').optional(),
  roleName: z.enum(['ADMIN', 'RECEPTIONIST']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
}).refine(data => Object.keys(data).length > 0, 'Indicá al menos un cambio');

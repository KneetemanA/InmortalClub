import { z } from 'zod';

// Ventas de mostrador (bebidas, remeras, etc.) que carga recepción o administración.
// La fecha es siempre la del momento de la carga: recepción no puede registrar ventas en otras fechas.
export const createSaleSchema = z.object({
  categoryId: z.uuid('Seleccioná una categoría'),
  amount: z.coerce.number().positive('El importe debe ser mayor a cero').max(100_000_000, 'Importe demasiado alto'),
  paymentMethod: z.enum(['CASH', 'TRANSFER'], 'Seleccioná el método de pago'),
  description: z.string().trim().min(2, 'Indicá qué se vendió').max(200, 'Máximo 200 caracteres'),
});

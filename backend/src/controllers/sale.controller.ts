import { Request, Response, NextFunction } from 'express';
import { FinancialService } from '../services/financial.service';
import { AuditService } from '../services/audit.service';
import { argentinaDate } from '../utils/payment';

const financialService = new FinancialService();
const auditService = new AuditService();
const methodLabel = { CASH: 'Efectivo', TRANSFER: 'Transferencia' } as const;

export class SaleController {
  async getCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await financialService.getCategories('INCOME') });
    } catch (error) { next(error); }
  }

  // Solo las ventas propias del día, sin totales: recepción no ve el resumen financiero.
  async getMyTodaySales(req: Request, res: Response, next: NextFunction) {
    try {
      const { start, end } = argentinaDayRange(new Date());
      const movements = await financialService.getMovements({ type: 'INCOME', userId: req.user!.id, startDate: start, endDate: end });
      res.json({
        success: true,
        data: movements.map(m => ({ id: m.id, amount: m.amount, description: m.description, movementDate: m.movementDate, category: { id: m.category.id, name: m.category.name } })),
      });
    } catch (error) { next(error); }
  }

  async createSale(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { categoryId, amount, paymentMethod, description } = req.body as { categoryId: string; amount: number; paymentMethod: 'CASH' | 'TRANSFER'; description: string };
      const movement = await financialService.createIncome({
        categoryId, userId, amount,
        description: `${description} · ${methodLabel[paymentMethod]}`,
      });
      await auditService.logAction({
        userId, action: 'CREATE', entity: 'FINANCIAL_MOVEMENT', entityId: movement.id,
        newData: { type: 'INCOME', categoryId, amount, paymentMethod, description, source: 'SALE' },
      });
      res.status(201).json({ success: true, data: { id: movement.id }, message: 'Venta registrada' });
    } catch (error) { next(error); }
  }
}

// Día calendario de Argentina (UTC-3) que contiene la fecha indicada.
function argentinaDayRange(now: Date) {
  const { year, month, day } = argentinaDate(now);
  const start = new Date(Date.UTC(year, month - 1, day, 3)); // 00:00 en Argentina
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1) };
}

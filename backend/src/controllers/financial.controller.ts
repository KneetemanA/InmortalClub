import { Request, Response, NextFunction } from 'express';
import { FinancialService } from '../services/financial.service';
import { ensureString, ensureQueryString } from '../utils/helpers';

const financialService = new FinancialService();

export class FinancialController {
  // Registrar ingreso
  async createIncome(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
      }

      const { categoryId, amount, description, movementDate } = req.body;

      if (!categoryId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Categoría y monto son requeridos',
        });
      }

      const movement = await financialService.createIncome({
        categoryId,
        userId,
        amount: Number(amount),
        description,
        movementDate: movementDate ? new Date(movementDate) : undefined,
      });

      res.status(201).json({
        success: true,
        data: movement,
        message: 'Ingreso registrado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // Registrar egreso
  async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
      }

      const { categoryId, amount, description, movementDate } = req.body;

      if (!categoryId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Categoría y monto son requeridos',
        });
      }

      const movement = await financialService.createExpense({
        categoryId,
        userId,
        amount: Number(amount),
        description,
        movementDate: movementDate ? new Date(movementDate) : undefined,
      });

      res.status(201).json({
        success: true,
        data: movement,
        message: 'Egreso registrado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtener movimientos
  async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, categoryId, startDate, endDate, userId } = req.query;

      const movements = await financialService.getMovements({
        type: type as any,
        categoryId: categoryId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        userId: userId as string,
      });

      res.json({
        success: true,
        data: movements,
        total: movements.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtener resumen financiero
  async getFinancialSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, categoryId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate y endDate son requeridos',
        });
      }

      const summary = await financialService.getFinancialSummary(
        new Date(startDate as string),
        new Date(endDate as string),
        categoryId as string | undefined
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPeriodSummaries(req: Request, res: Response, next: NextFunction) {
    try {
      const { date, categoryId, timezoneOffsetMinutes } = req.query;
      const summaries = await financialService.getPeriodSummaries(date ? new Date(date as string) : new Date(), categoryId as string | undefined, Number(timezoneOffsetMinutes ?? 0));
      res.json({ success: true, data: summaries });
    } catch (error) { next(error); }
  }

  // Obtener balance del día
  async getDailyBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { date } = req.query;
      const balance = await financialService.getDailyBalance(
        date ? new Date(date as string) : new Date()
      );

      res.json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtener balance del mes
  async getMonthlyBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month } = req.query;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: 'year y month son requeridos',
        });
      }

      const balance = await financialService.getMonthlyBalance(
        Number(year),
        Number(month)
      );

      res.json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtener categorías
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.query;
      const categories = await financialService.getCategories(type as any);

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  // Crear categoría
  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, type } = req.body;
      const userId = req.user?.id;
      const category = await financialService.createCategory(name, type, userId);

      res.status(201).json({
        success: true,
        data: category,
        message: 'Categoría creada exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // Eliminar movimiento
  async deleteMovement(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const userId = req.user?.id;
      await financialService.deleteMovement(id, userId);

      res.json({
        success: true,
        message: 'Movimiento eliminado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

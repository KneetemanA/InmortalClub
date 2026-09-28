import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.services';

const dashboardService = new DashboardService();

export class DashboardController {
  // Obtener todas las estadísticas del dashboard
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getDashboardStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtener estadísticas rápidas
  async getQuickStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getQuickStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
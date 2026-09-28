import { Request, Response, NextFunction } from 'express';
import { PlanService } from '../services/plan.service';
import { ensureString, ensureQueryBoolean } from '../utils/helpers';

const planService = new PlanService();

export class PlanController {
  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const onlyActive = ensureQueryBoolean(req.query.onlyActive);
      const plans = await planService.getPlans(onlyActive ?? false);
      res.json({
        success: true,
        data: plans,
        total: plans.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlanById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const plan = await planService.getPlanById(id);
      res.json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const plan = await planService.createPlan(req.body, userId);
      res.status(201).json({
        success: true,
        data: plan,
        message: 'Plan creado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const userId = req.user?.id;
      const plan = await planService.updatePlan(id, req.body, userId);
      res.json({
        success: true,
        data: plan,
        message: 'Plan actualizado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  async togglePlanStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const userId = req.user?.id;
      const plan = await planService.togglePlanStatus(id, userId);
      res.json({
        success: true,
        data: plan,
        message: `Plan ${plan.active ? 'activado' : 'desactivado'} exitosamente`,
      });
    } catch (error) {
      next(error);
    }
  }
}

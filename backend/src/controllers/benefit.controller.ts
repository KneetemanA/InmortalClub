import { Request, Response, NextFunction } from 'express';
import { BenefitService } from '../services/benefit.service';
import { ensureString, ensureQueryBoolean } from '../utils/helpers';

const benefitService = new BenefitService();

export class BenefitController {
  async createBenefit(req: Request, res: Response, next: NextFunction) {
    try {
      const benefit = await benefitService.createBenefit(req.body, req.user!.id);
      res.status(201).json({ success: true, data: benefit, message: 'Beneficio creado exitosamente' });
    } catch (error) { next(error); }
  }
  async getBenefits(req: Request, res: Response, next: NextFunction) {
    try {
      const onlyActive = ensureQueryBoolean(req.query.onlyActive);
      const benefits = await benefitService.getBenefits(onlyActive ?? true);
      res.json({
        success: true,
        data: benefits,
        total: benefits.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBenefitById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const benefit = await benefitService.getBenefitById(id);
      res.json({
        success: true,
        data: benefit,
      });
    } catch (error) {
      next(error);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { argentinaDate } from '../utils/payment';
import { PaymentService } from '../services/payment.service';
import { ensureString, ensureQueryString } from '../utils/helpers';

const paymentService = new PaymentService();

export class PaymentController {
  async updateExpiration(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      const data = await paymentService.updateExpiration(ensureString(req.params.id), req.body.expirationDate, req.user.id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
  async getNotRenewed(req: Request, res: Response, next: NextFunction) {
    try {
      const {year, month} = argentinaDate();
      const data = await paymentService.getNotRenewed(ensureQueryString(req.query.month) || `${year}-${String(month).padStart(2, '0')}`);
      res.json({ success: true, data, total: data.length });
    } catch (error) { next(error); }
  }
  // Registrar nuevo pago
  async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
      }

      const payment = await paymentService.createPayment({
        ...req.body,
        userId,
      });

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Pago registrado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtener todos los pagos
  async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { memberId, status, startDate, endDate } = req.query;

      const payments = await paymentService.getPayments({
        memberId: memberId as string,
        status: status as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json({
        success: true,
        data: payments,
        total: payments.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtener pagos de un miembro
  async getMemberPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const payments = await paymentService.getMemberPayments(id);

      res.json({
        success: true,
        data: payments,
        total: payments.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Verificar estado de pago de un miembro
  async checkMemberPaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const status = await paymentService.checkMemberPaymentStatus(id);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtener miembros con pagos vencidos
  async getMembersWithOverduePayments(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await paymentService.getMembersWithOverduePayments();

      res.json({
        success: true,
        data: members,
        total: members.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtener cuotas próximas a vencer
  async getUpcomingExpirations(req: Request, res: Response, next: NextFunction) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
      const windowDays = isNaN(days) || days <= 0 ? 7 : days;
      const payments = await paymentService.getUpcomingExpirations(windowDays);

      res.json({
        success: true,
        data: payments,
        total: payments.length,
        windowDays,
      });
    } catch (error) {
      next(error);
    }
  }

  // Estadísticas de pagos
  async getPaymentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await paymentService.getPaymentStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // Renovar plan
  async renewPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
      }

      const { paymentMethod, cashAmount, expirationDate } = req.body;

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'El método de pago es requerido',
        });
      }

      const payment = await paymentService.renewPlan(id, userId, paymentMethod, cashAmount, expirationDate);

      res.json({
        success: true,
        data: payment,
        message: 'Plan renovado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // Cancelar pago
  async cancelPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
      }

      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'El motivo de cancelación es requerido',
        });
      }

      const payment = await paymentService.cancelPayment(id, reason, userId);

      res.json({
        success: true,
        data: payment,
        message: 'Pago cancelado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }
}
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import { ensureQueryString, ensureQueryNumber } from '../utils/helpers';
import { AuditAction } from '@prisma/client';

const auditService = new AuditService();

export class AuditController {
  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const entity = ensureQueryString(req.query.entity);
      const entityId = ensureQueryString(req.query.entityId);
      const userId = ensureQueryString(req.query.userId);
      const action = ensureQueryString(req.query.action) as AuditAction | undefined;
      const startDateStr = ensureQueryString(req.query.startDate);
      const endDateStr = ensureQueryString(req.query.endDate);
      const page = ensureQueryNumber(req.query.page);
      const limit = ensureQueryNumber(req.query.limit);

      const result = await auditService.getLogs({
        entity,
        entityId,
        userId,
        action,
        startDate: startDateStr ? new Date(startDateStr) : undefined,
        endDate: endDateStr ? new Date(endDateStr) : undefined,
        page,
        limit,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

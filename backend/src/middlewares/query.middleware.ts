import { Request, Response, NextFunction } from 'express';
import { ensureQueryString } from '../utils/helpers';

declare global {
  namespace Express {
    interface Request {
      parsedQuery: {
        q?: string;
        page?: number;
        limit?: number;
        status?: string;
        [key: string]: string | number | undefined;
      };
    }
  }
}

export function parseQueryParams(req: Request, res: Response, next: NextFunction) {
  req.parsedQuery = {
    q: ensureQueryString(req.query.q),
    page: req.query.page ? Number(req.query.page) || 1 : 1,
    limit: req.query.limit ? Number(req.query.limit) || 10 : 10,
    status: ensureQueryString(req.query.status),
  };
  next();
}
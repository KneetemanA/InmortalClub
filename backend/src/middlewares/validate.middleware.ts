import { Request, Response, NextFunction } from 'express';
import { z, ZodTypeAny } from 'zod';

// Valida el cuerpo de la petición (req.body)
export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Valida parcialmente el cuerpo de la petición (req.body)
export const validatePartial = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partialSchema = typeof schema.partial === 'function' ? schema.partial() : schema;
      req.body = await partialSchema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Valida parámetros de consulta (req.query)
export const validateQuery = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.query);
      Object.assign(req.query, parsed);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación en parámetros de consulta',
          errors: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Valida parámetros de ruta como UUIDs (req.params[paramName])
export const validateIdParam = (paramName: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params[paramName];
      await z.string().uuid({ message: `El parámetro '${paramName}' debe ser un UUID válido` }).parseAsync(id);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación en parámetro de ruta',
          errors: error.issues.map((issue) => ({
            field: paramName,
            message: issue.message,
          })),
        });
      }
      next(error);
    }
  };
};
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import prisma from '../config/database';

const authService = new AuthService();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    roleId: string;
    roleName: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado',
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado',
      });
    }

    const decoded = authService.verifyToken(token) as {
      id: string;
      email: string;
      name: string;
      roleId: string;
      roleName: string;
    };

    // Los permisos y el estado de la cuenta se consultan en cada petición protegida.
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });
    if (!currentUser || !currentUser.active) {
      return res.status(401).json({ success: false, message: 'Cuenta inactiva o inexistente' });
    }
    req.user = {
      id: currentUser.id, email: currentUser.email, name: currentUser.name,
      roleId: currentUser.roleId, roleName: currentUser.role.name,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Token inválido',
    });
  }
};

// Middleware para verificar roles
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
    }

    if (!allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción',
      });
    }

    next();
  };
};

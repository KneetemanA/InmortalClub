import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../config/database';

const authService = new AuthService();

export class AuthController {
  // Login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos',
        });
      }

      const result = await authService.login(email, password);

      res.json({
        success: true,
        data: result,
        message: 'Login exitoso',
      });
    } catch (error) {
      next(error);
    }
  }

  // Registrar usuario
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, roleId } = req.body;

      if (!name || !email || !password || !roleId) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos',
        });
      }

      const user = await authService.register({ name, email, password, roleId });

      res.status(201).json({
        success: true,
        data: user,
        message: 'Usuario registrado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // Cambiar contraseña
  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
      }

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual y nueva son requeridas',
        });
      }

      const result = await authService.changePassword(userId, oldPassword, newPassword);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtener perfil del usuario actual
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
      }

      const { password, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword,
      });
    } catch (error) {
      next(error);
    }
  }
}
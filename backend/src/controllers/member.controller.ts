import { Request, Response, NextFunction } from 'express';
import { MemberService } from '../services/member.service';
import { ensureString, ensureQueryString } from '../utils/helpers';

const memberService = new MemberService();

export class MemberController {
  // Crear miembro
  async createMember(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
      }

      const member = await memberService.createMember({
        ...req.body,
        userId,
      });
      
      res.status(201).json({
        success: true,
        data: member,
        message: 'Miembro creado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtener todos los miembros activos
  async getActiveMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await memberService.getActiveMembers();
      res.json({
        success: true,
        data: members,
        total: members.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtener miembro por ID
  async getMemberById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const member = await memberService.getMemberById(id);
      res.json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  // Actualizar miembro
  async updateMember(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const userId = req.user?.id;
      const member = await memberService.updateMember(id, req.body, userId);
      res.json({
        success: true,
        data: member,
        message: 'Miembro actualizado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // Dar de baja
  async deactivateMember(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const userId = req.user?.id;
      const member = await memberService.deactivateMember(id, userId);
      res.json({
        success: true,
        data: member,
        message: 'Miembro dado de baja exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // Reactivar
  async activateMember(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const userId = req.user?.id;
      const member = await memberService.activateMember(id, userId);
      res.json({
        success: true,
        data: member,
        message: 'Miembro reactivado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // Buscar miembros
  async searchMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const q = ensureQueryString(req.query.q);
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'El parámetro de búsqueda "q" es requerido',
        });
      }
      const members = await memberService.searchMembers(q);
      res.json({
        success: true,
        data: members,
        total: members.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Estadísticas
  async getMemberStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await memberService.getMemberStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // Verificar estado de cuota
  async checkMemberStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = ensureString(req.params.id);
      const status = await memberService.checkMemberStatus(id);
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
}
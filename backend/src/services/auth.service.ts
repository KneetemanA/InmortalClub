import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

class UserInputError extends Error { constructor(message: string, public statusCode = 400) { super(message); } }
const safeUserSelect = { id:true, name:true, email:true, active:true, roleId:true, createdAt:true, role:{select:{id:true,name:true}} } as const;
export type UpdateUserInput = { name?:string; email?:string; roleName?:'ADMIN'|'RECEPTIONIST'; active?:boolean; password?:string };
import { env } from '../config/env';

import jwt from 'jsonwebtoken';

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    if (!user.active) {
      throw new Error('Usuario desactivado');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role.name,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    roleName: 'ADMIN' | 'RECEPTIONIST';
  }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    const role = await prisma.role.upsert({
      where: { name: userData.roleName }, update: {}, create: { name: userData.roleName },
    });

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        roleId: role.id,
        active: true,
      },
      include: {
        role: true,
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async listUsers() {
    return prisma.user.findMany({
      select: {
        id: true, name: true, email: true, active: true, roleId: true,
        role: { select: { id: true, name: true } }, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(id: string, data: UpdateUserInput, actorId: string) {
    const password = data.password ? await bcrypt.hash(data.password, 10) : undefined;
    return this.manageUser(id, actorId, data, password);
  }

  async deleteUser(id: string, actorId: string) {
    return this.manageUser(id, actorId);
  }

  private async manageUser(id: string, actorId: string, data?: UpdateUserInput, password?: string) {
    try {
      return await prisma.$transaction(async tx => {
        const existing = await tx.user.findUnique({where:{id},select:safeUserSelect});
        if (!existing) throw new UserInputError('Usuario no encontrado',404);
        const removingAdmin = !data || data.active === false || (data.roleName && data.roleName !== 'ADMIN');
        if (id === actorId && removingAdmin) throw new UserInputError('No podés eliminar, desactivar ni quitar el rol administrador a tu propia cuenta');
        if (existing.active && existing.role.name === 'ADMIN' && removingAdmin) {
          const admins = await tx.user.count({where:{active:true,role:{name:'ADMIN'}}});
          if (admins <= 1) throw new UserInputError('Debe quedar al menos un administrador activo');
        }
        if (!data) {
          const used = await tx.user.findUnique({where:{id},select:{_count:{select:{payments:true,financialMovements:true,auditLogs:true}}}});
          if (used && Object.values(used._count).some(count => count > 0)) {
            throw new UserInputError('Este usuario tiene historial de operaciones. Desactivalo desde Editar para conservar los registros.',409);
          }
          await tx.user.delete({where:{id}});
          await tx.auditLog.create({data:{userId:actorId,action:'DELETE',entity:'USER',entityId:id,oldData:existing}});
          return existing;
        }
        const role = data.roleName ? await tx.role.upsert({where:{name:data.roleName},update:{},create:{name:data.roleName}}) : undefined;
        const updated = await tx.user.update({where:{id},data:{name:data.name,email:data.email,active:data.active,roleId:role?.id,password},select:safeUserSelect});
        await tx.auditLog.create({data:{userId:actorId,action:'UPDATE',entity:'USER',entityId:id,oldData:existing,newData:{...updated,passwordChanged:!!password}}});
        return updated;
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    } catch(error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') throw new UserInputError('Este usuario tiene historial. Desactivalo desde Editar.',409);
        if (error.code === 'P2034') throw new UserInputError('Hubo otro cambio simultáneo. Volvé a intentar.',409);
      }
      throw error;
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Contraseña actual incorrecta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Contraseña actualizada exitosamente' };
  }

  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }
}

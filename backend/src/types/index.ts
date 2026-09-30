import { PaymentMethod, MemberStatus, PaymentStatus } from '@prisma/client';

export interface CreateMemberDTO {
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  email?: string;
  birthDate?: Date;
  notes?: string;
  planId: string;
  benefitId?: string;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  userId: string;
  prorated?: boolean;
  expirationDate?: Date;
}

export interface UpdateMemberDTO {
  dni?: string | null;
  currentPlanId?: string | null;
  benefitId?: string | null;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  birthDate?: Date | null;
  notes?: string;
  status?: MemberStatus;
}

export interface CreatePaymentDTO {
  amount?: number;
  paymentDate?: Date;
  memberId: string;
  planId: string;
  userId: string;
  appliedBenefitId?: string;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  expirationDate?: Date;
}

export interface PaymentFiltersDTO {
  memberId?: string;
  status?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  roleId: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    roleId: string;
    roleName: string;
  };
  token: string;
}

// Extender Request para incluir usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        roleId: string;
        roleName: string;
      };
    }
  }
}
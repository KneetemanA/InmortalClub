export type Role = { id: string; name: 'ADMIN' | 'RECEPTIONIST' };
export type User = { id: string; name: string; email: string; roleId: string; active: boolean; createdAt: string; role: Role; };
export type Plan = { id: string; name: string; description?: string; price: string | number; active: boolean };
export type Benefit = { id: string; name: string; description?: string; type: 'FOUNDER' | 'LIFA' | 'CUSTOM'; discountPercentage: string | number; onlyFullPass: boolean; active: boolean };
export type MemberBenefit = { id: string; active: boolean; benefit: Benefit };
export type Payment = {
  id: string; memberId: string; planId: string; priceOriginal: string | number;
  discountPercentage: string | number; discountAmount: string | number; finalAmount: string | number;
  paymentDate: string; expirationDate: string; paymentMethod: 'CASH' | 'TRANSFER'; status: 'PAID' | 'CANCELLED';
  cancellationReason?: string; plan: Plan; member?: Member; appliedBenefit?: Benefit | null; user?: User; daysRemaining?: number;
};
export type Member = {
  id: string; firstName: string; lastName: string; dni: string; phone: string; email?: string;
  birthDate?: string; enrollmentDate: string; status: 'ACTIVE' | 'INACTIVE'; notes?: string;
  benefits: MemberBenefit[]; payments: Payment[];
};
export type Movement = { id: string; type: 'INCOME' | 'EXPENSE'; amount: string | number; description?: string; movementDate: string; category: { id: string; name: string; type: string }; user: User };
export type Category = { id: string; name: string; type: 'INCOME' | 'EXPENSE'; active: boolean };
export type DashboardData = {
  summary: { totalMembers: number; activeMembers: number; inactiveMembers: number; newMembersThisMonth: number; activePercentage: number };
  financial: { monthlyIncome: number; monthlyExpense: number; balance: number };
  paymentsByPlan: { planName: string; count: number; total: string | number }[];
  recentPayments: Payment[];
  overdueMembers: (Member & { lastPlan: string; lastPaymentDate: string | null; daysOverdue: number })[];
  alerts: { overdueCount: number; expiredCount: number; newMembers: number };
};
export type AuditLog = { id: string; action: string; entity: string; entityId: string; oldData?: unknown; newData?: unknown; createdAt: string; user: User };

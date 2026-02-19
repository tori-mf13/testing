import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalAssets: number;
  totalSaaSApps: number;
  monthlySaaSSpend: number;
  openAlerts: number;
  openTickets: number;
  healthScore: number;
  complianceScore: number;
  activeUsers: number;
}

export interface AIInsight {
  id: string;
  type: 'cost_saving' | 'security' | 'compliance' | 'optimization';
  title: string;
  description: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: Date;
}

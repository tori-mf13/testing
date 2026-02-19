export type UserRole = 'ADMIN' | 'IT_STAFF' | 'MANAGER' | 'READ_ONLY';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
  jobTitle?: string;
  avatarUrl?: string;
  mfaEnabled?: boolean;
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
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

export interface SaaSApplication {
  id: string;
  name: string;
  vendor?: string;
  owner?: string;
  category?: string;
  licenseCount: number;
  activeUsers: number;
  monthlyCost: number;
  annualCost: number;
  utilizationPct: number;
  renewalDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_REVIEW' | 'SHADOW_IT' | 'DECOMMISSIONING';
  isShadowIT: boolean;
  ssoEnabled: boolean;
}

export interface Asset {
  id: string;
  name: string;
  assetTag: string;
  type: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  assignedUser?: { firstName: string; lastName: string; email: string };
  department?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  osName?: string;
  osVersion?: string;
  patchStatus?: string;
  status: string;
}

export interface SecurityAlert {
  id: string;
  title: string;
  description?: string;
  source: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  affectedAsset?: string;
  createdAt: string;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  totalControls: number;
  passedControls: number;
  failedControls: number;
  progressPct: number;
  lastAuditDate?: string;
  nextAuditDate?: string;
}

export interface Server {
  id: string;
  hostname: string;
  ipAddress?: string;
  type: string;
  os?: string;
  cpuCores?: number;
  ramGB?: number;
  diskGB?: number;
  cpuUsagePct?: number;
  ramUsagePct?: number;
  diskUsagePct?: number;
  environment?: string;
  cloudProvider?: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MAINTENANCE';
}

export interface NetworkDevice {
  id: string;
  name: string;
  type: string;
  manufacturer?: string;
  model?: string;
  ipAddress?: string;
  location?: string;
  isOnline: boolean;
  uptimePct: number;
}

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_USER' | 'WAITING_ON_VENDOR' | 'RESOLVED' | 'CLOSED';
  creator?: { firstName: string; lastName: string; email: string };
  assignee?: { firstName: string; lastName: string; email: string };
  aiSuggestion?: string;
  createdAt: string;
  _count?: { comments: number };
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  isActive: boolean;
  isBuiltIn: boolean;
  runCount: number;
  hoursSaved: number;
  costRecovered: number;
  _count?: { executions: number };
}

export interface PurchaseRequest {
  id: string;
  title: string;
  description?: string;
  vendor?: string;
  estimatedCost: number;
  department?: string;
  status: string;
  requester?: { firstName: string; lastName: string; email: string };
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  module?: string;
  createdAt: string;
}

export interface AIInsight {
  id: string;
  type: 'cost_saving' | 'security' | 'compliance' | 'optimization';
  title: string;
  description: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

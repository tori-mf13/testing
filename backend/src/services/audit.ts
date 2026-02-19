import prisma from './prisma';

export async function logAudit(params: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function createActivity(params: {
  type: string;
  title: string;
  description?: string;
  module?: string;
  entityId?: string;
  userId?: string;
}): Promise<void> {
  try {
    await prisma.activityFeed.create({ data: params });
  } catch (error) {
    console.error('Failed to write activity:', error);
  }
}

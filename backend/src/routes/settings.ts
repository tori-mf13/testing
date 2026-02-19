import { Router, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { logAudit } from '../services/audit';

const router = Router();

// ─── Integrations ────────────────────────────────────────────────

// GET /api/settings/integrations
router.get('/integrations', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const integrations = await prisma.integration.findMany({ orderBy: { name: 'asc' } });
    // Mask API keys in response
    const masked = integrations.map((i) => ({
      ...i,
      apiKey: i.apiKey ? `****${i.apiKey.slice(-4)}` : null,
      oauthToken: i.oauthToken ? '****' : null,
    }));
    res.json(masked);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load integrations' });
  }
});

// POST /api/settings/integrations
router.post('/integrations', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const integration = await prisma.integration.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: 'CREATE', resource: 'integration', resourceId: integration.id });
    res.status(201).json(integration);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

// PUT /api/settings/integrations/:id
router.put('/integrations/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const integration = await prisma.integration.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ userId: req.user!.id, action: 'UPDATE', resource: 'integration', resourceId: integration.id });
    res.json(integration);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

// ─── User Management ─────────────────────────────────────────────

// GET /api/settings/users
router.get('/users', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, department: true, isActive: true, lastLogin: true, createdAt: true,
        },
        orderBy: { lastName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// PUT /api/settings/users/:id/role
router.put('/users/:id/role', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: req.body.role },
    });
    await logAudit({ userId: req.user!.id, action: 'CHANGE_ROLE', resource: 'user', resourceId: user.id, details: `Role changed to ${req.body.role}` });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// ─── Audit Log ───────────────────────────────────────────────────

// GET /api/settings/audit-log
router.get('/audit-log', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const { action, userId } = req.query;

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load audit log' });
  }
});

// ─── Notifications ───────────────────────────────────────────────

// GET /api/settings/notifications
router.get('/notifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// PUT /api/settings/notifications/:id/read
router.put('/notifications/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ─── Data Retention ──────────────────────────────────────────────

// GET /api/settings/retention-policies
router.get('/retention-policies', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const policies = await prisma.retentionPolicy.findMany({ orderBy: { name: 'asc' } });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load retention policies' });
  }
});

// POST /api/settings/retention-policies
router.post('/retention-policies', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const policy = await prisma.retentionPolicy.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: 'CREATE', resource: 'retention_policy', resourceId: policy.id });
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create retention policy' });
  }
});

// GET /api/settings/erasure-requests
router.get('/erasure-requests', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const requests = await prisma.erasureRequest.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load erasure requests' });
  }
});

// POST /api/settings/erasure-requests
router.post('/erasure-requests', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.erasureRequest.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: 'CREATE', resource: 'erasure_request', resourceId: request.id });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create erasure request' });
  }
});

// ─── Password Health ─────────────────────────────────────────────

// GET /api/settings/password-health
router.get('/password-health', authenticate, authorize('ADMIN', 'IT_STAFF'), async (_req: AuthRequest, res: Response) => {
  try {
    const health = await prisma.passwordHealth.findMany({ orderBy: { healthScore: 'asc' }, take: 100 });
    const avg = await prisma.passwordHealth.aggregate({ _avg: { healthScore: true, weakPasswords: true, breachedCount: true } });
    res.json({ records: health, averages: avg._avg });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load password health' });
  }
});

export default router;

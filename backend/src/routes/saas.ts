import { Router, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { logAudit, createActivity } from '../services/audit';
import { broadcast } from '../websocket';

const router = Router();

// GET /api/saas — List all SaaS applications
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, sortBy = 'name', sortOrder = 'asc' } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) where.name = { contains: search as string, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.saaSApplication.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { licenses: true } } },
      }),
      prisma.saaSApplication.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load SaaS applications' });
  }
});

// GET /api/saas/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const app = await prisma.saaSApplication.findUnique({
      where: { id: req.params.id },
      include: {
        licenses: { take: 100, orderBy: { assignedDate: 'desc' } },
        costHistory: { orderBy: { month: 'desc' }, take: 12 },
      },
    });
    if (!app) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    res.json(app);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load application' });
  }
});

// POST /api/saas
router.post('/', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const app = await prisma.saaSApplication.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: 'CREATE', resource: 'saas_application', resourceId: app.id });
    await createActivity({ type: 'saas_added', title: `Added SaaS app: ${app.name}`, module: 'saas', entityId: app.id, userId: req.user!.id });
    broadcast('saas:created', { id: app.id, name: app.name });
    res.status(201).json(app);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// PUT /api/saas/:id
router.put('/:id', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const app = await prisma.saaSApplication.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ userId: req.user!.id, action: 'UPDATE', resource: 'saas_application', resourceId: app.id });
    res.json(app);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// DELETE /api/saas/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.saaSApplication.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user!.id, action: 'DELETE', resource: 'saas_application', resourceId: req.params.id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// GET /api/saas/:id/licenses — Reclaimable licenses
router.get('/:id/licenses/reclaimable', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const licenses = await prisma.saaSLicense.findMany({
      where: { appId: req.params.id, reclaimable: true },
      orderBy: { lastUsed: 'asc' },
    });
    res.json(licenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load reclaimable licenses' });
  }
});

// POST /api/saas/:id/licenses/:licenseId/reclaim
router.post('/:id/licenses/:licenseId/reclaim', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const license = await prisma.saaSLicense.update({
      where: { id: req.params.licenseId },
      data: { isActive: false, reclaimable: false },
    });
    await logAudit({ userId: req.user!.id, action: 'RECLAIM_LICENSE', resource: 'saas_license', resourceId: license.id });
    await createActivity({ type: 'license_reclaimed', title: `Reclaimed unused license`, module: 'saas', entityId: license.id, userId: req.user!.id });
    res.json({ message: 'License reclaimed successfully', license });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reclaim license' });
  }
});

// GET /api/saas/shadow-it — Shadow IT detection
router.get('/detect/shadow-it', authenticate, authorize('ADMIN', 'IT_STAFF'), async (_req: AuthRequest, res: Response) => {
  try {
    const shadowApps = await prisma.saaSApplication.findMany({
      where: { isShadowIT: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(shadowApps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load shadow IT' });
  }
});

export default router;

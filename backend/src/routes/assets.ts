import { Router, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { logAudit, createActivity } from '../services/audit';

const router = Router();

// GET /api/assets
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type, status, search, sortBy = 'name', sortOrder = 'asc' } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { assetTag: { contains: search as string, mode: 'insensitive' } },
        { serialNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          assignedUser: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load assets' });
  }
});

// GET /api/assets/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: { assignedUser: { select: { firstName: true, lastName: true, email: true, department: true } } },
    });
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load asset' });
  }
});

// POST /api/assets
router.post('/', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const asset = await prisma.asset.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: 'CREATE', resource: 'asset', resourceId: asset.id });
    await createActivity({ type: 'asset_added', title: `Added asset: ${asset.name}`, module: 'assets', entityId: asset.id, userId: req.user!.id });
    res.status(201).json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// PUT /api/assets/:id
router.put('/:id', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const asset = await prisma.asset.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ userId: req.user!.id, action: 'UPDATE', resource: 'asset', resourceId: asset.id });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// DELETE /api/assets/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.asset.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user!.id, action: 'DELETE', resource: 'asset', resourceId: req.params.id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// GET /api/assets/lifecycle/alerts — Warranty expiring, EOL assets
router.get('/lifecycle/alerts', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringWarranty = await prisma.asset.findMany({
      where: {
        warrantyExpiry: { lte: thirtyDaysFromNow, gte: new Date() },
        status: { not: 'RETIRED' },
      },
      orderBy: { warrantyExpiry: 'asc' },
      take: 50,
    });

    const expiredWarranty = await prisma.asset.findMany({
      where: {
        warrantyExpiry: { lt: new Date() },
        status: { not: 'RETIRED' },
      },
      take: 50,
    });

    res.json({ expiringWarranty, expiredWarranty });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load lifecycle alerts' });
  }
});

export default router;

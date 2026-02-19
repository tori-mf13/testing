import { Router, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { logAudit, createActivity } from '../services/audit';

const router = Router();

// GET /api/procurement/requests
router.get('/requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, department } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (department) where.department = department;

    // Non-admins/managers see only their own
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER') {
      where.requesterId = req.user!.id;
    }

    const [data, total] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where,
        include: {
          requester: { select: { firstName: true, lastName: true, email: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchaseRequest.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load purchase requests' });
  }
});

// POST /api/procurement/requests
router.post('/requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { items, ...requestData } = req.body;
    const request = await prisma.purchaseRequest.create({
      data: {
        ...requestData,
        requesterId: req.user!.id,
        items: items ? { create: items } : undefined,
      },
      include: { items: true },
    });
    await createActivity({ type: 'purchase_requested', title: `Purchase request: ${request.title}`, module: 'procurement', entityId: request.id, userId: req.user!.id });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create purchase request' });
  }
});

// PUT /api/procurement/requests/:id/approve
router.put('/requests/:id/approve', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.purchaseRequest.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedBy: req.user!.id, approvedAt: new Date() },
    });
    await logAudit({ userId: req.user!.id, action: 'APPROVE', resource: 'purchase_request', resourceId: request.id });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// PUT /api/procurement/requests/:id/reject
router.put('/requests/:id/reject', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.purchaseRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    });
    await logAudit({ userId: req.user!.id, action: 'REJECT', resource: 'purchase_request', resourceId: request.id });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// GET /api/procurement/vendors
router.get('/vendors', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load vendors' });
  }
});

// POST /api/procurement/vendors
router.post('/vendors', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const vendor = await prisma.vendor.create({ data: req.body });
    res.status(201).json(vendor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// GET /api/procurement/budget
router.get('/budget', authenticate, authorize('ADMIN', 'MANAGER'), async (_req: AuthRequest, res: Response) => {
  try {
    const spending = await prisma.purchaseRequest.groupBy({
      by: ['department'],
      where: { status: { in: ['APPROVED', 'ORDERED', 'RECEIVED'] } },
      _sum: { estimatedCost: true, actualCost: true },
    });
    res.json(spending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load budget data' });
  }
});

export default router;

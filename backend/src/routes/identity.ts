import { Router, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { logAudit, createActivity } from '../services/audit';

const router = Router();

// GET /api/identity/users — User directory
router.get('/users', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search, role, department } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (department) where.department = department;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, department: true, jobTitle: true, mfaEnabled: true,
          isActive: true, lastLogin: true, createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastName: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// GET /api/identity/access-requests
router.get('/access-requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // Managers see all; others see only their own
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER') {
      where.requesterId = req.user!.id;
    }

    const [data, total] = await Promise.all([
      prisma.accessRequest.findMany({
        where,
        include: {
          requester: { select: { firstName: true, lastName: true, email: true } },
          approver: { select: { firstName: true, lastName: true, email: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.accessRequest.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load access requests' });
  }
});

// POST /api/identity/access-requests
router.post('/access-requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.accessRequest.create({
      data: { ...req.body, requesterId: req.user!.id },
    });
    await createActivity({ type: 'access_requested', title: `Access requested: ${request.resourceName}`, module: 'identity', entityId: request.id, userId: req.user!.id });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create access request' });
  }
});

// PUT /api/identity/access-requests/:id/approve
router.put('/access-requests/:id/approve', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.accessRequest.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approverId: req.user!.id, decidedAt: new Date() },
    });
    await logAudit({ userId: req.user!.id, action: 'APPROVE_ACCESS', resource: 'access_request', resourceId: request.id });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// PUT /api/identity/access-requests/:id/deny
router.put('/access-requests/:id/deny', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.accessRequest.update({
      where: { id: req.params.id },
      data: { status: 'DENIED', approverId: req.user!.id, decidedAt: new Date() },
    });
    await logAudit({ userId: req.user!.id, action: 'DENY_ACCESS', resource: 'access_request', resourceId: request.id });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to deny request' });
  }
});

// GET /api/identity/orphaned-accounts
router.get('/orphaned-accounts', authenticate, authorize('ADMIN', 'IT_STAFF'), async (_req: AuthRequest, res: Response) => {
  try {
    const accounts = await prisma.orphanedAccount.findMany({
      where: { resolved: false },
      orderBy: { detectedAt: 'desc' },
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load orphaned accounts' });
  }
});

// GET /api/identity/mfa-status
router.get('/mfa-status', authenticate, authorize('ADMIN', 'IT_STAFF', 'MANAGER'), async (_req: AuthRequest, res: Response) => {
  try {
    const [total, mfaEnabled] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true, mfaEnabled: true } }),
    ]);
    res.json({
      totalUsers: total,
      mfaEnabled,
      mfaDisabled: total - mfaEnabled,
      adoptionPct: total > 0 ? Math.round((mfaEnabled / total) * 100) : 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load MFA status' });
  }
});

export default router;

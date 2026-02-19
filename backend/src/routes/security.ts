import { Router, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { logAudit } from '../services/audit';

const router = Router();

// GET /api/security/alerts
router.get('/alerts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { severity, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.securityAlert.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.securityAlert.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load alerts' });
  }
});

// PUT /api/security/alerts/:id
router.put('/alerts/:id', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const alert = await prisma.securityAlert.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ userId: req.user!.id, action: 'UPDATE', resource: 'security_alert', resourceId: alert.id });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// GET /api/security/compliance
router.get('/compliance', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const frameworks = await prisma.complianceFramework.findMany({
      include: { _count: { select: { controls: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(frameworks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load compliance data' });
  }
});

// GET /api/security/compliance/:id
router.get('/compliance/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const framework = await prisma.complianceFramework.findUnique({
      where: { id: req.params.id },
      include: { controls: { orderBy: { controlId: 'asc' } } },
    });
    if (!framework) {
      res.status(404).json({ error: 'Framework not found' });
      return;
    }
    res.json(framework);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load framework' });
  }
});

// GET /api/security/vulnerabilities
router.get('/vulnerabilities', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { severity, patched } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (patched !== undefined) where.patched = patched === 'true';

    const [data, total] = await Promise.all([
      prisma.vulnerability.findMany({
        where,
        orderBy: { discoveredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vulnerability.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load vulnerabilities' });
  }
});

// GET /api/security/patch-compliance
router.get('/patch-compliance', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const [totalAssets, patchedAssets] = await Promise.all([
      prisma.asset.count({ where: { status: { not: 'RETIRED' } } }),
      prisma.asset.count({ where: { patchStatus: 'Up to date', status: { not: 'RETIRED' } } }),
    ]);

    res.json({
      totalAssets,
      patchedAssets,
      unpatchedAssets: totalAssets - patchedAssets,
      compliancePct: totalAssets > 0 ? Math.round((patchedAssets / totalAssets) * 100) : 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load patch compliance' });
  }
});

export default router;

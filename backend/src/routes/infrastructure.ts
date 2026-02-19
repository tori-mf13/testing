import { Router, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { logAudit } from '../services/audit';

const router = Router();

// ─── Servers / VMs ───────────────────────────────────────────────

// GET /api/infrastructure/servers
router.get('/servers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, environment, cloudProvider } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (environment) where.environment = environment;
    if (cloudProvider) where.cloudProvider = cloudProvider;

    const [data, total] = await Promise.all([
      prisma.server.findMany({
        where,
        orderBy: { hostname: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.server.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load servers' });
  }
});

// GET /api/infrastructure/servers/:id
router.get('/servers/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.id },
      include: { metrics: { orderBy: { timestamp: 'desc' }, take: 100 } },
    });
    if (!server) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }
    res.json(server);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load server' });
  }
});

// POST /api/infrastructure/servers
router.post('/servers', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: 'CREATE', resource: 'server', resourceId: server.id });
    res.status(201).json(server);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create server' });
  }
});

// POST /api/infrastructure/servers/:id/metrics — Agent metric push
router.post('/servers/:id/metrics', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { cpuPct, ramPct, diskPct, networkIn, networkOut } = req.body;
    const metric = await prisma.serverMetric.create({
      data: { serverId: req.params.id, cpuPct, ramPct, diskPct, networkIn, networkOut },
    });

    // Update server's current metrics
    await prisma.server.update({
      where: { id: req.params.id },
      data: { cpuUsagePct: cpuPct, ramUsagePct: ramPct, diskUsagePct: diskPct, lastHeartbeat: new Date() },
    });

    res.status(201).json(metric);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record metrics' });
  }
});

// ─── Network Devices ─────────────────────────────────────────────

// GET /api/infrastructure/network-devices
router.get('/network-devices', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type, isOnline } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (isOnline !== undefined) where.isOnline = isOnline === 'true';

    const [data, total] = await Promise.all([
      prisma.networkDevice.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.networkDevice.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load network devices' });
  }
});

// POST /api/infrastructure/network-devices
router.post('/network-devices', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const device = await prisma.networkDevice.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: 'CREATE', resource: 'network_device', resourceId: device.id });
    res.status(201).json(device);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create network device' });
  }
});

// PUT /api/infrastructure/network-devices/:id
router.put('/network-devices/:id', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const device = await prisma.networkDevice.update({ where: { id: req.params.id }, data: req.body });
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update network device' });
  }
});

export default router;

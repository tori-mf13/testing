import { Router, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest, DashboardStats } from '../types';
import { cacheGet, cacheSet } from '../services/redis';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const cached = await cacheGet<DashboardStats>('dashboard:stats');
    if (cached) {
      res.json(cached);
      return;
    }

    const [
      totalAssets,
      totalSaaSApps,
      saasSpend,
      openAlerts,
      openTickets,
      activeUsers,
      complianceData,
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.saaSApplication.count({ where: { status: 'ACTIVE' } }),
      prisma.saaSApplication.aggregate({ where: { status: 'ACTIVE' }, _sum: { monthlyCost: true } }),
      prisma.securityAlert.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.complianceFramework.aggregate({ _avg: { progressPct: true } }),
    ]);

    const monthlySaaSSpend = saasSpend._sum.monthlyCost || 0;
    const complianceScore = Math.round(complianceData._avg.progressPct || 0);

    // Health score: weighted combination of compliance, low alerts, and patch status
    const healthScore = Math.min(100, Math.max(0,
      complianceScore * 0.4 +
      Math.max(0, 100 - openAlerts * 5) * 0.3 +
      Math.max(0, 100 - openTickets * 2) * 0.3
    ));

    const stats: DashboardStats = {
      totalAssets,
      totalSaaSApps,
      monthlySaaSSpend,
      openAlerts,
      openTickets,
      healthScore: Math.round(healthScore),
      complianceScore,
      activeUsers,
    };

    await cacheSet('dashboard:stats', stats, 60);
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
});

// GET /api/dashboard/activity
router.get('/activity', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const activities = await prisma.activityFeed.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load activity feed' });
  }
});

// GET /api/dashboard/alerts-summary
router.get('/alerts-summary', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const alerts = await prisma.securityAlert.groupBy({
      by: ['severity'],
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      _count: true,
    });

    const summary = {
      critical: alerts.find((a) => a.severity === 'CRITICAL')?._count || 0,
      high: alerts.find((a) => a.severity === 'HIGH')?._count || 0,
      medium: alerts.find((a) => a.severity === 'MEDIUM')?._count || 0,
      low: alerts.find((a) => a.severity === 'LOW')?._count || 0,
      info: alerts.find((a) => a.severity === 'INFO')?._count || 0,
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load alerts summary' });
  }
});

export default router;

import { Router, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { queryAI, naturalLanguageQuery, getCostOptimizations, detectAnomalies } from '../services/ai';

const router = Router();

// POST /api/ai/chat — AI chat sidebar
router.post('/chat', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Build context from current data
    const [saasApps, openAlerts, openTickets, servers] = await Promise.all([
      prisma.saaSApplication.findMany({ where: { status: 'ACTIVE' }, select: { name: true, monthlyCost: true, activeUsers: true, utilizationPct: true } }),
      prisma.securityAlert.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.server.findMany({ select: { hostname: true, status: true, cpuUsagePct: true, ramUsagePct: true } }),
    ]);

    const context = [
      `Active SaaS apps: ${JSON.stringify(saasApps)}`,
      `Open security alerts: ${openAlerts}`,
      `Open tickets: ${openTickets}`,
      `Server status: ${JSON.stringify(servers)}`,
    ].join('\n');

    const answer = await naturalLanguageQuery(message, context);
    res.json({ response: answer });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// GET /api/ai/insights — AI-generated insights for dashboard
router.get('/insights', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const [saasApps, alerts, servers] = await Promise.all([
      prisma.saaSApplication.findMany({
        where: { status: 'ACTIVE' },
        select: { name: true, monthlyCost: true, utilizationPct: true, activeUsers: true, licenseCount: true },
      }),
      prisma.securityAlert.findMany({
        where: { status: 'OPEN' },
        select: { title: true, severity: true, createdAt: true },
        take: 20,
      }),
      prisma.server.findMany({
        select: { hostname: true, cpuUsagePct: true, ramUsagePct: true, diskUsagePct: true, status: true },
      }),
    ]);

    const insights = [];

    // Cost optimization insights
    const underutilized = saasApps.filter((a) => a.utilizationPct < 30);
    if (underutilized.length > 0) {
      const potentialSavings = underutilized.reduce((sum, a) => sum + a.monthlyCost * 0.5, 0);
      insights.push({
        id: 'cost-1',
        type: 'cost_saving',
        title: 'Underused software detected',
        description: `${underutilized.length} apps have less than 30% utilization. Consider downsizing or removing them.`,
        impact: `Potential savings: $${potentialSavings.toFixed(0)}/month`,
        priority: potentialSavings > 1000 ? 'high' : 'medium',
        createdAt: new Date(),
      });
    }

    // Security insights
    const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL');
    if (criticalAlerts.length > 0) {
      insights.push({
        id: 'sec-1',
        type: 'security',
        title: 'Critical security alerts need attention',
        description: `${criticalAlerts.length} critical alerts are unresolved. Address these immediately.`,
        impact: 'High risk to organization security',
        priority: 'high',
        createdAt: new Date(),
      });
    }

    // Infrastructure insights
    const hotServers = servers.filter((s) => (s.cpuUsagePct || 0) > 80 || (s.ramUsagePct || 0) > 80);
    if (hotServers.length > 0) {
      insights.push({
        id: 'infra-1',
        type: 'optimization',
        title: 'Servers running hot',
        description: `${hotServers.length} servers have CPU or memory usage above 80%.`,
        impact: 'Risk of performance degradation or outage',
        priority: 'high',
        createdAt: new Date(),
      });
    }

    // License waste insight
    const overLicensed = saasApps.filter((a) => a.licenseCount > 0 && a.activeUsers < a.licenseCount * 0.5);
    if (overLicensed.length > 0) {
      insights.push({
        id: 'cost-2',
        type: 'cost_saving',
        title: 'Unused licenses available for reclamation',
        description: `${overLicensed.length} apps have more than 50% unused licenses.`,
        impact: 'Recover costs by reclaiming unused seats',
        priority: 'medium',
        createdAt: new Date(),
      });
    }

    res.json(insights);
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// POST /api/ai/cost-optimization
router.post('/cost-optimization', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const saasApps = await prisma.saaSApplication.findMany({
      where: { status: 'ACTIVE' },
      select: { name: true, monthlyCost: true, annualCost: true, activeUsers: true, licenseCount: true, utilizationPct: true },
    });

    const recommendations = await getCostOptimizations(JSON.stringify(saasApps, null, 2));
    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate cost optimizations' });
  }
});

// POST /api/ai/anomaly-detection
router.post('/anomaly-detection', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const [servers, recentAlerts] = await Promise.all([
      prisma.server.findMany({
        select: { hostname: true, cpuUsagePct: true, ramUsagePct: true, diskUsagePct: true, status: true },
      }),
      prisma.securityAlert.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        select: { title: true, severity: true, source: true },
      }),
    ]);

    const context = `Server metrics:\n${JSON.stringify(servers)}\n\nRecent alerts (24h):\n${JSON.stringify(recentAlerts)}`;
    const anomalies = await detectAnomalies(context);
    res.json({ anomalies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

export default router;

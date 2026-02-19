import { Router, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/reports/templates
router.get('/templates', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.reportTemplate.findMany({ orderBy: { module: 'asc' } });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load report templates' });
  }
});

// POST /api/reports/templates
router.post('/templates', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.reportTemplate.create({ data: req.body });
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create report template' });
  }
});

// POST /api/reports/generate/:templateId
router.post('/generate/:templateId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.reportTemplate.findUnique({ where: { id: req.params.templateId } });
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    // Generate report data based on module
    let reportData: unknown;

    switch (template.module) {
      case 'saas':
        reportData = await prisma.saaSApplication.findMany({ orderBy: { monthlyCost: 'desc' } });
        break;
      case 'assets':
        reportData = await prisma.asset.findMany({ include: { assignedUser: { select: { firstName: true, lastName: true } } } });
        break;
      case 'security':
        reportData = {
          alerts: await prisma.securityAlert.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
          compliance: await prisma.complianceFramework.findMany(),
          vulnerabilities: await prisma.vulnerability.findMany({ where: { patched: false } }),
        };
        break;
      case 'helpdesk':
        reportData = await prisma.ticket.findMany({
          include: { creator: { select: { firstName: true, lastName: true } }, assignee: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });
        break;
      case 'procurement':
        reportData = await prisma.purchaseRequest.findMany({
          include: { requester: { select: { firstName: true, lastName: true } }, items: true },
          orderBy: { createdAt: 'desc' },
        });
        break;
      default:
        reportData = { message: 'Report generation for this module is pending implementation' };
    }

    await prisma.reportTemplate.update({
      where: { id: template.id },
      data: { lastRunAt: new Date() },
    });

    res.json({
      template: template.name,
      module: template.module,
      generatedAt: new Date(),
      format: req.body.format || template.format,
      data: reportData,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;

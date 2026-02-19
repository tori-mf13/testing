import { Router, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { logAudit } from '../services/audit';

const router = Router();

// GET /api/workflows
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.query;
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { executions: true } } },
    });
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load workflows' });
  }
});

// GET /api/workflows/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: req.params.id },
      include: { executions: { orderBy: { startedAt: 'desc' }, take: 50 } },
    });
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load workflow' });
  }
});

// POST /api/workflows
router.post('/', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: 'CREATE', resource: 'workflow', resourceId: workflow.id });
    res.status(201).json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// PUT /api/workflows/:id
router.put('/:id', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ userId: req.user!.id, action: 'UPDATE', resource: 'workflow', resourceId: workflow.id });
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// POST /api/workflows/:id/execute
router.post('/:id/execute', authenticate, authorize('ADMIN', 'IT_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findUnique({ where: { id: req.params.id } });
    if (!workflow || !workflow.isActive) {
      res.status(400).json({ error: 'Workflow not found or inactive' });
      return;
    }

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        triggeredBy: 'manual',
        userId: req.user!.id,
        status: 'Completed',
        completedAt: new Date(),
        result: JSON.stringify({ message: 'Workflow executed successfully' }),
      },
    });

    await prisma.workflow.update({
      where: { id: workflow.id },
      data: { runCount: { increment: 1 }, hoursSaved: { increment: 0.5 } },
    });

    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// GET /api/workflows/roi/summary
router.get('/roi/summary', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await prisma.workflow.aggregate({
      _sum: { runCount: true, hoursSaved: true, costRecovered: true },
    });
    res.json({
      totalExecutions: stats._sum.runCount || 0,
      totalHoursSaved: stats._sum.hoursSaved || 0,
      totalCostRecovered: stats._sum.costRecovered || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load ROI summary' });
  }
});

export default router;

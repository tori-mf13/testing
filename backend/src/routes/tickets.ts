import { Router, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { logAudit, createActivity } from '../services/audit';
import { categorizeTicket } from '../services/ai';
import { broadcast } from '../websocket';

const router = Router();

// GET /api/tickets
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, category, assigneeId } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assigneeId) where.assigneeId = assigneeId;

    // Read-only users see only their own tickets
    if (req.user!.role === 'READ_ONLY') {
      where.creatorId = req.user!.id;
    }

    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          creator: { select: { firstName: true, lastName: true, email: true } },
          assignee: { select: { firstName: true, lastName: true, email: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tickets' });
  }
});

// GET /api/tickets/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { firstName: true, lastName: true, email: true } },
        assignee: { select: { firstName: true, lastName: true, email: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load ticket' });
  }
});

// POST /api/tickets
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, ...rest } = req.body;

    // AI categorization
    let aiData: { category?: string; priority?: string; aiSuggestion?: string } = {};
    try {
      const aiResult = await categorizeTicket(title, description || '');
      aiData = {
        category: rest.category || aiResult.category,
        priority: rest.priority || aiResult.priority,
        aiSuggestion: aiResult.suggestedResponse || undefined,
      };
    } catch {
      // AI categorization is best-effort
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        creatorId: req.user!.id,
        ...rest,
        ...aiData,
      },
    });

    await createActivity({ type: 'ticket_created', title: `New ticket: ${title}`, module: 'helpdesk', entityId: ticket.id, userId: req.user!.id });
    broadcast('ticket:created', { id: ticket.id, title: ticket.title, priority: ticket.priority });
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// PUT /api/tickets/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.ticket.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ userId: req.user!.id, action: 'UPDATE', resource: 'ticket', resourceId: ticket.id });

    if (req.body.status === 'RESOLVED') {
      await prisma.ticket.update({ where: { id: req.params.id }, data: { resolvedAt: new Date() } });
    }
    if (req.body.status === 'CLOSED') {
      await prisma.ticket.update({ where: { id: req.params.id }, data: { closedAt: new Date() } });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// POST /api/tickets/:id/comments
router.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: req.params.id,
        authorId: req.user!.id,
        content: req.body.content,
        isInternal: req.body.isInternal || false,
      },
    });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// POST /api/tickets/:id/csat
router.post('/:id/csat', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { csatScore: req.body.score, csatComment: req.body.comment },
    });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit survey' });
  }
});

export default router;

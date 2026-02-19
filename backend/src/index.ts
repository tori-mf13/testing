import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config';
import { initWebSocket } from './websocket';

// Route imports
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import saasRoutes from './routes/saas';
import identityRoutes from './routes/identity';
import assetRoutes from './routes/assets';
import securityRoutes from './routes/security';
import infrastructureRoutes from './routes/infrastructure';
import procurementRoutes from './routes/procurement';
import ticketRoutes from './routes/tickets';
import workflowRoutes from './routes/workflows';
import aiRoutes from './routes/ai';
import reportingRoutes from './routes/reporting';
import settingsRoutes from './routes/settings';

const app = express();
const server = createServer(app);

// ─── Middleware ───────────────────────────────────────────────────

app.use(helmet());
app.use(compression());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ─── Routes ──────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/saas', saasRoutes);
app.use('/api/identity', identityRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/infrastructure', infrastructureRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportingRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── WebSocket ───────────────────────────────────────────────────

initWebSocket(server);

// ─── Start ───────────────────────────────────────────────────────

server.listen(config.port, () => {
  console.log(`\n  UnifyIT API Server`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  HTTP:        http://localhost:${config.port}`);
  console.log(`  WebSocket:   ws://localhost:${config.port}/ws`);
  console.log(`  Health:      http://localhost:${config.port}/api/health\n`);
});

export default app;

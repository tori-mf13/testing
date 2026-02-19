import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthUser } from '../types';

interface AuthenticatedSocket extends WebSocket {
  user?: AuthUser;
  isAlive?: boolean;
}

let wss: WebSocketServer;

export function initWebSocket(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;
        ws.user = decoded;
      } catch {
        ws.close(4001, 'Invalid token');
        return;
      }
    }

    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch {
        ws.send(JSON.stringify({ type: 'error', payload: 'Invalid message format' }));
      }
    });

    ws.send(JSON.stringify({
      type: 'connected',
      payload: { message: 'Connected to UnifyIT real-time updates' },
      timestamp: new Date(),
    }));
  });

  // Heartbeat to detect stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const authWs = ws as AuthenticatedSocket;
      if (!authWs.isAlive) {
        authWs.terminate();
        return;
      }
      authWs.isAlive = false;
      authWs.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  return wss;
}

function handleMessage(ws: AuthenticatedSocket, message: { type: string; payload?: unknown }): void {
  switch (message.type) {
    case 'subscribe':
      // Client subscribes to specific update channels
      ws.send(JSON.stringify({ type: 'subscribed', payload: message.payload }));
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', payload: `Unknown message type: ${message.type}` }));
  }
}

export function broadcast(type: string, payload: unknown): void {
  if (!wss) return;

  const message = JSON.stringify({ type, payload, timestamp: new Date() });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastToRole(role: string, type: string, payload: unknown): void {
  if (!wss) return;

  const message = JSON.stringify({ type, payload, timestamp: new Date() });

  wss.clients.forEach((client) => {
    const authClient = client as AuthenticatedSocket;
    if (authClient.readyState === WebSocket.OPEN && authClient.user?.role === role) {
      authClient.send(message);
    }
  });
}

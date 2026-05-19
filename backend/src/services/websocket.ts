import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';

interface Client {
  ws: WebSocket;
  userId?: string;
  role?: string;
}

const clients = new Map<WebSocket, Client>();

export const wsHandler = (wss: WebSocketServer) => {
  wss.on('connection', (ws, req) => {
    const client: Client = { ws };
    clients.set(ws, client);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'AUTH') {
          try {
            const decoded = jwt.verify(msg.token, process.env.JWT_SECRET!) as { id: string; role: string };
            client.userId = decoded.id;
            client.role = decoded.role;
            ws.send(JSON.stringify({ type: 'AUTH_OK' }));
          } catch {
            ws.send(JSON.stringify({ type: 'AUTH_FAILED' }));
          }
        }
      } catch { /* ignore */ }
    });

    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));

    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Vecna Shorts WS Ready' }));
  });
};

export const broadcast = (msg: unknown, role?: string) => {
  const payload = JSON.stringify(msg);
  for (const [ws, client] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      if (!role || client.role === role) {
        ws.send(payload);
      }
    }
  }
};

export const sendToUser = (userId: string, msg: unknown) => {
  const payload = JSON.stringify(msg);
  for (const [ws, client] of clients) {
    if (ws.readyState === WebSocket.OPEN && client.userId === userId) {
      ws.send(payload);
    }
  }
};

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../config/jwt';
import { COOKIE_NAMES } from '../utils/constants';

let io: SocketIOServer | null = null;

// Pulls the access token out of either a parsed cookie header or an
// `auth: { token }` handshake payload — the frontend sends whichever it has
// (httpOnly cookie normally isn't readable by JS, so the socket client
// falls back to the same bearer token it keeps in localStorage).
function extractToken(socket: Socket): string | null {
  const bearer = socket.handshake.auth?.token as string | undefined;
  if (bearer) return bearer;

  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAMES.ACCESS_TOKEN}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

export function initRealtime(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid or expired session'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    // Every device/tab a user has open joins their personal room, so a
    // notification created anywhere on the backend reaches all of them.
    socket.join(`user:${userId}`);
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

// Emits an event to every connected socket for one user (all of that
// user's open tabs/devices). Safe to call even if realtime isn't
// initialized yet (e.g. during tests) — it just silently no-ops.
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToUsers(userIds: string[], event: string, payload: unknown) {
  if (!io || userIds.length === 0) return;
  for (const id of userIds) io.to(`user:${id}`).emit(event, payload);
}

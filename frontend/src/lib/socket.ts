import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function socketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

// One shared connection per browser tab. Called once the user is
// authenticated (see notificationStore.init) and torn down on logout.
export function connectSocket(token: string | null): Socket {
  if (socket?.connected) return socket;
  socket = io(socketUrl(), {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

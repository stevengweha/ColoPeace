import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(userId: string) {
  if (socket) return socket;
  socket = io('http://localhost:5001', { transports: ['websocket'] });
  socket.on('connect', () => socket!.emit('userOnline', userId));
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

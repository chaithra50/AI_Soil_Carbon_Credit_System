import { io } from 'socket.io-client';
import { getAccessToken } from '../api/axiosClient';

let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;
  socket = io('/', {
    path: '/socket.io',
    auth: { token: getAccessToken() },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

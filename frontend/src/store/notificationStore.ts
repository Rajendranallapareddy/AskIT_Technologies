import { create } from 'zustand';
import { notificationApi } from '../api/endpoints';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
  type: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isConnected: boolean;
  setNotifications: (list: AppNotification[]) => void;
  addNotification: (n: AppNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  fetchAll: () => Promise<void>;
  init: (token: string | null) => void;
  teardown: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isConnected: false,

  setNotifications: (list) => set({ notifications: list, unreadCount: list.filter((n) => !n.isRead).length }),

  addNotification: (n) =>
    set((s) => ({
      notifications: [n, ...s.notifications].slice(0, 100),
      unreadCount: s.unreadCount + (n.isRead ? 0 : 1),
    })),

  markRead: (id) => {
    const target = get().notifications.find((n) => n.id === id);
    if (target && !target.isRead) {
      notificationApi.markRead(id).catch(() => {});
    }
    set((s) => {
      const notifications = s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      return { notifications, unreadCount: notifications.filter((n) => !n.isRead).length };
    });
  },

  markAllRead: () => {
    notificationApi.markAllRead().catch(() => {});
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, isRead: true })), unreadCount: 0 }));
  },

  fetchAll: async () => {
    try {
      const res = await notificationApi.list({ limit: 30 });
      set({ notifications: res.data.data, unreadCount: res.data.meta?.unreadCount ?? res.data.data.filter((n: AppNotification) => !n.isRead).length });
    } catch {
      // silently ignore — bell just stays at whatever it last had
    }
  },

  // Called once after login (and on app boot if already authenticated):
  // loads notification history, then opens the real-time socket so the
  // bell updates instantly without a page refresh.
  init: (token) => {
    get().fetchAll();
    if (getSocket()?.connected) return;
    const socket = connectSocket(token);
    socket.off('notification:new');
    socket.on('notification:new', (n: AppNotification) => get().addNotification(n));
    socket.on('connect', () => set({ isConnected: true }));
    socket.on('disconnect', () => set({ isConnected: false }));
  },

  teardown: () => {
    disconnectSocket();
    set({ notifications: [], unreadCount: 0, isConnected: false });
  },
}));

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '@/types';
import { MOCK_NOTIFICATIONS } from '@/services/mockData';

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    loadNotifications(state, action: PayloadAction<string>) {
      state.items = MOCK_NOTIFICATIONS.filter(n => n.userId === action.payload);
      state.unreadCount = state.items.filter(n => !n.isRead).length;
    },
    markAsRead(state, action: PayloadAction<string>) {
      const item = state.items.find(n => n.id === action.payload);
      if (item && !item.isRead) {
        item.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead(state) {
      state.items.forEach(n => { n.isRead = true; });
      state.unreadCount = 0;
    },
    addNotification(state, action: PayloadAction<Notification>) {
      state.items.unshift(action.payload);
      if (!action.payload.isRead) state.unreadCount++;
    },
  },
});

export const { loadNotifications, markAsRead, markAllAsRead, addNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;

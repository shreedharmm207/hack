/**
 * Notifications Slice — Supabase Backend with Realtime
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  is_read: boolean;
  isRead?: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

interface NotificationsState {
  items: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  isLoading: false,
};

export const loadNotifications = createAsyncThunk(
  'notifications/load',
  async (userId: string) => {
    const { data } = await (supabase
      .from('notifications') as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    return (data || []) as AppNotification[];
  }
);

export const markAllRead = createAsyncThunk(
  'notifications/markAllRead',
  async (userId?: string) => {
    if (userId) {
      await (supabase
        .from('notifications') as any)
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    }
    return userId;
  }
);

export const markAllAsRead = markAllRead;

export const markRead = createAsyncThunk(
  'notifications/markRead',
  async (notificationId: string) => {
    await (supabase
      .from('notifications') as any)
      .update({ is_read: true })
      .eq('id', notificationId);
    return notificationId;
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification(state, action) {
      state.items.unshift(action.payload);
      if (!action.payload.is_read) state.unreadCount++;
    },
    clearAll(state) {
      state.items = [];
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadNotifications.pending, (s) => { s.isLoading = true; })
      .addCase(loadNotifications.fulfilled, (s, a) => {
        s.isLoading = false;
        s.items = a.payload;
        s.unreadCount = a.payload.filter(n => !n.is_read).length;
      })
      .addCase(markAllRead.fulfilled, (s) => {
        s.items.forEach(n => { n.is_read = true; });
        s.unreadCount = 0;
      })
      .addCase(markRead.fulfilled, (s, a) => {
        const n = s.items.find(n => n.id === a.payload);
        if (n && !n.is_read) { n.is_read = true; s.unreadCount = Math.max(0, s.unreadCount - 1); }
      });
  },
});

export const { addNotification, clearAll } = notificationsSlice.actions;
export default notificationsSlice.reducer;

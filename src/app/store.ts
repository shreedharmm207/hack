import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import farmerReducer from '../features/farmer/farmerSlice';
import providerReducer from '../features/provider/providerSlice';
import adminReducer from '../features/admin/adminSlice';
import notificationsReducer from '../features/shared/notificationsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    farmer: farmerReducer,
    provider: providerReducer,
    admin: adminReducer,
    notifications: notificationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

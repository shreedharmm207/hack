import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import farmerReducer from '../features/farmer/farmerSlice';
import organizationReducer from '../features/provider/providerSlice';
import adminReducer from '../features/admin/adminSlice';
import notificationsReducer from '../features/shared/notificationsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    farmer: farmerReducer,
    provider: organizationReducer,  // keep key as 'provider' for existing component refs
    admin: adminReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefault) => getDefault({
    serializableCheck: {
      // Ignore non-serializable date values in some places
      ignoredActions: ['auth/restoreSession/fulfilled'],
    },
  }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import AppRouter from './app/router';
import { restoreSession } from './features/auth/authSlice';
import { supabase } from './lib/supabase';
import './index.css';

// Restore session on app load
store.dispatch(restoreSession());

// Listen for auth state changes (e.g., email confirmation redirect)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    store.dispatch(restoreSession());
  }
  if (event === 'SIGNED_OUT') {
    // Auth logout is handled by the logout thunk
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppRouter />
    </Provider>
  </React.StrictMode>
);

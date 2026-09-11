/**
 * AuthCallbackPage — handles Supabase email confirmation redirects
 *
 * When a user clicks the email confirmation link, Supabase redirects to:
 *   http://localhost:3000/auth/callback#access_token=...&refresh_token=...
 *
 * This page picks up those tokens, establishes the session, then redirects
 * to the correct portal based on the user's role.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAppDispatch } from '../../app/hooks';
import { restoreSession } from './authSlice';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Confirming your email address...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase sets the session from the URL hash automatically.
        // We just need to read the current session.
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session?.user) {
          // Fetch the user's profile to determine role
          const { data: profile } = await (supabase
            .from('profiles') as any)
            .select('role')
            .eq('id', session.user.id)
            .single();

          const role = profile?.role || 'farmer';

          setStatus('success');
          setMessage(`Email confirmed! ✅ Welcome to FarmGrid. Redirecting to your dashboard...`);

          // Restore Redux session state
          await dispatch(restoreSession());

          // Redirect after a brief delay
          setTimeout(() => {
            if (role === 'admin') navigate('/admin/dashboard', { replace: true });
            else if (role === 'organization') navigate('/organization/dashboard', { replace: true });
            else navigate('/farmer/dashboard', { replace: true });
          }, 1500);
        } else {
          // No session yet — the tokens might be processing. Try once more.
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession?.user) {
              await dispatch(restoreSession());
              const { data: profile } = await (supabase
                .from('profiles') as any)
                .select('role')
                .eq('id', retrySession.user.id)
                .single();
              const role = profile?.role || 'farmer';
              setStatus('success');
              setMessage('Email confirmed! ✅ Redirecting...');
              setTimeout(() => {
                if (role === 'admin') navigate('/admin/dashboard', { replace: true });
                else if (role === 'organization') navigate('/organization/dashboard', { replace: true });
                else navigate('/farmer/dashboard', { replace: true });
              }, 1000);
            } else {
              setStatus('error');
              setMessage('Email confirmation failed or link has expired. Please try registering again or use the login page.');
            }
          }, 2000);
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.message || 'Something went wrong during email confirmation.');
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-primary-700 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4">
            🌿
          </div>
          <span className="text-xl font-bold text-text-primary">FarmGrid</span>
        </div>

        <div className="card p-8">
          {status === 'processing' && (
            <>
              <div className="flex items-center justify-center mb-4">
                <svg className="animate-spin w-10 h-10 text-primary-700" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-text-primary mb-2">Confirming your email...</h1>
              <p className="text-sm text-text-muted">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-5xl mb-4">✅</div>
              <h1 className="text-lg font-semibold text-text-primary mb-2">Email Confirmed!</h1>
              <p className="text-sm text-text-muted">{message}</p>
              <div className="mt-4 h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary-700 rounded-full animate-pulse" style={{ width: '80%' }} />
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-5xl mb-4">❌</div>
              <h1 className="text-lg font-semibold text-text-primary mb-2">Confirmation Failed</h1>
              <p className="text-sm text-text-muted mb-6">{message}</p>
              <div className="flex flex-col gap-3">
                <a href="/farmer/login" className="btn-primary btn-sm text-center">
                  Go to Farmer Login
                </a>
                <a href="/organization/login" className="btn-secondary btn-sm text-center">
                  Go to Organization Login
                </a>
                <a href="/" className="text-xs text-text-muted hover:text-primary-700 text-center">
                  Back to Home
                </a>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-xs text-text-muted">
          Having trouble?{' '}
          <a href="/farmer/register" className="text-primary-700 hover:underline">
            Register again
          </a>
          {' '}or use the{' '}
          <a href="/farmer/login" className="text-primary-700 hover:underline">
            1-Click Demo Login
          </a>
        </p>
      </div>
    </div>
  );
}

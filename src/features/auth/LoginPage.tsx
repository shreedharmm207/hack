import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { loginWithPassword, clearError, demoLogin } from './authSlice';
import type { UserRole } from './authSlice';

interface LoginPageProps {
  role: UserRole;
}

const ROLE_CONFIG: Record<UserRole, {
  title: string; subtitle: string; icon: string; color: string;
  registerPath: string | null; homePath: string;
}> = {
  farmer: {
    title: 'Farmer Portal',
    subtitle: 'Access your farm resource dashboard',
    icon: '🌾', color: 'bg-primary-700',
    registerPath: '/farmer/register',
    homePath: '/farmer/dashboard',
  },
  organization: {
    title: 'Organization Portal',
    subtitle: 'Manage your agricultural resources',
    icon: '🏭', color: 'bg-teal-600',
    registerPath: '/organization/register',
    homePath: '/organization/dashboard',
  },
  admin: {
    title: 'Admin Portal',
    subtitle: 'Platform administration & oversight',
    icon: '⚙️', color: 'bg-slate-800',
    registerPath: null,
    homePath: '/admin/dashboard',
  },
};

export default function LoginPage({ role }: LoginPageProps) {
  const config = ROLE_CONFIG[role];
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, user } = useAppSelector(s => s.auth);

  const [email, setEmail] = useState(role === 'admin' ? 'admin@farmgrid.demo' : '');
  const [password, setPassword] = useState(role === 'admin' ? 'FarmGrid@Admin123' : '');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    dispatch(clearError());
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === 'farmer') navigate('/farmer/dashboard', { replace: true });
      else if (user.role === 'organization') navigate('/organization/dashboard', { replace: true });
      else if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    await dispatch(loginWithPassword({ email: email.trim(), password, expectedRole: role }));
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left panel */}
      <div className={`hidden lg:flex lg:w-2/5 ${config.color} flex-col justify-between p-12`}>
        <div>
          <Link to="/" id="back-to-home-left" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-10 text-sm font-medium transition-colors">
            ← Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🌿</div>
            <span className="text-white text-xl font-bold">FarmGrid</span>
          </div>
          <div className="text-4xl mb-3">{config.icon}</div>
          <h2 className="text-white text-3xl font-bold mb-4">{config.title}</h2>
          <p className="text-white/70 text-base leading-relaxed">
            FarmGrid automatically coordinates agricultural resources using a transparent
            priority scoring engine, conflict resolution, and real-time scheduling.
          </p>
        </div>
        <div className="space-y-4">
          {['Priority Scoring Engine', 'Auto Conflict Resolution', 'Real-time Scheduling', 'Fairness Guard'].map(feat => (
            <div key={feat} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-white/80 text-sm">{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Back to Home Button */}
          <div className="mb-4">
            <Link
              to="/"
              id="back-to-home"
              className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-primary-700 transition-colors group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
            </Link>
          </div>

          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center text-white">🌿</div>
            <span className="text-lg font-bold text-text-primary">FarmGrid</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary">Sign in to {config.title}</h1>
            <p className="text-text-muted text-sm mt-1">{config.subtitle}</p>
          </div>

          {/* Admin note */}
          {role === 'admin' && (
            <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs font-semibold text-slate-700 mb-1">🔐 Admin Access</p>
              <p className="text-xs text-slate-600">Credentials are pre-filled. Admin does not require OTP.</p>
            </div>
          )}

          {/* Prominent Demo Access for farmer/org — no account needed */}
          {role !== 'admin' && (
            <div className="mb-6 rounded-2xl border-2 border-primary-300 bg-gradient-to-br from-teal-50 to-emerald-50 p-4 shadow-sm">
              <p className="text-xs font-bold text-primary-800 mb-1 uppercase tracking-wide">⚡ Instant Demo Access</p>
              <p className="text-xs text-text-muted mb-3">
                No account needed — try the full {role === 'farmer' ? 'Farmer' : 'Organization'} experience instantly.
              </p>
              <button
                type="button"
                id={`demo-login-${role}`}
                onClick={() => dispatch(demoLogin(role))}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-primary-700 hover:bg-primary-800 active:bg-primary-900 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow hover:shadow-md"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>
                      Enter as {role === 'farmer' ? 'Ramesh Patel (Demo Farmer)' : 'Kaveri Agri Cooperative (Demo Org)'}
                    </span>
                  </>
                )}
              </button>
              <p className="text-center text-xs text-text-muted mt-2">Works instantly · No email · No password</p>
            </div>
          )}

          {/* Divider */}
          {role !== 'admin' && (
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-muted font-medium">or sign in with your account</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="field-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="field-input pr-12"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-sm"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full btn-lg"
              disabled={isLoading || !email.trim() || !password.trim()}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : `Sign in to ${config.title}`}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {config.registerPath && (
              <p className="text-sm text-text-muted">
                Don't have an account?{' '}
                <Link to={config.registerPath} className="text-primary-700 font-semibold hover:underline">
                  Register here
                </Link>
              </p>
            )}
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
              {role !== 'farmer' && (
                <Link to="/farmer/login" className="text-xs text-text-muted hover:text-primary-700">Farmer Login</Link>
              )}
              {role !== 'organization' && (
                <Link to="/organization/login" className="text-xs text-text-muted hover:text-primary-700">Organization Login</Link>
              )}
              {role !== 'admin' && (
                <Link to="/admin/login" className="text-xs text-text-muted hover:text-primary-700">Admin Login</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

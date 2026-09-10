import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { loginUser, clearError } from './authSlice';
import type { UserRole } from '@/types';

interface LoginPageProps {
  role: UserRole;
}

const ROLE_CONFIG = {
  farmer: {
    title: 'Farmer Portal',
    subtitle: 'Access your farm resource dashboard',
    icon: '🌾',
    color: 'bg-primary-700',
    registerPath: '/farmer/register',
    demoCreds: { email: 'rajan@farmer.in', password: 'farmer123' },
    homePath: '/farmer/dashboard',
  },
  provider: {
    title: 'Resource Provider Portal',
    subtitle: 'Manage your agricultural resources',
    icon: '🏭',
    color: 'bg-teal-600',
    registerPath: '/provider/register',
    demoCreds: { email: 'agrotech@provider.in', password: 'provider123' },
    homePath: '/provider/dashboard',
  },
  admin: {
    title: 'Admin Portal',
    subtitle: 'Platform administration & oversight',
    icon: '⚙️',
    color: 'bg-slate-800',
    registerPath: null,
    demoCreds: { email: 'admin@farmgrid.in', password: 'admin123' },
    homePath: '/admin/dashboard',
  },
};

interface FormData { email: string; password: string; }

export default function LoginPage({ role }: LoginPageProps) {
  const config = ROLE_CONFIG[role];
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, user } = useAppSelector(s => s.auth);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    dispatch(clearError());
  }, []);

  useEffect(() => {
    if (user?.role === role) {
      navigate(config.homePath, { replace: true });
    }
  }, [user]);

  const onSubmit = (data: FormData) => {
    dispatch(loginUser({ ...data, role }));
  };

  const fillDemo = () => {
    setValue('email', config.demoCreds.email);
    setValue('password', config.demoCreds.password);
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left panel */}
      <div className={`hidden lg:flex lg:w-2/5 ${config.color} flex-col justify-between p-12`}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🌿</div>
            <span className="text-white text-xl font-bold">FarmGrid</span>
          </div>
          <div className="text-4xl mb-3">{config.icon}</div>
          <h2 className="text-white text-3xl font-bold mb-4">{config.title}</h2>
          <p className="text-white/70 text-base leading-relaxed">
            FarmGrid intelligently coordinates agricultural resources across farmers, ensuring
            fair, transparent, and data-driven allocation decisions.
          </p>
        </div>

        <div className="space-y-4">
          {['Priority Scoring Engine', 'Conflict Resolution', 'Real-time Scheduling'].map(feat => (
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
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center text-white">🌿</div>
            <span className="text-lg font-bold text-text-primary">FarmGrid</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-primary">Sign in to {config.title}</h1>
            <p className="text-text-muted text-sm mt-1">{config.subtitle}</p>
          </div>

          {/* Demo credentials hint */}
          <div className="mb-6 p-3 bg-teal-50 border border-teal-100 rounded-lg flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-primary-700">Demo Credentials</p>
              <p className="text-xs text-text-muted mt-0.5">{config.demoCreds.email} / {config.demoCreds.password}</p>
            </div>
            <button onClick={fillDemo} className="btn btn-sm bg-primary-700 text-white hover:bg-primary-800 flex-shrink-0">
              Fill
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="field-input"
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                })}
              />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>

            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="field-input"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
              />
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-danger">{error}</div>
            )}

            <button type="submit" className="btn-primary w-full btn-lg" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {config.registerPath && (
              <p className="text-sm text-text-muted">
                Don't have an account?{' '}
                <Link to={config.registerPath} className="text-primary-700 font-semibold hover:underline">
                  Create account
                </Link>
              </p>
            )}
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
              {role !== 'farmer' && (
                <Link to="/farmer/login" className="text-xs text-text-muted hover:text-primary-700">Farmer Login</Link>
              )}
              {role !== 'provider' && (
                <Link to="/provider/login" className="text-xs text-text-muted hover:text-primary-700">Provider Login</Link>
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

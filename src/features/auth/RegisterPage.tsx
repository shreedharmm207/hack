import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { registerUser, clearError } from './authSlice';
import type { UserRole } from '@/types';
import { INDIAN_STATES, PROVIDER_TYPES } from '@/utils/constants';

interface RegisterPageProps {
  role: 'farmer' | 'provider';
}

interface FarmerForm {
  name: string; email: string; password: string; confirmPassword: string;
  mobile: string; state: string; district: string; village: string;
}

interface ProviderForm {
  name: string; email: string; password: string; confirmPassword: string;
  mobile: string; orgName: string; providerType: string;
}

export default function RegisterPage({ role }: RegisterPageProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, user } = useAppSelector(s => s.auth);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FarmerForm & ProviderForm>();
  const password = watch('password');

  useEffect(() => { dispatch(clearError()); }, []);

  useEffect(() => {
    if (user?.role === role) {
      navigate(role === 'farmer' ? '/farmer/dashboard' : '/provider/dashboard', { replace: true });
    }
  }, [user]);

  const onSubmit = (data: FarmerForm & ProviderForm) => {
    dispatch(registerUser({ ...data, role }));
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-primary-700 rounded-lg flex items-center justify-center text-white">🌿</div>
          <span className="text-lg font-bold text-text-primary">FarmGrid</span>
        </div>

        <div className="card p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary">
              {role === 'farmer' ? 'Create Farmer Account' : 'Register as Resource Provider'}
            </h1>
            <p className="text-sm text-text-muted mt-1">Join FarmGrid to access agricultural resources</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Full Name *</label>
                <input className="field-input" placeholder="Rajan Verma"
                  {...register('name', { required: 'Name is required' })} />
                {errors.name && <p className="field-error">{errors.name.message}</p>}
              </div>
              <div>
                <label className="field-label">Mobile Number *</label>
                <input className="field-input" placeholder="9876543210" type="tel"
                  {...register('mobile', { required: 'Mobile is required', pattern: { value: /^[0-9]{10}$/, message: '10-digit mobile' } })} />
                {errors.mobile && <p className="field-error">{errors.mobile.message}</p>}
              </div>
            </div>

            {role === 'provider' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Organization Name *</label>
                  <input className="field-input" placeholder="Org name"
                    {...register('orgName', { required: 'Org name required' })} />
                  {errors.orgName && <p className="field-error">{errors.orgName.message}</p>}
                </div>
                <div>
                  <label className="field-label">Provider Type *</label>
                  <select className="field-select"
                    {...register('providerType', { required: 'Select type' })}>
                    <option value="">Select type</option>
                    {Object.entries(PROVIDER_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {role === 'farmer' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">State *</label>
                  <select className="field-select"
                    {...register('state', { required: 'State required' })}>
                    <option value="">Select state</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">District *</label>
                  <input className="field-input" placeholder="District"
                    {...register('district', { required: 'District required' })} />
                </div>
              </div>
            )}

            <div>
              <label className="field-label">Email Address *</label>
              <input className="field-input" type="email" placeholder="you@example.com"
                {...register('email', {
                  required: 'Email required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
                })} />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Password *</label>
                <input className="field-input" type="password" placeholder="Min 8 characters"
                  {...register('password', { required: 'Password required', minLength: { value: 8, message: 'Min 8 chars' } })} />
                {errors.password && <p className="field-error">{errors.password.message}</p>}
              </div>
              <div>
                <label className="field-label">Confirm Password *</label>
                <input className="field-input" type="password" placeholder="Repeat password"
                  {...register('confirmPassword', {
                    required: 'Confirm password',
                    validate: v => v === password || 'Passwords do not match',
                  })} />
                {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-danger">{error}</div>}

            <button type="submit" className="btn-primary w-full btn-lg mt-2" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-4">
            Already have an account?{' '}
            <Link to={role === 'farmer' ? '/farmer/login' : '/provider/login'}
              className="text-primary-700 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

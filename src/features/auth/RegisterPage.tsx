import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { registerFarmer, registerOrganization, clearError } from './authSlice';

interface RegisterPageProps {
  role: 'farmer' | 'organization';
}

export default function RegisterPage({ role }: RegisterPageProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, user } = useAppSelector(s => s.auth);

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    name: '', phone: '', orgName: '', contactPerson: '',
    village: '', district: '', state: '', address: '',
    operationalRegion: '', orgType: 'cooperative',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    dispatch(clearError());
  }, []);

  // When registered/logged in, immediately navigate to dashboard
  useEffect(() => {
    if (user) {
      if (user.role === 'farmer') navigate('/farmer/dashboard', { replace: true });
      else if (user.role === 'organization') navigate('/organization/dashboard', { replace: true });
      else if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const emailClean = form.email.trim().toLowerCase();
    if (!emailClean.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    if (role === 'farmer') {
      const result = await dispatch(registerFarmer({
        email: emailClean,
        password: form.password,
        name: form.name.trim(),
        phone: form.phone,
        village: form.village,
        district: form.district,
        state: form.state,
      }));
      if (registerFarmer.fulfilled.match(result)) {
        navigate('/farmer/dashboard', { replace: true });
      }
    } else {
      const result = await dispatch(registerOrganization({
        email: emailClean,
        password: form.password,
        orgName: form.orgName.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone,
        address: form.address,
        operationalRegion: form.operationalRegion,
        orgType: form.orgType,
      }));
      if (registerOrganization.fulfilled.match(result)) {
        navigate('/organization/dashboard', { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left panel */}
      <div className={`hidden lg:flex lg:w-2/5 ${role === 'farmer' ? 'bg-primary-700' : 'bg-teal-600'} flex-col justify-between p-12`}>
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-12 text-sm font-medium transition-colors">
            ← Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🌿</div>
            <span className="text-white text-xl font-bold">FarmGrid</span>
          </div>
          <div className="text-4xl mb-3">{role === 'farmer' ? '🌾' : '🏭'}</div>
          <h2 className="text-white text-3xl font-bold mb-4">
            {role === 'farmer' ? 'Join as a Farmer' : 'Register Your Organization'}
          </h2>
          <p className="text-white/70 leading-relaxed">
            {role === 'farmer'
              ? 'Get automated access to tractors, harvesters, irrigation pumps and more based on transparent priority scoring.'
              : 'List your agricultural machinery and serve farmers in your region through FarmGrid\'s scheduling engine.'}
          </p>
        </div>
        <div className="p-4 bg-white/10 rounded-xl">
          <p className="text-white/90 text-sm font-semibold mb-1">🔐 Secure Email Verification</p>
          <p className="text-white/70 text-xs">
            After registering, you'll receive a 6-digit verification code to activate your account securely.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-6">
          {/* Back to Home Link */}
          <div className="mb-4">
            <Link
              to="/"
              id="register-back-to-home"
              className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-primary-700 transition-colors group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
            </Link>
          </div>

          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center text-white">🌿</div>
            <span className="text-lg font-bold text-text-primary">FarmGrid</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary">
              {role === 'farmer' ? 'Create Farmer Account' : 'Register Organization'}
            </h1>
            <p className="text-text-muted text-sm mt-1">
              Enter your details below. We will send a 6-digit verification code to your email.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common fields */}
            <div>
              <label className="field-label">Email Address *</label>
              <input type="email" className="field-input" required placeholder="you@example.com"
                value={form.email} onChange={set('email')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Password *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} className="field-input pr-8"
                    required minLength={6} placeholder="Min 6 chars"
                    value={form.password} onChange={set('password')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div>
                <label className="field-label">Confirm Password *</label>
                <input type="password" className="field-input" required
                  placeholder="Repeat password"
                  value={form.confirmPassword} onChange={set('confirmPassword')} />
              </div>
            </div>

            {role === 'farmer' ? (
              <>
                <div>
                  <label className="field-label">Full Name *</label>
                  <input type="text" className="field-input" required placeholder="Ramesh Patel"
                    value={form.name} onChange={set('name')} />
                </div>
                <div>
                  <label className="field-label">Phone Number</label>
                  <input type="tel" className="field-input" placeholder="9876543210"
                    value={form.phone} onChange={set('phone')} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="field-label">Village</label>
                    <input type="text" className="field-input" placeholder="Village"
                      value={form.village} onChange={set('village')} />
                  </div>
                  <div>
                    <label className="field-label">District</label>
                    <input type="text" className="field-input" placeholder="District"
                      value={form.district} onChange={set('district')} />
                  </div>
                  <div>
                    <label className="field-label">State</label>
                    <input type="text" className="field-input" placeholder="State"
                      value={form.state} onChange={set('state')} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="field-label">Organization Name *</label>
                  <input type="text" className="field-input" required placeholder="ABC Agricultural Services"
                    value={form.orgName} onChange={set('orgName')} />
                </div>
                <div>
                  <label className="field-label">Contact Person *</label>
                  <input type="text" className="field-input" required placeholder="Your full name"
                    value={form.contactPerson} onChange={set('contactPerson')} />
                </div>
                <div>
                  <label className="field-label">Contact Number</label>
                  <input type="tel" className="field-input" placeholder="9876543210"
                    value={form.phone} onChange={set('phone')} />
                </div>
                <div>
                  <label className="field-label">Address</label>
                  <input type="text" className="field-input" placeholder="Office address"
                    value={form.address} onChange={set('address')} />
                </div>
                <div>
                  <label className="field-label">Operational Region</label>
                  <input type="text" className="field-input" placeholder="e.g., Mandya, Karnataka"
                    value={form.operationalRegion} onChange={set('operationalRegion')} />
                </div>
                <div>
                  <label className="field-label">Organization Type</label>
                  <select className="field-input" value={form.orgType} onChange={set('orgType')}>
                    <option value="cooperative">Cooperative Society</option>
                    <option value="private_company">Private Company</option>
                    <option value="ngo">NGO</option>
                    <option value="government">Government Body</option>
                  </select>
                </div>
              </>
            )}

            {(error || validationError) && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-danger">
                {validationError || error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full btn-lg" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : `Create Account / Sign Up`}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-muted">
              Already have an account?{' '}
              <Link
                to={role === 'farmer' ? '/farmer/login' : '/organization/login'}
                className="text-primary-700 font-semibold hover:underline"
              >
                Sign in with Email & Password
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

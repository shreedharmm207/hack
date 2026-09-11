import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { verifyOtp, resendOtp, clearError } from './authSlice';

export default function VerifyEmailPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoading, error } = useAppSelector(s => s.auth);

  // Read email from search params or localStorage
  const urlEmail = searchParams.get('email') || '';
  const urlRole = searchParams.get('role') || 'farmer';

  const [email, setEmail] = useState(() => {
    return urlEmail || localStorage.getItem('pending_verify_email') || '';
  });
  const [role, setRole] = useState(() => {
    return urlRole || localStorage.getItem('pending_verify_role') || 'farmer';
  });

  // 6 digits OTP input state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer state for resend (45 seconds countdown)
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [resendSuccessMessage, setResendSuccessMessage] = useState('');
  const [customError, setCustomError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [devHelperCode, setDevHelperCode] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    if (urlEmail) {
      localStorage.setItem('pending_verify_email', urlEmail);
      setEmail(urlEmail);
    }
    if (urlRole) {
      localStorage.setItem('pending_verify_role', urlRole);
      setRole(urlRole);
    }
  }, [urlEmail, urlRole]);

  // Auto redirect immediately because OTP is removed
  useEffect(() => {
    const userRole = role === 'organization' ? 'organization' : 'farmer';
    navigate(`/login/${userRole}`, { replace: true });
  }, [navigate, role]);

  useEffect(() => {
    dispatch(clearError());
    setCustomError('');
    // Auto-focus first input
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Check dev helper for local demo convenience if needed
  useEffect(() => {
    if (email) {
      fetch(`/api/auth/dev-last-otp?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(d => {
          if (d?.last_otp) setDevHelperCode(d.last_otp);
        })
        .catch(() => {});
    }
  }, [email, countdown]);

  const maskEmail = (emailStr: string) => {
    if (!emailStr) return 'your email';
    const parts = emailStr.split('@');
    if (parts.length < 2) return emailStr;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');

    // Handle multi-character paste (e.g. user pasted a 6-digit code)
    if (cleaned.length > 1) {
      const pastedDigits = cleaned.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pastedDigits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError('');
    setResendSuccessMessage('');

    const fullOtp = otpDigits.join('').trim();
    if (fullOtp.length !== 6) {
      setCustomError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (!email.trim()) {
      setCustomError('Email address is missing. Please provide your email.');
      return;
    }

    const resultAction = await dispatch(verifyOtp({ email: email.trim().toLowerCase(), otp: fullOtp }));

    if (verifyOtp.fulfilled.match(resultAction)) {
      setIsVerified(true);
      localStorage.removeItem('pending_verify_email');
    } else {
      const errMsg = (resultAction.payload as string) || 'Invalid verification code. Please try again.';
      setCustomError(errMsg);
    }
  };

  const handleResend = async () => {
    if (!canResend || !email.trim()) return;
    setCustomError('');
    setResendSuccessMessage('');

    const result = await dispatch(resendOtp({ email: email.trim().toLowerCase() }));
    if (resendOtp.fulfilled.match(result)) {
      setResendSuccessMessage('A fresh 6-digit verification code has been sent to your email.');
      setCountdown(45);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      setCustomError((result.payload as string) || 'Failed to resend code. Please try again.');
    }
  };

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const loginRoute = role === 'organization' ? '/organization/login' : '/farmer/login';

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-between p-6">
      {/* Top navigation */}
      <header className="max-w-md mx-auto w-full pt-4">
        <Link
          to="/"
          id="verify-back-to-home"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-primary-700 transition-colors group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
        </Link>
      </header>

      {/* Main card */}
      <main className="max-w-md mx-auto w-full py-8">
        <div className="card p-8 shadow-md border border-border">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-teal-50 text-primary-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
              ✉️
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Verify Your Email</h1>
            <p className="text-text-muted text-sm mt-1.5 leading-relaxed">
              We've sent a 6-digit verification code to{' '}
              <strong className="text-text-primary font-semibold">{maskEmail(email)}</strong>.
            </p>
          </div>

          {/* SUCCESS STATE */}
          {isVerified ? (
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto">
                ✓
              </div>
              <div>
                <h2 className="text-lg font-bold text-emerald-800">Email verified successfully!</h2>
                <p className="text-text-muted text-sm mt-1">
                  Your FarmGrid account is now active and ready to use.
                </p>
              </div>

              <div className="pt-4">
                <Link
                  to={loginRoute}
                  id="continue-to-login-btn"
                  className="btn-primary w-full py-3 text-center block text-sm font-semibold rounded-xl"
                >
                  Continue to Login →
                </Link>
              </div>
            </div>
          ) : (
            /* OTP INPUT FORM */
            <form onSubmit={handleVerify} className="space-y-6">
              {/* If email wasn't passed in URL, allow user to type it */}
              {!urlEmail && (
                <div>
                  <label className="field-label">Email Address</label>
                  <input
                    type="email"
                    className="field-input text-sm"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                  />
                </div>
              )}

              {/* 6 Digit Inputs */}
              <div>
                <label className="field-label text-center block mb-3 text-xs uppercase tracking-wider text-text-muted">
                  Enter 6-Digit Code
                </label>
                <div className="flex justify-between gap-2 max-w-xs mx-auto">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleDigitChange(index, e.target.value)}
                      onKeyDown={e => handleKeyDown(index, e)}
                      id={`otp-input-${index}`}
                      className="w-11 h-13 text-center text-2xl font-bold rounded-xl border border-border bg-slate-50 focus:bg-white focus:border-primary-700 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>

              {/* Dev environment quick-fill hint (only when no external SMTP configured) */}
              {devHelperCode && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                  <span>
                    <strong>Dev Code:</strong> {devHelperCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = devHelperCode.slice(0, 6).split('');
                      setOtpDigits(digits);
                    }}
                    className="text-xs font-semibold text-primary-700 hover:underline cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              {/* Error messages */}
              {(error || customError) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center animate-shake">
                  {customError || error}
                </div>
              )}

              {/* Resend success message */}
              {resendSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 text-center">
                  {resendSuccessMessage}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                id="verify-email-submit-btn"
                disabled={isLoading}
                className="btn-primary w-full py-3.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow hover:shadow-md transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Verify Email'
                )}
              </button>

              {/* Resend Section with 00:45 countdown */}
              <div className="pt-2 text-center text-sm border-t border-border">
                {canResend ? (
                  <button
                    type="button"
                    id="resend-otp-btn"
                    onClick={handleResend}
                    disabled={isLoading}
                    className="text-primary-700 font-semibold hover:underline transition-colors"
                  >
                    Resend OTP
                  </button>
                ) : (
                  <p className="text-text-muted text-xs">
                    Resend OTP in{' '}
                    <span className="font-mono font-semibold text-text-primary">
                      {formatCountdown(countdown)}
                    </span>
                  </p>
                )}
              </div>
            </form>
          )}

          {/* Footer links */}
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <Link to={loginRoute} className="hover:text-primary-700 transition-colors">
              Return to Login
            </Link>
            <Link to={role === 'organization' ? '/organization/register' : '/farmer/register'} className="hover:text-primary-700 transition-colors">
              Change Email / Re-register
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-text-muted py-2">
        FarmGrid — Agricultural Resource Platform
      </footer>
    </div>
  );
}

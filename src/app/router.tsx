import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import ProtectedRoute from '../features/shared/components/ProtectedRoute';

// Auth
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import AuthCallbackPage from '../features/auth/AuthCallbackPage';

// Lazy-load pages for better performance
const FarmerDashboard = lazy(() => import('../features/farmer/pages/FarmerDashboard'));
const RequestForm = lazy(() => import('../features/farmer/pages/RequestForm'));
const MyRequests = lazy(() => import('../features/farmer/pages/MyRequests'));
const FarmerSchedule = lazy(() => import('../features/farmer/pages/FarmerSchedule'));
const FarmerProfile = lazy(() => import('../features/farmer/pages/FarmerProfile'));
const VoiceRequestAssistant = lazy(() => import('../features/farmer/pages/VoiceRequestAssistant'));
const WhatIfSimulator = lazy(() => import('../features/farmer/pages/WhatIfSimulator'));
const FairnessView = lazy(() => import('../features/farmer/pages/FairnessView'));

const ProviderDashboard = lazy(() => import('../features/provider/pages/ProviderDashboard'));
const ResourceManagement = lazy(() => import('../features/provider/pages/ResourceManagement'));
const ActiveBookings = lazy(() => import('../features/provider/pages/ActiveBookings'));

const AdminDashboard = lazy(() => import('../features/admin/pages/AdminDashboard'));
const ConflictQueue = lazy(() => import('../features/admin/pages/ConflictQueue'));
const UserManagement = lazy(() => import('../features/admin/pages/UserManagement'));
const AuditLog = lazy(() => import('../features/admin/pages/AuditLog'));
const AdminResources = lazy(() => import('../features/admin/pages/AdminResources'));
const AdminAllocations = lazy(() => import('../features/admin/pages/AdminAllocations'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🌿</div>
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    </div>
  );
}

function HomePage() {
  const { user } = useAppSelector(s => s.auth);
  if (user?.role === 'farmer') return <Navigate to="/farmer/dashboard" replace />;
  if (user?.role === 'organization') return <Navigate to="/organization/dashboard" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <LandingPage />;
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="bg-white border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-700 rounded-xl flex items-center justify-center text-white text-xl">🌿</div>
            <div>
              <span className="text-lg font-bold text-text-primary">FarmGrid</span>
              <span className="text-xs text-text-muted block">Agricultural Resource Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/farmer/login" className="btn-secondary btn-sm">Farmer Login</a>
            <a href="/organization/login" className="btn-secondary btn-sm">Organization Login</a>
            <a href="/admin/login" className="btn-primary btn-sm">Admin Login</a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-primary-700 text-sm font-semibold px-4 py-2 rounded-full border border-teal-100 mb-6">
            <span className="w-2 h-2 bg-primary-700 rounded-full animate-pulse" />
            Production-grade Agricultural Operations Platform
          </div>
          <h1 className="text-5xl font-bold text-text-primary tracking-tight mb-6">
            Smart Resource Allocation<br />
            <span className="text-gradient">for Modern Agriculture</span>
          </h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto mb-10">
            FarmGrid automatically coordinates scarce agricultural resources using a transparent
            6-factor priority engine, FCFS tiebreaking, conflict auto-resolution, and a fairness
            guard. AI voice assistant in Kannada &amp; English helps farmers submit requests naturally.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <a href="/farmer/login" className="btn-primary btn-lg gap-3">
              <span>🌾</span> Farmer Portal
            </a>
            <a href="/organization/login" className="btn btn-lg btn-secondary gap-3">
              <span>🏭</span> Organization Portal
            </a>
            <a href="/admin/login" className="btn btn-lg bg-slate-800 text-white hover:bg-slate-900 gap-3">
              <span>⚙️</span> Admin Portal
            </a>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 mt-8">
            {[
              { icon: '🎯', title: 'Priority Scoring', desc: '6-factor transparent scoring: urgency, weather, crop stage, wait time, logistics, constraints.' },
              { icon: '⚡', title: 'Auto Allocation', desc: 'Automatic resource assignment via PostgreSQL RPC. Admin handles exceptions only.' },
              { icon: '⚖️', title: 'Fairness Guard', desc: 'Starvation prevention: waiting time boosts priority. No farmer is ignored.' },
              { icon: '🎙️', title: 'AI Voice (Kannada)', desc: 'Speak in Kannada or English. AI captures your request, the engine makes the decision.' },
              { icon: '🔮', title: 'What-If Simulator', desc: 'Explore how changing urgency or crop stage would affect your priority score.' },
            ].map(f => (
              <div key={f.title} className="card p-5 text-left">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">{f.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 card p-6 max-w-2xl mx-auto text-left">
            <h3 className="font-semibold text-text-primary mb-1 text-center">🔑 Quick Access</h3>
            <p className="text-xs text-text-muted text-center mb-4">Register to create a new account, or log in with your existing credentials.</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { role: 'Farmer', path: '/farmer/register', loginPath: '/farmer/login', color: 'bg-teal-50 border-teal-100', desc: 'Submit requests, track allocations' },
                { role: 'Organization', path: '/organization/register', loginPath: '/organization/login', color: 'bg-blue-50 border-blue-100', desc: 'Manage resources, view bookings' },
                { role: 'Admin', path: '/admin/login', loginPath: '/admin/login', color: 'bg-slate-50 border-slate-200', desc: 'Platform administration' },
              ].map(c => (
                <div key={c.role} className={`p-4 rounded-lg border ${c.color}`}>
                  <div className="text-xs font-bold text-text-primary mb-1">{c.role}</div>
                  <div className="text-xs text-text-muted mb-3">{c.desc}</div>
                  <div className="flex flex-col gap-1">
                    {c.role !== 'Admin' && (
                      <a href={c.path} className="text-xs bg-primary-700 text-white px-2 py-1 rounded text-center hover:bg-primary-800">Register</a>
                    )}
                    <a href={c.loginPath} className="text-xs bg-white border border-current text-primary-700 px-2 py-1 rounded text-center hover:bg-teal-50">Login</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-text-muted">
        FarmGrid — Agricultural Resource Coordination Platform · Powered by Supabase · Built for hackathon
      </footer>
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Landing */}
          <Route path="/" element={<HomePage />} />

          {/* Email Confirmation Callback */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Farmer Auth */}
          <Route path="/farmer/login" element={<LoginPage role="farmer" />} />
          <Route path="/farmer/register" element={<RegisterPage role="farmer" />} />

          {/* Farmer Portal */}
          <Route path="/farmer/dashboard" element={<ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>} />
          <Route path="/farmer/request" element={<ProtectedRoute role="farmer"><RequestForm /></ProtectedRoute>} />
          <Route path="/farmer/voice-request" element={<ProtectedRoute role="farmer"><VoiceRequestAssistant /></ProtectedRoute>} />
          <Route path="/farmer/requests" element={<ProtectedRoute role="farmer"><MyRequests /></ProtectedRoute>} />
          <Route path="/farmer/schedule" element={<ProtectedRoute role="farmer"><FarmerSchedule /></ProtectedRoute>} />
          <Route path="/farmer/profile" element={<ProtectedRoute role="farmer"><FarmerProfile /></ProtectedRoute>} />
          <Route path="/farmer/what-if" element={<ProtectedRoute role="farmer"><WhatIfSimulator /></ProtectedRoute>} />
          <Route path="/farmer/fairness" element={<ProtectedRoute role="farmer"><FairnessView /></ProtectedRoute>} />

          {/* Organization Auth (also support legacy /provider routes) */}
          <Route path="/organization/login" element={<LoginPage role="organization" />} />
          <Route path="/organization/register" element={<RegisterPage role="organization" />} />
          <Route path="/provider/login" element={<LoginPage role="organization" />} />
          <Route path="/provider/register" element={<RegisterPage role="organization" />} />

          {/* Organization Portal */}
          <Route path="/organization/dashboard" element={<ProtectedRoute role="organization"><ProviderDashboard /></ProtectedRoute>} />
          <Route path="/organization/resources" element={<ProtectedRoute role="organization"><ResourceManagement /></ProtectedRoute>} />
          <Route path="/organization/bookings" element={<ProtectedRoute role="organization"><ActiveBookings /></ProtectedRoute>} />
          <Route path="/provider/dashboard" element={<ProtectedRoute role="organization"><ProviderDashboard /></ProtectedRoute>} />
          <Route path="/provider/resources" element={<ProtectedRoute role="organization"><ResourceManagement /></ProtectedRoute>} />
          <Route path="/provider/bookings" element={<ProtectedRoute role="organization"><ActiveBookings /></ProtectedRoute>} />

          {/* Admin Auth */}
          <Route path="/admin/login" element={<LoginPage role="admin" />} />

          {/* Admin Portal */}
          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/conflicts" element={<ProtectedRoute role="admin"><ConflictQueue /></ProtectedRoute>} />
          <Route path="/admin/allocations" element={<ProtectedRoute role="admin"><AdminAllocations /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute role="admin"><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/resources" element={<ProtectedRoute role="admin"><AdminResources /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute role="admin"><AuditLog /></ProtectedRoute>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

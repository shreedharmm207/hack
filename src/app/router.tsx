import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';

// Auth
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import ProtectedRoute from '../features/shared/components/ProtectedRoute';

// Farmer
import FarmerDashboard from '../features/farmer/pages/FarmerDashboard';
import RequestForm from '../features/farmer/pages/RequestForm';
import MyRequests from '../features/farmer/pages/MyRequests';
import FarmerSchedule from '../features/farmer/pages/FarmerSchedule';
import FarmerProfile from '../features/farmer/pages/FarmerProfile';

// Provider
import ProviderDashboard from '../features/provider/pages/ProviderDashboard';
import ResourceManagement from '../features/provider/pages/ResourceManagement';
import ActiveBookings from '../features/provider/pages/ActiveBookings';

// Admin
import AdminDashboard from '../features/admin/pages/AdminDashboard';
import ConflictQueue from '../features/admin/pages/ConflictQueue';
import UserManagement from '../features/admin/pages/UserManagement';
import AuditLog from '../features/admin/pages/AuditLog';
import AdminResources from '../features/admin/pages/AdminResources';
import AdminAllocations from '../features/admin/pages/AdminAllocations';

function HomePage() {
  const { user } = useAppSelector(s => s.auth);
  if (user?.role === 'farmer') return <Navigate to="/farmer/dashboard" replace />;
  if (user?.role === 'provider') return <Navigate to="/provider/dashboard" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <LandingPage />;
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
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
            <a href="/provider/login" className="btn-secondary btn-sm">Provider Login</a>
            <a href="/admin/login" className="btn-primary btn-sm">Admin Login</a>
          </div>
        </div>
      </header>

      {/* Hero */}
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
            FarmGrid intelligently coordinates scarce agricultural resources among competing farmers
            using a transparent priority scoring engine, conflict resolution, and real-time scheduling.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <a href="/farmer/login" className="btn-primary btn-lg gap-3">
              <span>🌾</span> Farmer Portal
            </a>
            <a href="/provider/login" className="btn btn-lg btn-secondary gap-3">
              <span>🏭</span> Provider Portal
            </a>
            <a href="/admin/login" className="btn btn-lg bg-slate-800 text-white hover:bg-slate-900 gap-3">
              <span>⚙️</span> Admin Portal
            </a>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {[
              {
                icon: '🎯',
                title: 'Priority Scoring Engine',
                desc: 'Transparent 6-factor scoring: urgency, weather risk, crop stage, queue time, logistics, and resource scarcity.',
              },
              {
                icon: '⚡',
                title: 'Conflict Detection & Resolution',
                desc: 'Automatic overlap detection, ranked recommendations, and admin-controlled resolution with full audit trail.',
              },
              {
                icon: '📡',
                title: 'Offline-First Design',
                desc: 'Farmer requests save locally when offline and sync automatically when connection returns.',
              },
            ].map(f => (
              <div key={f.title} className="card p-6 text-left">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-base font-semibold text-text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Demo credentials */}
          <div className="mt-12 card p-6 max-w-2xl mx-auto text-left">
            <h3 className="font-semibold text-text-primary mb-4 text-center">🔑 Demo Credentials</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { role: 'Farmer', email: 'rajan@farmer.in', password: 'farmer123', path: '/farmer/login', color: 'bg-teal-50 border-teal-100' },
                { role: 'Provider', email: 'agrotech@provider.in', password: 'provider123', path: '/provider/login', color: 'bg-blue-50 border-blue-100' },
                { role: 'Admin', email: 'admin@farmgrid.in', password: 'admin123', path: '/admin/login', color: 'bg-slate-50 border-slate-200' },
              ].map(c => (
                <a key={c.role} href={c.path} className={`block p-4 rounded-lg border ${c.color} hover:shadow-card-hover transition-shadow`}>
                  <div className="text-xs font-bold text-text-primary mb-1">{c.role}</div>
                  <div className="text-xs text-text-muted">{c.email}</div>
                  <div className="text-xs text-text-muted">{c.password}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-text-muted">
        FarmGrid — Agricultural Resource Coordination Platform · Built for hackathon
      </footer>
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<HomePage />} />

        {/* Farmer Auth */}
        <Route path="/farmer/login" element={<LoginPage role="farmer" />} />
        <Route path="/farmer/register" element={<RegisterPage role="farmer" />} />

        {/* Farmer Portal */}
        <Route path="/farmer/dashboard" element={<ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>} />
        <Route path="/farmer/request" element={<ProtectedRoute role="farmer"><RequestForm /></ProtectedRoute>} />
        <Route path="/farmer/requests" element={<ProtectedRoute role="farmer"><MyRequests /></ProtectedRoute>} />
        <Route path="/farmer/schedule" element={<ProtectedRoute role="farmer"><FarmerSchedule /></ProtectedRoute>} />
        <Route path="/farmer/profile" element={<ProtectedRoute role="farmer"><FarmerProfile /></ProtectedRoute>} />

        {/* Provider Auth */}
        <Route path="/provider/login" element={<LoginPage role="provider" />} />
        <Route path="/provider/register" element={<RegisterPage role="provider" />} />

        {/* Provider Portal */}
        <Route path="/provider/dashboard" element={<ProtectedRoute role="provider"><ProviderDashboard /></ProtectedRoute>} />
        <Route path="/provider/resources" element={<ProtectedRoute role="provider"><ResourceManagement /></ProtectedRoute>} />
        <Route path="/provider/bookings" element={<ProtectedRoute role="provider"><ActiveBookings /></ProtectedRoute>} />
        <Route path="/provider/calendar" element={<ProtectedRoute role="provider"><ProviderDashboard /></ProtectedRoute>} />
        <Route path="/provider/profile" element={<ProtectedRoute role="provider"><ProviderDashboard /></ProtectedRoute>} />

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
    </BrowserRouter>
  );
}

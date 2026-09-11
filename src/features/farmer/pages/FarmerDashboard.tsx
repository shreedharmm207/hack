import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadFarmerData } from '../farmerSlice';
import { loadNotifications } from '../../shared/notificationsSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import KpiCard from '../../shared/components/KpiCard';
import StatusBadge from '../../shared/components/StatusBadge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import WeatherForecastCard from '../../shared/components/WeatherForecastCard';
import { formatDate, RESOURCE_CATEGORY_ICONS, ALLOCATION_METHOD_LABELS, CROP_STAGES } from '../../../utils/constants';

const FARMER_NAV = [
  { path: '/farmer/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/farmer/request', label: 'New Request', icon: '📝' },
  { path: '/farmer/voice-request', label: 'Voice Request', icon: '🎙️' },
  { path: '/farmer/requests', label: 'My Requests', icon: '📋' },
  { path: '/farmer/schedule', label: 'My Schedule', icon: '📅' },
  { path: '/farmer/what-if', label: 'What-If', icon: '🔮' },
  { path: '/farmer/fairness', label: 'Fairness', icon: '⚖️' },
  { path: '/farmer/profile', label: 'Profile', icon: '👤' },
];

const requestTrendData = [
  { month: 'Mar', requests: 1 }, { month: 'Apr', requests: 2 },
  { month: 'May', requests: 1 }, { month: 'Jun', requests: 3 },
  { month: 'Jul', requests: 2 }, { month: 'Aug', requests: 4 },
  { month: 'Sep', requests: 2 },
];

export default function FarmerDashboard() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { profile, requests, allocations, stats, isLoading } = useAppSelector(s => s.farmer);

  useEffect(() => {
    if (user?.id) {
      dispatch(loadFarmerData(user.id));
      dispatch(loadNotifications(user.id));
    }
  }, [user]);

  const upcomingAllocations = (allocations || []).filter(a => a.status === 'scheduled' || a.status === 'active');
  const consecutiveLosses = profile?.consecutive_losses ?? 0;

  return (
    <SidebarLayout navItems={FARMER_NAV} portalName="Farmer Portal" portalColor="bg-primary-700" logoIcon="🌾">
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back, {profile?.name || user?.email?.split('@')[0]} 🌾
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {profile ? `${profile.village || ''}, ${profile.district || ''}, ${profile.state || ''} · ${profile.farmSizeAcres || profile.farm_size_acres || 0} acres · ${profile.primaryCrop || profile.primary_crop || ''}` : 'Complete your profile to get started'}
          </p>
        </div>

        {/* PRIMARY CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/farmer/request"
            className="flex items-center gap-4 p-5 bg-primary-700 rounded-xl text-white hover:bg-primary-800 transition-all hover:shadow-lg group">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📝</div>
            <div>
              <div className="font-bold text-lg">Create Resource Request</div>
              <div className="text-white/70 text-sm">Fill a structured request form</div>
            </div>
          </Link>

          <Link to="/farmer/voice-request"
            className="flex items-center gap-4 p-5 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl text-white hover:from-teal-700 hover:to-emerald-700 transition-all hover:shadow-lg group">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform animate-pulse">🎙️</div>
            <div>
              <div className="font-bold text-lg">Tell FarmGrid What You Need</div>
              <div className="text-white/70 text-sm">Speak or type naturally — AI assistant</div>
            </div>
          </Link>
        </div>

        {/* Fairness Guard Alert */}
        {consecutiveLosses >= 3 && (
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-start gap-3">
            <span className="text-2xl">⚖️</span>
            <div className="flex-1">
              <div className="font-semibold text-amber-800">Fairness Guard Active</div>
              <div className="text-sm text-amber-700 mt-1">
                You've had {consecutiveLosses} consecutive unsuccessful allocations. FarmGrid is increasing your waiting-time priority score within the official 15-point limit.
              </div>
            </div>
            <Link to="/farmer/fairness" className="btn-sm bg-amber-500 text-white hover:bg-amber-600 flex-shrink-0">View →</Link>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Scheduled" value={stats?.scheduledRequests ?? 0} icon="✅" color="success" />
          <KpiCard title="Waitlisted" value={stats?.waitlistedRequests ?? 0} icon="⏳" color="warning" />
          <KpiCard title="Active" value={stats?.activeRequests ?? 0} icon="📤" color="info" />
          <KpiCard title="Completed" value={stats?.completedRequests ?? 0} icon="🚜" color="primary" />
        </div>

        {/* ML Weather Forecast & Advisory Engine */}
        <WeatherForecastCard
          cropStage={(profile?.cropStage || profile?.crop_stage || 'harvesting') as any}
          lat={profile?.lat || 12.5222}
          lng={profile?.lng || 76.8978}
        />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Request history chart */}
          <div className="lg:col-span-2 card p-5">
            <div className="section-header">
              <h2 className="section-title">Request History</h2>
              <span className="badge badge-primary">Last 7 months</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={requestTrendData}>
                <defs>
                  <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F766E" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Area type="monotone" dataKey="requests" stroke="#0F766E" strokeWidth={2} fill="url(#rGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Crop info */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Farm Details</h2>
            {profile ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Crop Type</span>
                  <span className="font-medium">{profile.primaryCrop || profile.primary_crop || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Crop Stage</span>
                  <span className="badge badge-primary">{CROP_STAGES[(profile.cropStage || profile.crop_stage || 'sowing') as keyof typeof CROP_STAGES] || profile.cropStage || profile.crop_stage || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Farm Size</span>
                  <span className="font-medium">{profile.farmSizeAcres || profile.farm_size_acres || 0} acres</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Location</span>
                  <span className="font-medium text-right max-w-32">{profile.village}, {profile.district}</span>
                </div>
                <div className="pt-2 border-t border-border space-y-2">
                  <Link to="/farmer/profile" className="btn btn-sm btn-secondary w-full">Edit Profile</Link>
                  <Link to="/farmer/what-if" className="btn btn-sm bg-purple-50 text-purple-700 border border-purple-200 w-full hover:bg-purple-100">
                    🔮 Explore What-If
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-text-muted mb-3">Complete your profile</p>
                <Link to="/farmer/profile" className="btn-primary btn-sm">Set up Profile</Link>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming allocations */}
        <div className="card p-5">
          <div className="section-header">
            <h2 className="section-title">✅ My Allocated Resources</h2>
            <Link to="/farmer/schedule" className="text-sm text-primary-700 hover:underline font-medium">View Schedule →</Link>
          </div>
          {upcomingAllocations.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-sm">No upcoming allocations. Submit a request to get started.</p>
              <Link to="/farmer/request" className="btn-primary btn-sm mt-3 inline-block">Submit Request</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAllocations.map(a => (
                <div key={a.id} className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🚜</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary">{a.resourceName}</div>
                    <div className="text-xs text-text-muted">{a.providerName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {a.allocationMethod && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ALLOCATION_METHOD_LABELS[a.allocationMethod]?.color === 'badge-success' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {ALLOCATION_METHOD_LABELS[a.allocationMethod]?.label || a.allocationMethod}
                        </span>
                      )}
                      <span className="text-xs font-bold text-primary-700">{a.priorityScore || a.priority_score || 0}/100</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-medium text-text-primary">{formatDate(a.scheduledStart || a.scheduled_start || '')}</div>
                    <div className="text-xs text-text-muted">to {formatDate(a.scheduledEnd || a.scheduled_end || '')}</div>
                  </div>
                  <StatusBadge status={a.status} type="allocation" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent requests */}
        <div className="card p-5">
          <div className="section-header">
            <h2 className="section-title">Recent Requests</h2>
            <Link to="/farmer/requests" className="text-sm text-primary-700 hover:underline font-medium">View All →</Link>
          </div>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm">No requests yet.</p>
              <Link to="/farmer/request" className="btn-primary btn-sm mt-3 inline-block">Submit First Request</Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Needed By</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 4).map(req => {
                  const score = req.priorityScore ?? req.priority_score;
                  const resType = req.resourceType || req.resource_type || 'tractors';
                  const resNeeded = req.resourceNeeded || req.resource_needed || '';
                  return (
                    <tr key={req.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span>{RESOURCE_CATEGORY_ICONS[resType as keyof typeof RESOURCE_CATEGORY_ICONS] || '🚜'}</span>
                          <span className="font-medium">{resNeeded.slice(0, 35)}</span>
                        </div>
                      </td>
                      <td className="text-text-muted">{formatDate(req.latestEnd || req.latest_end || '')}</td>
                      <td className="text-text-muted">{req.durationDays || req.duration_days || 1}d</td>
                      <td><StatusBadge status={req.status} /></td>
                      <td>
                        {score ? (
                          <span className={`font-bold text-sm ${score >= 70 ? 'text-danger' : score >= 50 ? 'text-warning' : 'text-text-muted'}`}>
                            {score}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

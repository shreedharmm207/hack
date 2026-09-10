import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadFarmerData } from '../farmerSlice';
import { loadNotifications } from '../../shared/notificationsSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import KpiCard from '../../shared/components/KpiCard';
import StatusBadge from '../../shared/components/StatusBadge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { formatDate, RESOURCE_CATEGORY_ICONS, CROP_STAGES } from '../../../utils/constants';
import { MOCK_ALLOCATIONS } from '../../../services/mockData';

const FARMER_NAV = [
  { path: '/farmer/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/farmer/request', label: 'New Request', icon: '📝' },
  { path: '/farmer/requests', label: 'My Requests', icon: '📋' },
  { path: '/farmer/schedule', label: 'My Schedule', icon: '📅' },
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
  const { profile, requests, stats, isLoading } = useAppSelector(s => s.farmer);

  useEffect(() => {
    if (user?.id) {
      dispatch(loadFarmerData(user.id));
      dispatch(loadNotifications(user.id));
    }
  }, [user]);

  const myAllocations = MOCK_ALLOCATIONS.filter(a => profile && a.farmerId === profile.id);
  const upcomingAllocations = myAllocations.filter(a => a.status === 'scheduled');

  return (
    <SidebarLayout navItems={FARMER_NAV} portalName="Farmer Portal" portalColor="bg-primary-700" logoIcon="🌾">
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back, {profile?.name || user?.email?.split('@')[0]}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {profile ? `${profile.village}, ${profile.district}, ${profile.state} · ${profile.farmSize} acres · ${profile.cropType}` : 'Complete your profile to get started'}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Active Requests" value={stats?.activeRequests ?? 0} icon="📤" color="info" />
          <KpiCard title="Approved Requests" value={stats?.approvedRequests ?? 0} icon="✅" color="success" />
          <KpiCard title="Pending Review" value={stats?.pendingRequests ?? 0} icon="⏳" color="warning" />
          <KpiCard title="Resources Allocated" value={stats?.allocatedResources ?? 0} icon="🚜" color="primary" />
        </div>

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
                  <span className="font-medium">{profile.cropType || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Crop Stage</span>
                  <span className="badge badge-primary">{CROP_STAGES[profile.cropStage]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Farm Size</span>
                  <span className="font-medium">{profile.farmSize} acres</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Location</span>
                  <span className="font-medium text-right max-w-32">{profile.village}, {profile.district}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <Link to="/farmer/profile" className="btn btn-sm btn-secondary w-full">Edit Profile</Link>
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
            <h2 className="section-title">Upcoming Resource Allocations</h2>
            <Link to="/farmer/schedule" className="text-sm text-primary-700 hover:underline font-medium">View Schedule →</Link>
          </div>
          {upcomingAllocations.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-sm">No upcoming allocations. Submit a request to get started.</p>
              <Link to="/farmer/request" className="btn-primary btn-sm mt-3">Submit Request</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAllocations.map(a => (
                <div key={a.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-border">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                    🚜
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary">{a.resourceName}</div>
                    <div className="text-xs text-text-muted">{a.providerName}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-medium text-text-primary">{formatDate(a.scheduledStart)}</div>
                    <div className="text-xs text-text-muted">to {formatDate(a.scheduledEnd)}</div>
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
              <Link to="/farmer/request" className="btn-primary btn-sm mt-3">Submit First Request</Link>
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
                {requests.slice(0, 4).map(req => (
                  <tr key={req.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{RESOURCE_CATEGORY_ICONS[req.resourceType]}</span>
                        <span className="font-medium">{req.resourceNeeded}</span>
                      </div>
                    </td>
                    <td className="text-text-muted">{formatDate(req.latestEnd)}</td>
                    <td className="text-text-muted">{req.durationDays}d</td>
                    <td><StatusBadge status={req.status} /></td>
                    <td>
                      {req.priorityScore ? (
                        <span className={`font-bold text-sm ${req.priorityScore >= 70 ? 'text-danger' : req.priorityScore >= 50 ? 'text-warning' : 'text-text-muted'}`}>
                          {req.priorityScore}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

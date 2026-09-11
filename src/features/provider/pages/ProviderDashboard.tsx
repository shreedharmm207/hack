import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadProviderData } from '../providerSlice';
import { loadNotifications } from '../../shared/notificationsSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import KpiCard from '../../shared/components/KpiCard';
import StatusBadge from '../../shared/components/StatusBadge';
import { formatDate, RESOURCE_STATUS_LABELS, RESOURCE_CATEGORY_ICONS } from '../../../utils/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const PROVIDER_NAV = [
  { path: '/provider/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/provider/resources', label: 'My Resources', icon: '🚜' },
  { path: '/provider/bookings', label: 'Active Bookings', icon: '📋' },
  { path: '/provider/calendar', label: 'Schedule Calendar', icon: '📅' },
  { path: '/provider/profile', label: 'Profile', icon: '🏭' },
];

const utilizationData = [
  { name: 'Mon', utilized: 3, available: 5 },
  { name: 'Tue', utilized: 4, available: 5 },
  { name: 'Wed', utilized: 2, available: 5 },
  { name: 'Thu', utilized: 5, available: 5 },
  { name: 'Fri', utilized: 3, available: 5 },
  { name: 'Sat', utilized: 4, available: 5 },
  { name: 'Sun', utilized: 1, available: 5 },
];

const PIE_COLORS = ['#0F766E', '#14B8A6', '#22C55E', '#E2E8F0', '#F59E0B'];

export default function ProviderDashboard() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { profile, resources, allocations, requests, stats, isLoading } = useAppSelector(s => s.provider);

  useEffect(() => {
    if (user?.id) {
      dispatch(loadProviderData(user.id));
      dispatch(loadNotifications(user.id));
    }
  }, [user]);

  const categoryBreakdown = resources.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(categoryBreakdown).map(([k, v]) => ({
    name: k.replace('_', ' '),
    value: v,
  }));

  return (
    <SidebarLayout navItems={PROVIDER_NAV} portalName="Provider Portal" portalColor="bg-teal-600" logoIcon="🏭">
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {profile?.orgName || 'Provider Dashboard'}
          </h1>
          {profile && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-text-muted text-sm">{profile.operationalRegion}</p>
              <span className={`badge ${profile.isApproved ? 'badge-success' : 'badge-warning'}`}>
                {profile.isApproved ? '✓ Approved' : '⏳ Pending Approval'}
              </span>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Total Resources" value={stats?.totalResources ?? 0} icon="🚜" color="primary" />
          <KpiCard title="Active Bookings" value={stats?.activeBookings ?? 0} icon="📋" color="info" />
          <KpiCard title="Upcoming Jobs" value={stats?.upcomingJobs ?? 0} icon="📅" color="success" />
          <KpiCard title="Utilization Rate" value={`${stats?.utilizationRate ?? 0}%`} icon="📈" color="warning" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weekly utilization */}
          <div className="card p-5">
            <div className="section-header">
              <h2 className="section-title">Weekly Resource Utilization</h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="utilized" fill="#0F766E" radius={[4, 4, 0, 0]} name="Utilized" />
                <Bar dataKey="available" fill="#E2E8F0" radius={[4, 4, 0, 0]} name="Available" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Resource categories pie */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Resource Categories</h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-text-muted text-sm">No resources yet</div>
            )}
          </div>
        </div>

        {/* Resources table */}
        <div className="card p-5">
          <div className="section-header">
            <h2 className="section-title">My Resources</h2>
            <Link to="/provider/resources" className="btn-primary btn-sm">+ Add Resource</Link>
          </div>
          {resources.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <div className="text-4xl mb-3">🚜</div>
              <p className="text-sm mb-3">No resources added yet</p>
              <Link to="/provider/resources" className="btn-primary btn-sm">Add Your First Resource</Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Daily Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {resources.slice(0, 5).map(r => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.name}</td>
                    <td>
                      <span className="flex items-center gap-1.5">
                        <span>{RESOURCE_CATEGORY_ICONS[r.category as keyof typeof RESOURCE_CATEGORY_ICONS] || '📦'}</span>
                        <span className="text-text-muted capitalize">{r.category.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td>{r.quantity}</td>
                    <td>{r.dailyRate ? `₹${r.dailyRate.toLocaleString()}` : '—'}</td>
                    <td>
                      <StatusBadge
                        status={r.status}
                        type="custom"
                        label={RESOURCE_STATUS_LABELS[r.status as keyof typeof RESOURCE_STATUS_LABELS] || r.status}
                        customClass={r.status === 'available' ? 'badge badge-success' : r.status === 'maintenance' ? 'badge badge-warning' : r.status === 'allocated' ? 'badge badge-info' : 'badge badge-neutral'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Requests / Resource Usage */}
        <div className="card p-5">
          <div className="section-header">
            <div>
              <h2 className="section-title">📋 Requests / Resource Usage</h2>
              <p className="text-xs text-text-muted mt-0.5">Incoming farmer resource requests for your organization</p>
            </div>
            <span className="badge badge-primary">{requests.length} Request{requests.length !== 1 ? 's' : ''}</span>
          </div>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm">No incoming requests yet</p>
              <p className="text-xs mt-1">When farmers request your resources, they will appear here automatically.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Resource</th>
                  <th>Required Date / Window</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => {
                  const farmerName = req.farmerName || req.farmer?.name || 'Farmer';
                  const resName = req.resourceName || req.resource?.name || req.resource_needed || req.resource_type || 'Tractor';
                  const startDate = formatDate(req.earliest_start || req.earliestStart || req.created_at || '');
                  const endDate = formatDate(req.latest_end || req.latestEnd || '');
                  const score = req.priorityScore ?? req.priority_score;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="font-semibold text-text-primary">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold">
                            {farmerName[0]}
                          </span>
                          <div>
                            <div>{farmerName}</div>
                            {req.farmer?.village && (
                              <div className="text-xs text-text-muted font-normal">{req.farmer.village}, {req.farmer.district}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-text-primary">{resName}</div>
                        <div className="text-xs text-text-muted capitalize">{(req.resource_type || req.resourceType || '').replace('_', ' ')} · {req.duration_days || req.durationDays || 1} day(s)</div>
                      </td>
                      <td className="text-xs text-text-muted">
                        <div className="font-medium text-text-primary">{startDate}</div>
                        <div>to {endDate}</div>
                      </td>
                      <td>
                        {score !== undefined && score !== null ? (
                          <span className="font-bold text-primary-700">{score}/100</span>
                        ) : '—'}
                      </td>
                      <td>
                        <StatusBadge status={req.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent allocations */}
        <div className="card p-5">
          <div className="section-header">
            <h2 className="section-title">Recent Allocations</h2>
            <Link to="/provider/bookings" className="text-sm text-primary-700 hover:underline">View All</Link>
          </div>
          {allocations.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-sm">No allocations yet</div>
          ) : (
            <div className="space-y-3">
              {allocations.map(a => (
                <div key={a.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-border">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{a.farmerName || a.farmer?.name || 'Farmer'}</div>
                    <div className="text-xs text-text-muted">{a.resourceName || a.resource?.name || 'Resource'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs">{formatDate(a.scheduledStart || a.scheduled_start || '')} → {formatDate(a.scheduledEnd || a.scheduled_end || '')}</div>
                    <StatusBadge status={a.status} type="allocation" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

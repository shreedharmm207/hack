import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadAdminData } from '../adminSlice';
import { loadNotifications } from '../../shared/notificationsSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import KpiCard from '../../shared/components/KpiCard';
import StatusBadge from '../../shared/components/StatusBadge';
import { formatDateTime, timeAgo, RESOURCE_CATEGORY_ICONS } from '../../../utils/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { MOCK_AUDIT_LOGS } from '../../../services/mockData';

const ADMIN_NAV = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/conflicts', label: 'Conflict Queue', icon: '⚠️' },
  { path: '/admin/allocations', label: 'Allocations', icon: '🔗' },
  { path: '/admin/users', label: 'User Management', icon: '👥' },
  { path: '/admin/resources', label: 'Resources', icon: '🚜' },
  { path: '/admin/audit', label: 'Audit Log', icon: '📋' },
];

const activityData = [
  { day: 'Mon', requests: 4, allocations: 2, conflicts: 1 },
  { day: 'Tue', requests: 6, allocations: 4, conflicts: 0 },
  { day: 'Wed', requests: 3, allocations: 3, conflicts: 2 },
  { day: 'Thu', requests: 8, allocations: 5, conflicts: 1 },
  { day: 'Fri', requests: 5, allocations: 4, conflicts: 0 },
  { day: 'Sat', requests: 2, allocations: 1, conflicts: 0 },
  { day: 'Sun', requests: 3, allocations: 2, conflicts: 1 },
];

const utilizationHeatmapData = [
  { resource: 'Tractors', Mon: 80, Tue: 90, Wed: 60, Thu: 100, Fri: 70, Sat: 50, Sun: 30 },
  { resource: 'Harvesters', Mon: 40, Tue: 60, Wed: 100, Thu: 80, Fri: 90, Sat: 20, Sun: 10 },
  { resource: 'Pumps', Mon: 70, Tue: 50, Wed: 80, Thu: 60, Fri: 40, Sat: 90, Sun: 50 },
  { resource: 'Drones', Mon: 30, Tue: 40, Wed: 70, Thu: 50, Fri: 60, Sat: 80, Sun: 20 },
];

function HeatCell({ value }: { value: number }) {
  const alpha = value / 100;
  const bg = value >= 80 ? 'bg-red-200 text-red-800' :
             value >= 60 ? 'bg-amber-100 text-amber-800' :
             value >= 40 ? 'bg-teal-100 text-teal-800' :
             'bg-slate-100 text-slate-500';
  return (
    <td className="px-2 py-2 text-center">
      <span className={`text-xs font-medium px-2 py-1 rounded ${bg}`}>{value}%</span>
    </td>
  );
}

export default function AdminDashboard() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { stats, conflicts, requests, isLoading } = useAppSelector(s => s.admin);

  useEffect(() => {
    if (user?.id) {
      dispatch(loadAdminData());
      dispatch(loadNotifications(user.id));
    }
  }, [user]);

  const openConflicts = conflicts.filter(c => c.status === 'open');
  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'processing');

  return (
    <SidebarLayout navItems={ADMIN_NAV} portalName="Admin Portal" portalColor="bg-slate-800" logoIcon="⚙️">
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Platform Overview</h1>
            <p className="text-text-muted text-sm mt-1">Real-time agricultural resource coordination dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-dot-online" />
            <span className="text-xs text-text-muted">Live</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <KpiCard title="Farmers" value={stats?.totalFarmers ?? 0} icon="🌾" color="success" />
          <KpiCard title="Providers" value={stats?.totalProviders ?? 0} icon="🏭" color="info" />
          <KpiCard title="Resources" value={stats?.totalResources ?? 0} icon="🚜" color="primary" />
          <KpiCard title="Pending" value={stats?.pendingRequests ?? 0} icon="⏳" color="warning" />
          <KpiCard title="Active Alloc." value={stats?.activeAllocations ?? 0} icon="🔗" color="success" />
          <KpiCard title="Conflicts" value={stats?.openConflicts ?? 0} icon="⚠️" color="danger" />
          <KpiCard title="Resolved" value={stats?.resolvedToday ?? 0} icon="✅" color="neutral" subtitle="Today" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Activity chart */}
          <div className="card p-5">
            <div className="section-header">
              <h2 className="section-title">Platform Activity (7 days)</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="requests" name="Requests" fill="#14B8A6" radius={[3,3,0,0]} />
                <Bar dataKey="allocations" name="Allocations" fill="#22C55E" radius={[3,3,0,0]} />
                <Bar dataKey="conflicts" name="Conflicts" fill="#DC2626" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Live conflict table */}
          <div className="card p-5">
            <div className="section-header">
              <h2 className="section-title">🔴 Live Conflict Queue</h2>
              <Link to="/admin/conflicts" className="btn-sm btn-danger">View All</Link>
            </div>
            {openConflicts.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm">No open conflicts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openConflicts.slice(0, 3).map(c => (
                  <div key={c.id} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold text-text-primary">{c.resourceName}</span>
                        <span className="badge badge-danger ml-2">Score Δ {c.scoreDelta.toFixed(0)}</span>
                      </div>
                      <Link to="/admin/conflicts" className="text-xs text-primary-700 hover:underline">Resolve →</Link>
                    </div>
                    <div className="space-y-1">
                      {c.rankedRequests.map((r, i) => (
                        <div key={r.requestId} className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">
                            #{i+1} {r.farmerName}
                          </span>
                          <span className="font-bold text-primary-700">{r.priorityScore}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resource utilization heatmap */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Resource Utilization Heatmap (This Week)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-2 py-2 text-xs text-text-muted font-medium">Resource</th>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <th key={d} className="text-center px-2 py-2 text-xs text-text-muted font-medium">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {utilizationHeatmapData.map(row => (
                  <tr key={row.resource} className="border-t border-border">
                    <td className="px-2 py-2 font-medium text-text-primary text-sm">{row.resource}</td>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                      <HeatCell key={d} value={row[d as keyof typeof row] as number} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> High ≥80%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block" /> Medium 60–79%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-100 inline-block" /> Normal 40–59%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 inline-block" /> Low &lt;40%</span>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="card p-5">
          <div className="section-header">
            <h2 className="section-title">Activity Feed</h2>
            <Link to="/admin/audit" className="text-sm text-primary-700 hover:underline">View Audit Log →</Link>
          </div>
          <div className="space-y-3">
            {MOCK_AUDIT_LOGS.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">
                  {log.action.includes('ALLOC') ? '🔗' : log.action.includes('CONFLICT') ? '⚠️' : log.action.includes('PROVIDER') ? '🏭' : '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary">{log.details}</div>
                  <div className="text-xs text-text-muted mt-0.5">{log.adminName} · {timeAgo(log.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

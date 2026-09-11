import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadAdminData } from '../adminSlice';
import { loadNotifications } from '../../shared/notificationsSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import KpiCard from '../../shared/components/KpiCard';
import StatusBadge from '../../shared/components/StatusBadge';
import { formatDateTime, timeAgo, ALLOCATION_METHOD_LABELS } from '../../../utils/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { MOCK_AUDIT_LOGS, MOCK_REQUESTS, MOCK_FARMERS } from '../../../services/mockData';

const ADMIN_NAV = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/conflicts', label: 'Conflict Queue', icon: '⚠️' },
  { path: '/admin/allocations', label: 'Allocations', icon: '🔗' },
  { path: '/admin/users', label: 'User Management', icon: '👥' },
  { path: '/admin/resources', label: 'Resources', icon: '🚜' },
  { path: '/admin/audit', label: 'Audit Log', icon: '📋' },
];

const activityData = [
  { day: 'Mon', auto: 4, manual: 0, conflicts: 1 },
  { day: 'Tue', auto: 6, manual: 0, conflicts: 0 },
  { day: 'Wed', auto: 3, manual: 1, conflicts: 2 },
  { day: 'Thu', auto: 8, manual: 0, conflicts: 1 },
  { day: 'Fri', auto: 5, manual: 0, conflicts: 0 },
  { day: 'Sat', auto: 2, manual: 0, conflicts: 0 },
  { day: 'Sun', auto: 3, manual: 0, conflicts: 1 },
];

function AutomationHealthCard({ rate, manual, waiting }: { rate: number; manual: number; waiting: number }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚡</span>
        <h2 className="section-title">Automation Health</h2>
        <span className={`ml-auto text-xs font-bold px-2 py-1 rounded-full ${rate >= 90 ? 'bg-green-50 text-green-700' : rate >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
          {rate}% Auto
        </span>
      </div>

      {/* Radial-style progress */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-28 h-28">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#E2E8F0" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none"
              stroke={rate >= 90 ? '#22C55E' : rate >= 70 ? '#F59E0B' : '#DC2626'}
              strokeWidth="3"
              strokeDasharray={`${(rate / 100) * 94.2} 94.2`}
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-text-primary">{rate}%</span>
            <span className="text-xs text-text-muted">Automated</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-green-700">{MOCK_REQUESTS.filter(r => r.status === 'scheduled' && r.allocationMethod === 'auto').length}</div>
          <div className="text-xs text-text-muted">Auto-Scheduled</div>
        </div>
        <div className="p-2 bg-amber-50 rounded-lg">
          <div className="text-lg font-bold text-amber-700">{waiting}</div>
          <div className="text-xs text-text-muted">Waitlisted</div>
        </div>
        <div className="p-2 bg-red-50 rounded-lg">
          <div className="text-lg font-bold text-red-700">{manual}</div>
          <div className="text-xs text-text-muted">Manual Review</div>
        </div>
      </div>

      {manual === 0 && (
        <div className="mt-3 p-2 bg-green-50 border border-green-100 rounded text-xs text-green-700 text-center font-medium">
          ✅ No manual intervention required today
        </div>
      )}
      {manual > 0 && (
        <Link to="/admin/conflicts" className="mt-3 block p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 text-center font-semibold hover:bg-red-100 transition-colors">
          ⚠️ {manual} request{manual > 1 ? 's' : ''} need manual review →
        </Link>
      )}
    </div>
  );
}

function FairnessMonitorCard() {
  const highRiskFarmers = MOCK_FARMERS.filter(f => (f.consecutiveLosses || 0) >= 4);
  const medRiskFarmers = MOCK_FARMERS.filter(f => (f.consecutiveLosses || 0) >= 2 && (f.consecutiveLosses || 0) < 4);
  const longestWaiting = MOCK_REQUESTS
    .filter(r => r.status === 'waitlisted')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚖️</span>
        <h2 className="section-title">Fairness Monitor</h2>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted flex items-center gap-1">🚨 High Starvation Risk</span>
          <span className={`font-bold ${highRiskFarmers.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {highRiskFarmers.length} farmer{highRiskFarmers.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted flex items-center gap-1">⚠️ Medium Risk</span>
          <span className={`font-bold ${medRiskFarmers.length > 0 ? 'text-amber-600' : 'text-text-muted'}`}>
            {medRiskFarmers.length} farmer{medRiskFarmers.length !== 1 ? 's' : ''}
          </span>
        </div>
        {longestWaiting && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs">
            <div className="font-semibold text-amber-700">Longest Waiting Request</div>
            <div className="text-text-muted mt-1">{longestWaiting.farmerName} — {longestWaiting.resourceType} — {timeAgo(longestWaiting.createdAt)}</div>
          </div>
        )}
        {highRiskFarmers.map(f => (
          <div key={f.id} className="p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
            ⚖️ <strong>{f.name}</strong>: {f.consecutiveLosses} consecutive losses
          </div>
        ))}
      </div>
    </div>
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
  const manualReviewRequests = requests.filter(r => r.status === 'manual_review');
  const autoResolved = conflicts.filter(c => c.autoResolved);

  return (
    <SidebarLayout navItems={ADMIN_NAV} portalName="Admin Portal" portalColor="bg-slate-800" logoIcon="⚙️">
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Platform Overview</h1>
            <p className="text-text-muted text-sm mt-1">FarmGrid automatic resource coordination — monitor, don't operate</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-text-muted">Engine Active</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <KpiCard title="Farmers" value={stats?.totalFarmers ?? 0} icon="🌾" color="success" />
          <KpiCard title="Providers" value={stats?.totalProviders ?? 0} icon="🏭" color="info" />
          <KpiCard title="Resources" value={stats?.totalResources ?? 0} icon="🚜" color="primary" />
          <KpiCard title="Auto-Scheduled" value={stats?.autoAllocated ?? 0} icon="⚡" color="success" />
          <KpiCard title="Waitlisted" value={stats?.waitlisted ?? 0} icon="⏳" color="warning" />
          <KpiCard title="Open Conflicts" value={stats?.openConflicts ?? 0} icon="⚠️" color="danger" />
          <KpiCard title="Manual Review" value={stats?.manualReview ?? 0} icon="👤" color="danger" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Automation Health */}
          <AutomationHealthCard
            rate={stats?.autoResolutionRate ?? 100}
            manual={stats?.manualReview ?? 0}
            waiting={stats?.waitlisted ?? 0}
          />

          {/* Fairness Monitor */}
          <FairnessMonitorCard />

          {/* Auto-resolved conflicts */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">✅</span>
              <h2 className="section-title">Auto-Resolved Conflicts</h2>
            </div>
            {autoResolved.length === 0 ? (
              <div className="text-center py-6 text-text-muted">
                <div className="text-3xl mb-2">🕊️</div>
                <p className="text-sm">No conflicts yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {autoResolved.slice(0, 3).map(c => (
                  <div key={c.id} className="p-3 bg-green-50 border border-green-100 rounded-lg text-xs">
                    <div className="font-semibold text-text-primary">{c.resourceName || c.resource?.name}</div>
                    <div className="text-text-muted">{(c.rankedRequests || []).length} competing requests · Score Δ {(c.scoreDelta ?? c.score_delta ?? 0).toFixed(0)}</div>
                    <div className="text-green-700 font-medium mt-1">⚡ Auto-resolved by {c.resolution === 'auto_fcfs' ? 'FCFS' : 'Priority'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Manual Review Queue — only if needed */}
        {manualReviewRequests.length > 0 && (
          <div className="card p-5 border-2 border-red-200">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="section-title text-red-700">⚠️ Manual Review Required ({manualReviewRequests.length})</h2>
            </div>
            <div className="space-y-3">
              {manualReviewRequests.map(req => (
                <div key={req.id} className="p-4 bg-red-50 border border-red-100 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold">{req.farmerName || req.farmer?.name || 'Farmer'} — {(req.resourceType || req.resource_type || '').toUpperCase()}</div>
                      <div className="text-xs text-text-muted mt-1">{req.manualReviewReason || req.manual_review_reason || 'Manual review required'}</div>
                    </div>
                    <Link to="/admin/allocations" className="btn-sm bg-red-600 text-white hover:bg-red-700 text-xs">Review →</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Platform Requests — Single Source of Truth */}
        <div className="card p-5">
          <div className="section-header">
            <div>
              <h2 className="section-title">📋 Platform Resource Requests</h2>
              <p className="text-xs text-text-muted mt-0.5">Real-time database records across all farmers and organizations</p>
            </div>
            <span className="badge badge-primary">{requests.length} Total</span>
          </div>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm">No requests submitted yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Organization</th>
                    <th>Resource</th>
                    <th>Requested Date / Window</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => {
                    const farmerName = req.farmerName || req.farmer?.name || 'Farmer';
                    const orgName = req.organization?.org_name || 'Kaveri Agri Cooperative';
                    const resName = req.resource?.name || req.resourceName || req.resource_needed || req.resource_type || 'Tractor';
                    const reqDate = req.created_at ? formatDateTime(req.created_at) : '—';
                    const score = req.priorityScore ?? req.priority_score;

                    return (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="font-semibold text-text-primary">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                              🌾
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
                          <div className="font-medium text-text-primary flex items-center gap-1.5">
                            <span>🏭</span>
                            <span>{orgName}</span>
                          </div>
                        </td>
                        <td>
                          <div className="font-medium text-text-primary">{resName}</div>
                          <div className="text-xs text-text-muted capitalize">{(req.resource_type || req.resourceType || '').replace('_', ' ')}</div>
                        </td>
                        <td className="text-xs text-text-muted">
                          <div className="font-medium text-text-primary">{reqDate}</div>
                          <div>Window: {req.earliest_start ? req.earliest_start.split('T')[0] : '—'} to {req.latest_end ? req.latest_end.split('T')[0] : '—'}</div>
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
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Activity chart */}
          <div className="card p-5">
            <div className="section-header">
              <h2 className="section-title">Automation vs Manual (7 days)</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="auto" name="Auto-Allocated" fill="#22C55E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="manual" name="Manual Review" fill="#DC2626" radius={[3, 3, 0, 0]} />
                <Bar dataKey="conflicts" name="Conflicts" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Live conflict table */}
          <div className="card p-5">
            <div className="section-header">
              <h2 className="section-title">{openConflicts.length > 0 ? '🔴 Open Conflicts' : '✅ Conflict Queue'}</h2>
              <Link to="/admin/conflicts" className="btn-sm btn-danger">View All</Link>
            </div>
            {openConflicts.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm">No open conflicts — engine resolved {autoResolved.length} automatically</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openConflicts.slice(0, 3).map(c => (
                  <div key={c.id} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold text-text-primary">{c.resourceName || c.resource?.name}</span>
                        <span className="badge badge-danger ml-2">Score Δ {(c.scoreDelta ?? c.score_delta ?? 0).toFixed(0)}</span>
                      </div>
                      <Link to="/admin/conflicts" className="text-xs text-primary-700 hover:underline">Resolve →</Link>
                    </div>
                    <div className="space-y-1">
                      {(c.rankedRequests || []).map((r: any, i: number) => (
                        <div key={r.requestId || r.request_id || i} className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">#{i + 1} {r.farmerName || r.farmer_name}</span>
                          <span className="font-bold text-primary-700">{r.priorityScore || r.priority_score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Log */}
        <div className="card p-5">
          <div className="section-header">
            <h2 className="section-title">🔍 System Activity Log</h2>
            <Link to="/admin/audit" className="text-sm text-primary-700 hover:underline">View Full Log →</Link>
          </div>
          <div className="space-y-3">
            {MOCK_AUDIT_LOGS.slice(0, 6).map(log => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">
                  {log.action.includes('AUTO_ALLOC') ? '⚡' : log.action.includes('CONFLICT') ? '⚠️' : log.action.includes('FAIRNESS') ? '⚖️' : log.action.includes('PROVIDER') ? '🏭' : '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary">{log.details}</div>
                  <div className="text-xs text-text-muted mt-0.5">{log.adminName} · {timeAgo(log.createdAt)}</div>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono flex-shrink-0">{log.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

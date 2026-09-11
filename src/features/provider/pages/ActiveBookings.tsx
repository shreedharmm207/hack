import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadProviderData } from '../providerSlice';
import type { OrgAllocation } from '../providerSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import StatusBadge from '../../shared/components/StatusBadge';
import AllocationReasoningModal from '../../shared/components/AllocationReasoningModal';
import { formatDate } from '../../../utils/constants';

const PROVIDER_NAV = [
  { path: '/provider/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/provider/resources', label: 'My Resources', icon: '🚜' },
  { path: '/provider/bookings', label: 'Active Bookings', icon: '📋' },
  { path: '/provider/calendar', label: 'Schedule Calendar', icon: '📅' },
  { path: '/provider/profile', label: 'Profile', icon: '🏭' },
];

// ─── Allocation method badge ──────────────────────────────────────────────────
const METHOD_BADGE: Record<string, { label: string; cls: string }> = {
  auto:              { label: '🤖 Auto',       cls: 'bg-emerald-100 text-emerald-700' },
  auto_alternative:  { label: '🔄 Alternative', cls: 'bg-teal-100 text-teal-700' },
  fcfs_tiebreak:     { label: '⚖️ FCFS',        cls: 'bg-blue-100 text-blue-700' },
  conflict_resolved: { label: '🛡️ Resolved',   cls: 'bg-amber-100 text-amber-700' },
  admin_override:    { label: '👤 Override',    cls: 'bg-slate-100 text-slate-600' },
};

// ─── Priority pill ────────────────────────────────────────────────────────────
function PriorityPill({ score }: { score: number | null }) {
  const s = score ?? 0;
  const cls = s >= 85 ? 'bg-red-100 text-red-700'
    : s >= 70 ? 'bg-amber-100 text-amber-700'
    : s >= 50 ? 'bg-blue-100 text-blue-700'
    : 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>
      {s}<span className="font-normal opacity-70">/100</span>
    </span>
  );
}

// ─── BookingRow ───────────────────────────────────────────────────────────────
function BookingRow({
  alloc, onViewReasoning,
}: {
  alloc: OrgAllocation;
  onViewReasoning: (a: OrgAllocation) => void;
}) {
  const start = alloc.scheduledStart || alloc.scheduled_start;
  const end   = alloc.scheduledEnd   || alloc.scheduled_end;
  const method = alloc.allocation_method || 'auto';
  const badge  = METHOD_BADGE[method] ?? METHOD_BADGE.auto;

  return (
    <tr className="hover:bg-slate-50/60 transition-colors group">
      <td className="font-semibold text-text-primary">
        {alloc.farmerName || alloc.farmer?.name || 'Farmer'}
        {alloc.farmer?.village && (
          <span className="block text-xs text-text-muted font-normal">{alloc.farmer.village}</span>
        )}
      </td>
      <td>
        <span className="font-medium">{alloc.resourceName || alloc.resource?.name || 'Resource'}</span>
        {alloc.resource?.category && (
          <span className="block text-xs text-text-muted capitalize">
            {alloc.resource.category.replace(/_/g, ' ')}
          </span>
        )}
      </td>
      <td className="text-text-secondary text-sm">{start ? formatDate(start) : '—'}</td>
      <td className="text-text-secondary text-sm">{end ? formatDate(end) : '—'}</td>
      <td>
        <PriorityPill score={alloc.priority_score ?? alloc.priorityScore ?? null} />
      </td>
      <td>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
          {badge.label}
        </span>
      </td>
      <td><StatusBadge status={alloc.status} type="allocation" /></td>
      <td>
        <button
          id={`view-reasoning-${alloc.id}`}
          onClick={() => onViewReasoning(alloc)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200
            transition-all hover:shadow-sm group-hover:scale-105"
          title="View AI allocation reasoning"
        >
          🔍 Reasoning
        </button>
      </td>
    </tr>
  );
}

// ─── PastBookingRow ───────────────────────────────────────────────────────────
function PastBookingRow({
  alloc, onViewReasoning,
}: {
  alloc: OrgAllocation;
  onViewReasoning: (a: OrgAllocation) => void;
}) {
  const start = alloc.scheduledStart || alloc.scheduled_start;
  const end   = alloc.scheduledEnd   || alloc.scheduled_end;

  return (
    <tr className="hover:bg-slate-50/60 transition-colors group">
      <td className="font-medium">{alloc.farmerName || alloc.farmer?.name || 'Farmer'}</td>
      <td>{alloc.resourceName || alloc.resource?.name || 'Resource'}</td>
      <td className="text-text-muted text-sm">
        {start ? formatDate(start) : '—'} → {end ? formatDate(end) : '—'}
      </td>
      <td><StatusBadge status={alloc.status} type="allocation" /></td>
      <td>
        <button
          id={`view-past-reasoning-${alloc.id}`}
          onClick={() => onViewReasoning(alloc)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
            bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          title="View AI allocation reasoning"
        >
          🔍 Reasoning
        </button>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ActiveBookings() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { allocations, isLoading } = useAppSelector(s => s.provider);

  const [selectedAlloc, setSelectedAlloc] = useState<OrgAllocation | null>(null);

  useEffect(() => {
    if (user?.id) dispatch(loadProviderData(user.id));
  }, [user]);

  const active = allocations.filter(a => a.status === 'active' || a.status === 'scheduled');
  const past   = allocations.filter(a => a.status === 'completed' || a.status === 'cancelled');

  return (
    <SidebarLayout navItems={PROVIDER_NAV} portalName="Provider Portal" portalColor="bg-teal-600" logoIcon="🏭">
      <div className="p-6 animate-fade-in">

        {/* ── Page header ── */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Active Bookings</h1>
            <p className="text-text-muted text-sm mt-1">
              Track current and upcoming resource assignments.{' '}
              <span className="text-primary-600 font-medium">
                Click 🔍 Reasoning to see how each booking was decided by the AI engine.
              </span>
            </p>
          </div>
          {isLoading && (
            <span className="text-xs text-text-muted bg-slate-100 px-3 py-1.5 rounded-full animate-pulse">
              Loading…
            </span>
          )}
        </div>

        <div className="space-y-6">

          {/* ── Active / Upcoming ── */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="section-title">Current &amp; Upcoming</h2>
              <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {active.length}
              </span>
            </div>

            {active.length === 0 ? (
              <div className="text-center py-10 text-text-muted">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-sm">No active bookings at the moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Farmer</th>
                      <th>Resource</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Priority</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map(a => (
                      <BookingRow
                        key={a.id}
                        alloc={a}
                        onViewReasoning={setSelectedAlloc}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Past Bookings ── */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="section-title">Past Bookings</h2>
              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {past.length}
              </span>
            </div>

            {past.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">No past bookings found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Farmer</th>
                      <th>Resource</th>
                      <th>Period</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {past.map(a => (
                      <PastBookingRow
                        key={a.id}
                        alloc={a}
                        onViewReasoning={setSelectedAlloc}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Allocation Reasoning Modal ── */}
      {selectedAlloc && (
        <AllocationReasoningModal
          allocation={selectedAlloc}
          onClose={() => setSelectedAlloc(null)}
        />
      )}
    </SidebarLayout>
  );
}

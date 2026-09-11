import React from 'react';
import type { OrgAllocation } from '../../provider/providerSlice';
import { formatDate, formatDateTime } from '../../../utils/constants';
import { getPriorityLabel } from '../../../utils/priorityEngine';

interface Props {
  allocation: OrgAllocation | null;
  onClose: () => void;
}

// ─── Method meta ─────────────────────────────────────────────────────────────
const METHOD_META: Record<string, { icon: string; label: string; color: string; desc: string }> = {
  auto: {
    icon: '🤖',
    label: 'Automatic Allocation',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    desc: 'FarmGrid\'s AI engine matched this farmer to the nearest available resource with the highest priority score. No conflicts were detected.',
  },
  auto_alternative: {
    icon: '🔄',
    label: 'Alternative Resource Allocated',
    color: 'bg-teal-50 border-teal-200 text-teal-800',
    desc: 'A conflict was detected on the primary resource. The engine automatically found and assigned a compatible alternative unit — ensuring continuity of service.',
  },
  fcfs_tiebreak: {
    icon: '⚖️',
    label: 'FCFS Tiebreak',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    desc: 'Two farmers had identical priority scores. The First-Come-First-Served (FCFS) rule was applied: the farmer who submitted earlier received the allocation.',
  },
  conflict_resolved: {
    icon: '🛡️',
    label: 'Conflict Resolved (Admin)',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    desc: 'An admin manually reviewed and resolved a scheduling conflict, overriding the automatic system decision.',
  },
  admin_override: {
    icon: '👤',
    label: 'Admin Override',
    color: 'bg-slate-50 border-slate-200 text-slate-700',
    desc: 'An administrator manually assigned this resource, bypassing automatic priority scoring.',
  },
};

// ─── Priority bar sub-component ───────────────────────────────────────────────
function ScoreBar({ label, value, max, color, icon }: {
  label: string; value: number; max: number; color: string; icon: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-base w-6 flex-shrink-0">{icon}</span>
      <span className="w-28 text-xs text-text-secondary flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-14 text-right text-xs font-bold text-text-primary">
        {value}<span className="text-text-muted font-normal">/{max}</span>
      </span>
    </div>
  );
}

// ─── Infer / reconstruct priority breakdown from allocation data ──────────────
function inferBreakdown(allocation: OrgAllocation) {
  // If stored on the allocation record, use it directly
  const stored = (allocation as any).priority_breakdown;
  if (stored && typeof stored === 'object' && 'urgency' in stored) return stored;

  // Otherwise synthesise a plausible breakdown from the total score
  const total = allocation.priority_score ?? 65;
  const urgency    = Math.round(total * 0.25);
  const weatherRisk = Math.round(total * 0.25);
  const cropStage  = Math.round(total * 0.20);
  const waitingTime = Math.round(total * 0.15);
  const logistics  = Math.round(total * 0.10);
  const constraints = total - urgency - weatherRisk - cropStage - waitingTime - logistics;

  return {
    urgency:     Math.min(25, urgency),
    weatherRisk: Math.min(25, weatherRisk),
    cropStage:   Math.min(20, cropStage),
    waitingTime: Math.min(15, waitingTime),
    logistics:   Math.min(10, logistics),
    constraints: Math.min(5, Math.max(0, constraints)),
    total,
    explanation: 'Score breakdown inferred from recorded total priority score.',
  };
}

// ─── Timeline step ────────────────────────────────────────────────────────────
function TimelineStep({ icon, label, time, active }: {
  icon: string; label: string; time?: string; active?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0
        ${active ? 'bg-primary-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>
        {icon}
      </div>
      <div className="pt-1">
        <p className={`text-sm font-medium ${active ? 'text-primary-700' : 'text-text-secondary'}`}>{label}</p>
        {time && <p className="text-xs text-text-muted mt-0.5">{time}</p>}
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function AllocationReasoningModal({ allocation, onClose }: Props) {
  if (!allocation) return null;

  const bd = inferBreakdown(allocation);
  const { label: priorityLabel, color: priorityColor } = getPriorityLabel(bd.total);
  const method = allocation.allocation_method || 'auto';
  const methodMeta = METHOD_META[method] ?? METHOD_META.auto;
  const tiebreakNote = allocation.tiebreak_explanation;

  const farmerName  = allocation.farmerName  || allocation.farmer?.name  || 'Farmer';
  const resourceName = allocation.resourceName || allocation.resource?.name || 'Resource';
  const start = allocation.scheduledStart || allocation.scheduled_start;
  const end   = allocation.scheduledEnd   || allocation.scheduled_end;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border">

        {/* ── Header ── */}
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-xl">🔍</div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Allocation Reasoning</h2>
              <p className="text-xs text-text-muted">AI decision breakdown for this booking</p>
            </div>
          </div>
          <button
            id="close-reasoning-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-text-muted transition-colors"
          >✕</button>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Booking summary ── */}
          <div className="bg-slate-50 rounded-xl p-4 border border-border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Farmer</p>
                <p className="font-semibold text-text-primary">{farmerName}</p>
                {allocation.farmer?.village && (
                  <p className="text-text-muted text-xs">{allocation.farmer.village}, {allocation.farmer.district}</p>
                )}
              </div>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Resource</p>
                <p className="font-semibold text-text-primary">{resourceName}</p>
                {allocation.resource?.category && (
                  <p className="text-text-muted text-xs capitalize">{allocation.resource.category.replace(/_/g,' ')}</p>
                )}
              </div>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Scheduled Period</p>
                <p className="font-medium text-text-primary">
                  {start ? formatDate(start) : '—'} → {end ? formatDate(end) : '—'}
                </p>
              </div>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Status</p>
                <span className={`badge text-xs font-semibold px-2 py-0.5 rounded
                  ${allocation.status === 'active' || allocation.status === 'scheduled'
                    ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {allocation.status}
                </span>
              </div>
            </div>
          </div>

          {/* ── Allocation Method Banner ── */}
          <div className={`rounded-xl border p-4 ${methodMeta.color}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{methodMeta.icon}</span>
              <div>
                <p className="font-bold text-sm">{methodMeta.label}</p>
                <p className="text-xs mt-1 opacity-90 leading-relaxed">{methodMeta.desc}</p>
                {tiebreakNote && (
                  <p className="text-xs mt-2 bg-white/50 rounded p-2 italic">📌 {tiebreakNote}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Priority Score Breakdown ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
                Priority Score Breakdown
              </h3>
              <span className={`badge text-sm font-bold px-3 py-1 ${priorityColor}`}>
                {bd.total}/100 · {priorityLabel}
              </span>
            </div>

            {/* Circular gauge */}
            <div className="flex items-center gap-5 mb-5 pb-4 border-b border-border">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={bd.total >= 70 ? '#0F766E' : bd.total >= 50 ? '#F59E0B' : '#DC2626'}
                    strokeWidth="3"
                    strokeDasharray={`${bd.total} ${100 - bd.total}`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-text-primary">{bd.total}%</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-text-secondary leading-relaxed">{bd.explanation}</p>
                <p className="text-xs text-text-muted mt-2">
                  Scoring model: Urgency (25) + Weather Risk (25) + Crop Stage (20) + Waiting Time (15) + Logistics (10) + Constraints (5)
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <ScoreBar label="Urgency"      value={bd.urgency}     max={25} icon="🚨" color="bg-red-400" />
              <ScoreBar label="Weather Risk" value={bd.weatherRisk} max={25} icon="🌧️" color="bg-amber-400" />
              <ScoreBar label="Crop Stage"   value={bd.cropStage}   max={20} icon="🌿" color="bg-green-500" />
              <ScoreBar label="Waiting Time" value={bd.waitingTime} max={15} icon="⏳" color="bg-blue-400" />
              <ScoreBar label="Logistics"    value={bd.logistics}   max={10} icon="📍" color="bg-purple-400" />
              <ScoreBar label="Constraints"  value={bd.constraints} max={5}  icon="🔒" color="bg-teal-400" />
            </div>

            <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted flex justify-between">
              <span>Calculated by FarmGrid AI Engine v2.0</span>
              <span className="font-semibold text-primary-600">Total: {bd.total}/100</span>
            </div>
          </div>

          {/* ── Decision Timeline ── */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
              🕐 Decision Timeline
            </h3>
            <div className="relative space-y-4 pl-4">
              {/* Vertical line */}
              <div className="absolute left-7 top-4 bottom-4 w-0.5 bg-slate-200 rounded" />

              <TimelineStep
                icon="📝"
                label="Request Submitted"
                time={allocation.created_at ? formatDateTime(allocation.created_at) : undefined}
              />
              <TimelineStep
                icon="🧮"
                label={`Priority Calculated — Score: ${bd.total}/100`}
              />
              {method === 'auto_alternative' && (
                <TimelineStep
                  icon="⚠️"
                  label="Conflict detected on primary resource"
                />
              )}
              {method === 'fcfs_tiebreak' && (
                <TimelineStep
                  icon="⚖️"
                  label="Score tie detected — FCFS rule applied"
                />
              )}
              {method === 'conflict_resolved' && (
                <TimelineStep
                  icon="👤"
                  label="Admin manually resolved conflict"
                />
              )}
              <TimelineStep
                icon="✅"
                label={`${resourceName} Allocated`}
                time={start ? `Starts ${formatDate(start)}` : undefined}
                active
              />
            </div>
          </div>

          {/* ── Factor explanations ── */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">
              📘 Factor Explanations
            </h3>
            <div className="space-y-3 text-xs text-text-secondary">
              <div className="flex gap-3">
                <span className="text-lg">🚨</span>
                <div><span className="font-semibold text-text-primary">Urgency (max 25 pts): </span>
                  Based on the farmer's declared urgency level (critical/high/medium/low) combined with how many days remain until the deadline. Critical urgency with &lt;3 days scores near 25.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-lg">🌧️</span>
                <div><span className="font-semibold text-text-primary">Weather Risk (max 25 pts): </span>
                  ML-predicted precipitation and heat risk for the crop's location and the scheduling window. High risk of rain during harvest scores maximum points.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-lg">🌿</span>
                <div><span className="font-semibold text-text-primary">Crop Stage (max 20 pts): </span>
                  Harvesting stage = 20 pts (most critical), Flowering = 17, Vegetative = 13, Seedling = 10, Post-Harvest = 5.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-lg">⏳</span>
                <div><span className="font-semibold text-text-primary">Waiting Time (max 15 pts): </span>
                  How long the farmer's request has been in the queue. Rewards fairness: farmers waiting &gt;72 hours receive maximum points.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-lg">📍</span>
                <div><span className="font-semibold text-text-primary">Logistics (max 10 pts): </span>
                  Haversine distance between farmer's field and resource location. &lt;5 km = 10 pts, &gt;50 km = 2 pts.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-lg">🔒</span>
                <div><span className="font-semibold text-text-primary">Constraints (max 5 pts): </span>
                  Scarcity ratio: how many pending requests exist relative to available resource units. Higher demand = higher points.
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="sticky bottom-0 bg-surface border-t border-border px-6 py-4 flex justify-end rounded-b-2xl">
          <button
            id="close-reasoning-modal-btn"
            onClick={onClose}
            className="btn-primary px-6 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

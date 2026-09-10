import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadAdminData, resolveConflict } from '../adminSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import { formatDate, timeAgo } from '../../../utils/constants';
import { calculatePriority } from '../../../utils/priorityEngine';
import { MOCK_REQUESTS } from '../../../services/mockData';
import type { Conflict } from '../../../types';

const ADMIN_NAV = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/conflicts', label: 'Conflict Queue', icon: '⚠️' },
  { path: '/admin/allocations', label: 'Allocations', icon: '🔗' },
  { path: '/admin/users', label: 'User Management', icon: '👥' },
  { path: '/admin/resources', label: 'Resources', icon: '🚜' },
  { path: '/admin/audit', label: 'Audit Log', icon: '📋' },
];

interface ResolveModalProps {
  conflict: Conflict;
  onClose: () => void;
}

function ResolveModal({ conflict, onClose }: ResolveModalProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const [winnerRequestId, setWinnerRequestId] = useState(conflict.rankedRequests[0]?.requestId || '');
  const [resolution, setResolution] = useState('approved_top');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResolve = async () => {
    if (!note.trim()) return;
    setIsSubmitting(true);
    await dispatch(resolveConflict({
      conflictId: conflict.id,
      resolution,
      winnerRequestId,
      adminNote: note,
      adminId: user?.id || 'admin',
      adminName: user?.email?.split('@')[0] || 'Admin',
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-text-primary">Resolve Conflict</h2>
            <p className="text-xs text-text-muted mt-0.5">Resource: {conflict.resourceName}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 text-text-muted hover:text-text-primary">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Ranked requests */}
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
              Competing Requests — Ranked by Priority
            </h3>
            <div className="space-y-3">
              {conflict.rankedRequests.map((r, i) => {
                const req = MOCK_REQUESTS.find(rq => rq.id === r.requestId);
                return (
                  <div
                    key={r.requestId}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      winnerRequestId === r.requestId
                        ? 'border-primary-700 bg-teal-50'
                        : 'border-border hover:border-slate-300 bg-white'
                    }`}
                    onClick={() => setWinnerRequestId(r.requestId)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          i === 0 ? 'bg-primary-700' : 'bg-slate-400'
                        }`}>{i + 1}</span>
                        <span className="font-semibold text-text-primary">{r.farmerName}</span>
                        {i === 0 && <span className="badge badge-primary text-xs">System Recommendation</span>}
                      </div>
                      <span className={`text-xl font-bold ${i === 0 ? 'text-primary-700' : 'text-text-muted'}`}>
                        {r.priorityScore}<span className="text-sm font-normal text-text-muted">/100</span>
                      </span>
                    </div>
                    {req && (
                      <div className="text-xs text-text-muted">
                        {req.resourceNeeded} · {formatDate(req.earliestStart)} – {formatDate(req.latestEnd)} ·{' '}
                        <span className="capitalize font-medium">{req.urgencyLevel}</span> urgency ·{' '}
                        {req.durationDays} days
                      </div>
                    )}
                    {winnerRequestId === r.requestId && (
                      <div className="mt-2 text-xs text-primary-700 font-medium">✓ Selected as winner</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="text-xs font-semibold text-amber-700">Score Difference: Δ{conflict.scoreDelta.toFixed(1)} points</div>
              <div className="text-xs text-amber-600 mt-0.5">
                {conflict.scoreDelta < 10
                  ? 'Very close scores — careful review recommended before allocating.'
                  : 'Clear priority winner identified by the scoring engine.'}
              </div>
            </div>
          </div>

          {/* Resolution type */}
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Resolution Action</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'approved_top', label: 'Approve Recommendation', desc: 'Accept system ranking', icon: '✅' },
                { value: 'override', label: 'Manual Override', desc: 'Override with selected', icon: '✏️' },
                { value: 'split', label: 'Split Schedule', desc: 'Divide the time window', icon: '✂️' },
                { value: 'alternative', label: 'Alternative Resource', desc: 'Assign a different unit', icon: '🔄' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setResolution(opt.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    resolution === opt.value
                      ? 'border-primary-700 bg-teal-50'
                      : 'border-border hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{opt.icon}</span>
                    <span className="text-sm font-semibold text-text-primary">{opt.label}</span>
                  </div>
                  <span className="text-xs text-text-muted">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Admin Note <span className="text-danger">*</span> (Required for Audit Log)</label>
            <textarea
              rows={3}
              className="field-input resize-none"
              placeholder="Document your reasoning for this resolution decision..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            {!note.trim() && <p className="field-error">Note is required for audit compliance</p>}
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <button
              onClick={handleResolve}
              className="btn-primary flex-1 btn-lg"
              disabled={isSubmitting || !note.trim()}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : 'Confirm Resolution & Record to Audit Log'}
            </button>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConflictQueue() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { conflicts } = useAppSelector(s => s.admin);
  const [selected, setSelected] = useState<Conflict | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user?.id) dispatch(loadAdminData());
  }, [user]);

  const open = conflicts.filter(c => c.status === 'open');
  const resolved = conflicts.filter(c => c.status === 'resolved');

  const handleResolveClick = (c: Conflict) => {
    setSelected(c);
    setShowModal(true);
  };

  return (
    <SidebarLayout navItems={ADMIN_NAV} portalName="Admin Portal" portalColor="bg-slate-800" logoIcon="⚙️">
      <div className="p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Conflict Resolution Queue</h1>
          <p className="text-text-muted text-sm mt-1">
            Review and resolve scheduling conflicts. Every resolution is recorded in the immutable audit log.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Open conflicts */}
          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                {open.length > 0 && <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />}
                <h2 className="section-title">Open Conflicts ({open.length})</h2>
              </div>

              {open.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-text-muted text-sm">No open conflicts. Platform running smoothly!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {open.map(c => (
                    <div
                      key={c.id}
                      className="p-4 bg-red-50 border border-red-100 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{c.resourceName}</div>
                          <div className="text-xs text-text-muted">{timeAgo(c.createdAt)}</div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <span className="badge badge-danger">Open</span>
                          {c.scoreDelta < 10 && <span className="badge badge-warning">Close Call</span>}
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-3">
                        {c.rankedRequests.map((r, i) => (
                          <div key={r.requestId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-2xs font-bold ${i === 0 ? 'bg-primary-700' : 'bg-slate-400'}`}>
                                {i + 1}
                              </span>
                              <span className="text-text-secondary">{r.farmerName}</span>
                              {i === 0 && <span className="text-primary-600 font-medium">(Recommended)</span>}
                            </div>
                            <span className="text-sm font-bold text-primary-700">{r.priorityScore}<span className="text-text-muted text-xs font-normal">/100</span></span>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-text-muted mb-3">Score difference: Δ{c.scoreDelta.toFixed(1)} pts</div>
                      <button
                        onClick={() => handleResolveClick(c)}
                        className="btn btn-sm btn-danger w-full"
                      >
                        Resolve This Conflict →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resolved */}
            {resolved.length > 0 && (
              <div className="card p-5">
                <h2 className="section-title mb-4">Resolved ({resolved.length})</h2>
                <div className="space-y-2">
                  {resolved.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                      <div>
                        <div className="text-sm font-medium text-text-primary">{c.resourceName}</div>
                        <div className="text-xs text-text-muted capitalize">
                          {c.resolution?.replace('_', ' ')} · {c.resolvedBy} · {c.resolvedAt && timeAgo(c.resolvedAt)}
                        </div>
                      </div>
                      <span className="badge badge-success">Resolved</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="card p-6">
            <h2 className="section-title mb-4">How Conflict Resolution Works</h2>
            <div className="space-y-4">
              {[
                { step: '01', title: 'Overlap Detection', desc: 'System automatically detects when multiple farmers request the same resource for overlapping time periods.' },
                { step: '02', title: 'Priority Scoring', desc: 'Each request is scored 0–100 using 6 weighted factors: urgency, weather risk, crop stage, wait time, logistics, and scarcity.' },
                { step: '03', title: 'Conflict Flagging', desc: 'When score difference < 10 points, the conflict is flagged as a "Close Call" requiring admin intervention.' },
                { step: '04', title: 'Admin Resolution', desc: 'Admin reviews the ranked list, selects a resolution type, adds a mandatory note, and confirms.' },
                { step: '05', title: 'Audit Record', desc: 'Every admin action is permanently recorded in the immutable audit log with timestamp and details.' },
              ].map(s => (
                <div key={s.step} className="flex gap-4">
                  <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 border border-teal-100">
                    {s.step}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{s.title}</div>
                    <div className="text-xs text-text-muted mt-0.5 leading-relaxed">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showModal && selected && (
        <ResolveModal
          conflict={selected}
          onClose={() => { setShowModal(false); setSelected(null); }}
        />
      )}
    </SidebarLayout>
  );
}

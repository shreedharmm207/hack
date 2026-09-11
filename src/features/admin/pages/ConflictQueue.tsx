import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadAdminData, resolveConflict } from '../adminSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import { formatDate, timeAgo } from '../../../utils/constants';
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-text-primary">Resolve Conflict</h2>
            <p className="text-xs text-text-muted mt-0.5">Resource: {conflict.resourceName}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 text-text-muted hover:text-text-primary">✕</button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
              Competing Requests — Ranked by Priority
            </h3>
            <div className="space-y-3">
              {conflict.rankedRequests.map((r, i) => {
                const req = MOCK_REQUESTS.find(rq => rq.id === r.requestId);
                return (
                  <div key={r.requestId}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      winnerRequestId === r.requestId
                        ? 'border-primary-700 bg-teal-50'
                        : 'border-border hover:border-slate-300 bg-white'
                    }`}
                    onClick={() => setWinnerRequestId(r.requestId)}>
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
                        <span className="capitalize font-medium">{req.urgencyLevel}</span> urgency · {req.durationDays} days
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
                  ? 'Very close scores — careful review recommended.'
                  : 'Clear priority winner identified by the scoring engine.'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Resolution Action</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'approved_top', label: 'Approve Recommendation', desc: 'Accept system ranking', icon: '✅' },
                { value: 'override', label: 'Manual Override', desc: 'Override with selected', icon: '✏️' },
                { value: 'split', label: 'Split Schedule', desc: 'Divide the time window', icon: '✂️' },
                { value: 'alternative', label: 'Alternative Resource', desc: 'Assign a different unit', icon: '🔄' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setResolution(opt.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    resolution === opt.value ? 'border-primary-700 bg-teal-50' : 'border-border hover:border-slate-300'
                  }`}>
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
            <textarea rows={3} className="field-input resize-none"
              placeholder="Document your reasoning for this resolution decision..."
              value={note} onChange={e => setNote(e.target.value)} />
            {!note.trim() && <p className="field-error">Note is required for audit compliance</p>}
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <button onClick={handleResolve} className="btn-primary flex-1 btn-lg"
              disabled={isSubmitting || !note.trim()}>
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
  const [selected, setSelected] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<'open' | 'auto_resolved' | 'resolved'>('open');

  useEffect(() => {
    if (user?.id) dispatch(loadAdminData());
  }, [user]);

  const open = conflicts.filter(c => c.status === 'open');
  const autoResolved = conflicts.filter(c => c.status === 'auto_resolved' || (c.status === 'resolved' && (c.autoResolved || c.auto_resolved)));
  const adminResolved = conflicts.filter(c => c.status === 'resolved' && !(c.autoResolved || c.auto_resolved));
  const autoRate = conflicts.length > 0 ? Math.round((autoResolved.length / conflicts.length) * 100) : 100;

  const displayed = tab === 'open' ? open : tab === 'auto_resolved' ? autoResolved : adminResolved;

  return (
    <SidebarLayout navItems={ADMIN_NAV} portalName="Admin Portal" portalColor="bg-slate-800" logoIcon="⚙️">
      <div className="p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Conflict Queue</h1>
          <p className="text-text-muted text-sm mt-1">
            FarmGrid auto-resolves conflicts using priority scoring + FCFS. Admin only acts on hard exceptions.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`card p-4 text-center ${open.length > 0 ? 'border-red-200' : ''}`}>
            <div className={`text-3xl font-bold mb-1 ${open.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>{open.length}</div>
            <div className="text-sm text-text-muted">Needs Admin Action</div>
          </div>
          <div className="card p-4 text-center border-green-100">
            <div className="text-3xl font-bold text-green-600 mb-1">{autoResolved.length}</div>
            <div className="text-sm text-text-muted">⚡ Auto-Resolved by Engine</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-primary-700 mb-1">{autoRate}%</div>
            <div className="text-sm text-text-muted">Auto-Resolution Rate</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {([
            { key: 'open', label: `⚠️ Open (${open.length})` },
            { key: 'auto_resolved', label: `⚡ Auto-Resolved (${autoResolved.length})` },
            { key: 'resolved', label: `✅ Admin Resolved (${adminResolved.length})` },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                tab === t.key ? 'border-primary-700 bg-teal-50 text-primary-700' : 'border-border text-text-muted hover:border-slate-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {displayed.length === 0 ? (
              <div className="card p-10 text-center text-text-muted">
                <div className="text-4xl mb-3">
                  {tab === 'open' ? '✅' : tab === 'auto_resolved' ? '⚡' : '📋'}
                </div>
                <p className="text-sm">
                  {tab === 'open' ? 'No open conflicts — engine is handling everything automatically.' :
                   tab === 'auto_resolved' ? 'No auto-resolved conflicts yet.' :
                   'No admin-resolved conflicts yet.'}
                </p>
              </div>
            ) : (
              displayed.map(c => (
                <div key={c.id} className={`card p-5 ${
                  c.status === 'open' ? 'border-red-200' :
                  c.autoResolved ? 'border-green-200' : 'border-border'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{c.resourceName || c.resource?.name}</div>
                      <div className="text-xs text-text-muted">{timeAgo(c.createdAt || c.created_at || '')}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {c.status === 'open' && <span className="badge badge-danger">Needs Action</span>}
                      {(c.autoResolved || c.auto_resolved) && <span className="badge badge-success">⚡ Auto-Resolved</span>}
                      {c.status === 'resolved' && !(c.autoResolved || c.auto_resolved) && <span className="badge badge-primary">Admin Resolved</span>}
                      {(c.scoreDelta ?? c.score_delta ?? 0) < 10 && <span className="badge badge-warning">Close Call</span>}
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {((c.rankedRequests || c.ranked_requests || []) as any[]).map((r, i) => (
                      <div key={r.requestId || r.request_id || i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white font-bold ${
                            (r.requestId || r.request_id) === (c.winnerRequestId || c.winner_request_id) ? 'bg-primary-700' : 'bg-slate-400'
                          }`}>{i + 1}</span>
                          <span className="text-text-secondary">{r.farmerName || r.farmer_name}</span>
                          {(r.requestId || r.request_id) === (c.winnerRequestId || c.winner_request_id) && <span className="text-primary-600 font-medium">✓ Winner</span>}
                        </div>
                        <span className="text-sm font-bold text-primary-700">
                          {r.priorityScore}<span className="text-text-muted text-xs font-normal">/100</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {(c.autoResolved || c.auto_resolved) && (
                    <div className="p-2 bg-green-50 border border-green-100 rounded text-xs text-green-700 mb-3">
                      <strong>⚡ Auto-resolved by FarmGrid Engine:</strong>{' '}
                      {c.resolution === 'auto_fcfs'
                        ? 'Equal priority scores — FCFS tiebreak applied. Earlier submission won.'
                        : `Priority-based: score delta ${(c.scoreDelta ?? c.score_delta ?? 0).toFixed(0)} pts. Higher-scoring request allocated.`}
                    </div>
                  )}

                  {(c.adminNote || c.admin_note) && !(c.autoResolved || c.auto_resolved) && (
                    <div className="p-2 bg-slate-50 rounded text-xs text-text-muted mb-3">
                      <strong>Admin note:</strong> {c.adminNote || c.admin_note}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-text-muted">
                      Score Δ {(c.scoreDelta ?? c.score_delta ?? 0).toFixed(1)} pts · {c.resolvedBy || c.resolved_by || 'Pending'}
                      {(c.resolvedAt || c.resolved_at) && ` · ${timeAgo((c.resolvedAt || c.resolved_at) ?? '')}`}
                    </div>
                    {c.status === 'open' && (
                      <button onClick={() => { setSelected(c); setShowModal(true); }}
                        className="btn btn-sm btn-danger">
                        Resolve →
                      </button>
                    )}
                    {(c.autoResolved || c.auto_resolved) && (
                      <span className="text-xs text-green-700 font-medium">Read-only — engine handled this</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Info panel */}
          <div className="card p-6">
            <h2 className="section-title mb-4">How Conflicts Are Resolved</h2>
            <div className="space-y-4">
              {[
                { step: '01', title: 'Overlap Detection', desc: 'Engine detects competing requests during submission, not after.' },
                { step: '02', title: 'Priority Scoring', desc: 'All requests scored 0–100 using 6 weighted factors. Fully deterministic.' },
                { step: '03', title: 'FCFS Tiebreak', desc: 'Equal scores? Earlier submitted request wins. No arbitrary choices.' },
                { step: '04', title: 'Auto-Resolution', desc: 'Winner auto-allocated. Losers waitlisted with full explanation.' },
                { step: '05', title: 'Admin Exceptions', desc: 'Admin only acts when no resource available or hard constraints block all candidates.' },
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

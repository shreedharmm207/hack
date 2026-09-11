import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadFarmerData } from '../farmerSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import StatusBadge from '../../shared/components/StatusBadge';
import PriorityScoreCard from '../../shared/components/PriorityScoreCard';
import { formatDate, timeAgo, RESOURCE_CATEGORY_ICONS, REQUEST_STATUS_LABELS, ALLOCATION_METHOD_LABELS } from '../../../utils/constants';

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

function RequestDetailModal({ request, onClose }: { request: any; onClose: () => void }) {
  const allocation = (request as any).allocation || null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-text-primary">Request Details</h2>
            <p className="text-xs text-text-muted">{request.id}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 text-text-muted hover:text-text-primary">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border-2 ${
            request.status === 'scheduled' ? 'bg-green-50 border-green-200' :
            request.status === 'waitlisted' ? 'bg-amber-50 border-amber-200' :
            request.status === 'manual_review' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-border'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {request.status === 'scheduled' ? '✅' : request.status === 'waitlisted' ? '⏳' : request.status === 'manual_review' ? '⚠️' : '📤'}
              </span>
              <div>
                <div className="font-bold text-text-primary">{REQUEST_STATUS_LABELS[request.status] || request.status}</div>
                {request.allocationMethod && (
                  <div className="text-xs text-text-muted mt-0.5">
                    Method: {ALLOCATION_METHOD_LABELS[request.allocationMethod]?.label || request.allocationMethod}
                    {request.fcfsTiebreak && <span className="ml-1 text-amber-600">· FCFS Tiebreak applied</span>}
                  </div>
                )}
              </div>
              {request.priorityScore && (
                <div className="ml-auto text-right">
                  <div className="text-2xl font-bold text-primary-700">{request.priorityScore}</div>
                  <div className="text-xs text-text-muted">/100</div>
                </div>
              )}
            </div>
          </div>

          {/* Allocation info */}
          {allocation && (
            <div className="p-4 bg-teal-50 border border-teal-100 rounded-lg">
              <div className="text-xs font-semibold text-primary-700 mb-2">✅ ALLOCATED RESOURCE</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-text-muted">Resource</span><span className="font-semibold">{allocation.resourceName}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">From</span><span className="font-semibold">{formatDate(allocation.scheduledStart)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">To</span><span className="font-semibold">{formatDate(allocation.scheduledEnd)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Provider</span><span className="font-semibold">{allocation.providerName}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Priority Score</span><span className="font-bold text-primary-700">{allocation.priorityScore}/100</span></div>
              </div>
              {allocation.tiebreakExplanation && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded text-xs text-amber-700">
                  {allocation.tiebreakExplanation}
                </div>
              )}
            </div>
          )}

          {/* Alternative Resource Reallocation Notice */}
          {(request.allocationMethod === 'auto_alternative' || request.allocation_method === 'auto_alternative' || (request.additional_notes && request.additional_notes.includes('Conflict detected')) || (request.additionalNotes && request.additionalNotes.includes('Conflict detected'))) && (
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="text-xs font-semibold text-teal-800 mb-1 flex items-center gap-1.5">
                <span>🔄</span> CONFLICT RESOLVED VIA ALTERNATIVE ALLOCATION
              </div>
              <p className="text-sm text-teal-800 leading-relaxed">
                A primary unit conflict occurred during your requested time window. FarmGrid's priority scoring engine evaluated all competing requests and automatically found and allocated a compatible alternative resource so your harvest schedule proceeds on time.
              </p>
            </div>
          )}

          {/* Why did I get waitlisted? */}
          {request.status === 'waitlisted' && request.waitlistReason && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-xs font-semibold text-amber-700 mb-1">⏳ WHY WAITLISTED</div>
              <p className="text-sm text-amber-800">{request.waitlistReason}</p>
              <Link to="/farmer/what-if" className="mt-2 inline-block text-xs text-primary-700 font-semibold hover:underline">
                🔮 Explore What-If Simulator →
              </Link>
            </div>
          )}

          {/* Manual review reason */}
          {request.status === 'manual_review' && request.manualReviewReason && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-xs font-semibold text-red-700 mb-1">⚠️ MANUAL REVIEW REASON</div>
              <p className="text-sm text-red-800">{request.manualReviewReason}</p>
              <p className="text-xs text-text-muted mt-1">FarmGrid admin has been notified and will review your request.</p>
            </div>
          )}

          {/* Request details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-muted">Resource Type</span>
              <span className="font-medium">
                {RESOURCE_CATEGORY_ICONS[(request.resourceType || request.resource_type || 'tractors') as keyof typeof RESOURCE_CATEGORY_ICONS] || '🚜'} {request.resourceType || request.resource_type}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-muted">What's Needed</span>
              <span className="font-medium text-right max-w-xs">{request.resourceNeeded || request.resource_needed}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-muted">Earliest Start</span>
              <span className="font-medium">{formatDate(request.earliestStart || request.earliest_start || '')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-muted">Latest End</span>
              <span className="font-medium">{formatDate(request.latestEnd || request.latest_end || '')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-muted">Duration</span>
              <span className="font-medium">{(request.durationDays || request.duration_days || 1)} day{(request.durationDays || request.duration_days || 1) > 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-muted">Crop Stage</span>
              <span className="font-medium capitalize">{(request.cropStage || request.crop_stage || '')?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-muted">Urgency</span>
              <span className="font-medium capitalize">{request.urgencyLevel || request.urgency_level}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-muted">Submitted</span>
              <span className="font-medium">{timeAgo(request.createdAt || request.created_at || '')}</span>
            </div>
          </div>

          {(request.urgencyReason || request.urgency_reason) && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-text-muted">
              <span className="font-medium text-text-primary">Urgency Reason: </span>{request.urgencyReason || request.urgency_reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyRequests() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { profile, requests, allocations, isLoading } = useAppSelector(s => s.farmer);
  const [selected, setSelected] = useState<any | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user?.id) dispatch(loadFarmerData(user.id));
  }, [user]);

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);

  const statusCounts = {
    scheduled: requests.filter(r => r.status === 'scheduled').length,
    waitlisted: requests.filter(r => r.status === 'waitlisted').length,
    manual_review: requests.filter(r => r.status === 'manual_review').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  return (
    <SidebarLayout navItems={FARMER_NAV} portalName="Farmer Portal" portalColor="bg-primary-700" logoIcon="🌾">
      <div className="p-6 animate-fade-in">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">My Requests</h1>
            <p className="text-text-muted text-sm mt-1">All resource requests and their automated allocation status</p>
          </div>
          <div className="flex gap-2">
            <Link to="/farmer/request" className="btn-secondary btn-sm">📝 New Request</Link>
            <Link to="/farmer/voice-request" className="btn-primary btn-sm">🎙️ Voice Request</Link>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { key: 'all', label: 'All', count: requests.length },
            { key: 'scheduled', label: '✅ Scheduled', count: statusCounts.scheduled },
            { key: 'waitlisted', label: '⏳ Waitlisted', count: statusCounts.waitlisted },
            { key: 'manual_review', label: '⚠️ Manual Review', count: statusCounts.manual_review },
            { key: 'completed', label: 'Completed', count: statusCounts.completed },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                filter === tab.key ? 'border-primary-700 bg-teal-50 text-primary-700' : 'border-border text-text-muted hover:border-slate-300'
              }`}>
              {tab.label} <span className="ml-1 text-xs bg-slate-100 px-1.5 py-0.5 rounded-full">{tab.count}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-text-muted">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center text-text-muted">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm">No requests found.</p>
            <Link to="/farmer/request" className="btn-primary btn-sm mt-3 inline-block">Submit a Request</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => {
              const allocation = (allocations || []).find((a: any) => (a.requestId || a.request_id) === req.id);
              const resType = req.resourceType || req.resource_type || 'tractors';
              const resNeeded = req.resourceNeeded || req.resource_needed || '';
              const allocMethod = req.allocationMethod || req.allocation_method;
              const waitReason = req.waitlistReason || req.waitlist_reason;
              const score = req.priorityScore ?? req.priority_score;
              return (
                <div key={req.id}
                  onClick={() => setSelected(req)}
                  className="card p-4 cursor-pointer hover:shadow-card-hover transition-all hover:border-primary-200">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                      {RESOURCE_CATEGORY_ICONS[resType as keyof typeof RESOURCE_CATEGORY_ICONS] || '🚜'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text-primary">{resNeeded.slice(0, 50)}</span>
                        <StatusBadge status={req.status} />
                        {allocMethod === 'auto_alternative' ? (
                          <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200 font-semibold">
                            🔄 Alternative Resource Allocated
                          </span>
                        ) : allocMethod ? (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 font-medium">
                            {ALLOCATION_METHOD_LABELS[allocMethod]?.label || allocMethod}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-text-muted flex-wrap">
                        <span>{formatDate(req.earliestStart || req.earliest_start || '')} – {formatDate(req.latestEnd || req.latest_end || '')}</span>
                        <span>{req.durationDays || req.duration_days || 1}d duration</span>
                        <span>Submitted {timeAgo(req.createdAt || req.created_at || '')}</span>
                      </div>

                      {/* Allocation info inline */}
                      {allocation && (
                        <div className="mt-1.5 text-xs text-green-700 font-medium">
                          ✅ {(allocation as any).resourceName || (allocation as any).resource?.name || 'Assigned Equipment'} · {formatDate((allocation as any).scheduledStart || (allocation as any).scheduled_start || '')} – {formatDate((allocation as any).scheduledEnd || (allocation as any).scheduled_end || '')}
                        </div>
                      )}

                      {/* Waitlist reason inline */}
                      {req.status === 'waitlisted' && waitReason && (
                        <div className="mt-1.5 text-xs text-amber-700">
                          ⏳ {waitReason.slice(0, 80)}...
                          <Link to="/farmer/what-if" onClick={e => e.stopPropagation()} className="ml-1 underline font-medium">What-If →</Link>
                        </div>
                      )}

                      {req.status === 'manual_review' && (
                        <div className="mt-1.5 text-xs text-red-600">⚠️ Requires manual review — admin notified</div>
                      )}
                    </div>

                    {score !== undefined && score !== null && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-bold text-primary-700">{score}</div>
                        <div className="text-xs text-text-muted">/100</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && <RequestDetailModal request={selected} onClose={() => setSelected(null)} />}
    </SidebarLayout>
  );
}

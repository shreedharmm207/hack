import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadFarmerData } from '../farmerSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import { MOCK_FARMERS, MOCK_FAIRNESS_EVENTS } from '../../../services/mockData';
import { formatDateTime, timeAgo } from '../../../utils/constants';
import type { StarvationRisk } from '../../../types';

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

function getStarvationRisk(consecutiveLosses: number, waitingHours: number): StarvationRisk {
  if (consecutiveLosses >= 4 || waitingHours >= 16) return 'high';
  if (consecutiveLosses >= 2 || waitingHours >= 8) return 'medium';
  return 'low';
}

function RiskBadge({ risk }: { risk: StarvationRisk }) {
  const config = {
    low: { label: 'LOW', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: '✅' },
    medium: { label: 'MEDIUM', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '⚠️' },
    high: { label: 'HIGH', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '🚨' },
  }[risk];
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${config.bg} ${config.border}`}>
      <span className="text-2xl">{config.icon}</span>
      <div>
        <div className={`text-xs font-semibold ${config.text}`}>Starvation Risk</div>
        <div className={`text-xl font-bold ${config.text}`}>{config.label}</div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="font-bold">{value}/{max}</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

export default function FairnessView() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { profile } = useAppSelector(s => s.farmer);

  useEffect(() => {
    if (user?.id && !profile) dispatch(loadFarmerData(user.id));
  }, [user]);

  const farmerData = profile ? MOCK_FARMERS.find(f => f.id === profile.id) : null;
  const fairnessEvents = profile ? MOCK_FAIRNESS_EVENTS.filter(e => e.farmerId === profile.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) : [];

  const consecutiveLosses = farmerData?.consecutiveLosses ?? 0;
  const waitingHours = farmerData?.waitingStartedAt
    ? Math.floor((Date.now() - new Date(farmerData.waitingStartedAt).getTime()) / 3600000)
    : 0;
  const allocationAttempts = farmerData?.allocationAttempts ?? 0;
  const successfulAllocations = farmerData?.successfulAllocations ?? 0;
  const successRate = allocationAttempts > 0 ? Math.round((successfulAllocations / allocationAttempts) * 100) : 0;

  const risk = getStarvationRisk(consecutiveLosses, waitingHours);

  // Waiting time contribution (mirrors the priority engine's waitingTime scorer)
  const waitingContribution = Math.min(15, waitingHours >= 72 ? 15 : waitingHours >= 48 ? 12 : waitingHours >= 24 ? 9 : waitingHours >= 12 ? 6 : 3);

  const eventIcons: Record<string, string> = {
    request_submitted: '📤',
    allocation_failed: '❌',
    allocation_success: '✅',
    fairness_guard_activated: '⚖️',
    waitlisted: '⏳',
  };
  const eventColors: Record<string, string> = {
    request_submitted: 'border-blue-100 bg-blue-50',
    allocation_failed: 'border-red-100 bg-red-50',
    allocation_success: 'border-green-100 bg-green-50',
    fairness_guard_activated: 'border-amber-200 bg-amber-50',
    waitlisted: 'border-amber-100 bg-amber-50',
  };

  return (
    <SidebarLayout navItems={FARMER_NAV} portalName="Farmer Portal" portalColor="bg-primary-700" logoIcon="🌾">
      <div className="p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">⚖️ Fairness Guard</h1>
          <p className="text-text-muted text-sm mt-1">
            FarmGrid tracks allocation fairness to prevent starvation. Your waiting time contributes to your priority score within the official 15-point limit.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Stats */}
          <div className="space-y-4">
            {/* Risk indicator */}
            <div className="card p-5">
              <h2 className="section-title mb-4">Your Fairness Status</h2>
              <RiskBadge risk={risk} />

              {risk === 'high' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-semibold text-red-700">⚖️ FAIRNESS GUARD ACTIVE</p>
                  <p className="text-xs text-red-600 mt-1">
                    FarmGrid is increasing the waiting-time contribution within its official 15-point limit to reduce starvation risk.
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Consecutive Losses</span>
                  <span className={`font-bold ${consecutiveLosses >= 3 ? 'text-red-600' : 'text-text-primary'}`}>{consecutiveLosses}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Waiting Duration</span>
                  <span className="font-bold text-text-primary">{waitingHours > 0 ? `${waitingHours}h` : 'Not waiting'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Total Attempts</span>
                  <span className="font-bold">{allocationAttempts}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Successful</span>
                  <span className="font-bold text-green-600">{successfulAllocations}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Success Rate</span>
                  <span className="font-bold">{successRate}%</span>
                </div>
              </div>
            </div>

            {/* Waiting time contribution */}
            <div className="card p-5">
              <h2 className="section-title mb-4">Priority Contribution</h2>
              <div className="space-y-3">
                <ScoreBar
                  label="Waiting Time Factor"
                  value={waitingContribution}
                  max={15}
                  color={waitingContribution >= 12 ? 'bg-amber-400' : 'bg-primary-700'}
                />
                <p className="text-xs text-text-muted leading-relaxed">
                  {waitingContribution === 15
                    ? 'Maximum waiting-time contribution reached. You will receive priority in the next available allocation.'
                    : `Your waiting time contributes ${waitingContribution}/15 points to your priority score. This increases automatically as you wait longer.`}
                </p>
              </div>
            </div>

            {/* How fairness works */}
            <div className="card p-5">
              <h2 className="section-title mb-3">How FarmGrid Ensures Fairness</h2>
              <div className="space-y-2 text-xs text-text-muted">
                <p>• Waiting time automatically increases your priority score (up to 15/100 points)</p>
                <p>• After 3+ consecutive losses, Fairness Guard activates</p>
                <p>• All fairness operations are transparent and logged</p>
                <p>• No hidden bonus points — only the official 15-point waiting factor</p>
                <p>• First-come-first-serve breaks ties with equal priority scores</p>
              </div>
            </div>
          </div>

          {/* Right: Fairness Log */}
          <div className="lg:col-span-2">
            <div className="card p-5">
              <h2 className="section-title mb-4">Fairness Log</h2>
              {fairnessEvents.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <div className="text-4xl mb-3">⚖️</div>
                  <p className="text-sm">No fairness events yet. Submit a request to start tracking.</p>
                </div>
              ) : (
                <div className="relative space-y-3">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-100" />

                  {fairnessEvents.map((event, i) => (
                    <div key={event.id} className="relative flex gap-4">
                      {/* Timeline dot */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 z-10 border-2 ${
                        event.eventType === 'fairness_guard_activated' ? 'border-amber-400 bg-amber-50' :
                        event.eventType === 'allocation_success' ? 'border-green-400 bg-green-50' :
                        event.eventType === 'allocation_failed' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
                      }`}>
                        {eventIcons[event.eventType] || '📋'}
                      </div>

                      {/* Event card */}
                      <div className={`flex-1 p-3 rounded-lg border ${eventColors[event.eventType] || 'border-border bg-white'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm text-text-primary leading-relaxed">{event.details}</p>
                            {event.priorityScore && (
                              <div className="flex items-center gap-3 mt-1.5 text-xs">
                                <span className="text-text-muted">Your Score: <strong className="text-primary-700">{event.priorityScore}/100</strong></span>
                                {event.winnerScore && (
                                  <span className="text-text-muted">Winner: <strong className="text-amber-700">{event.winnerScore}/100</strong>
                                    {event.winnerFarmerName && <span className="text-text-muted"> ({event.winnerFarmerName})</span>}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-text-muted flex-shrink-0">{timeAgo(event.timestamp)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

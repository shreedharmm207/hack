import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadFarmerData } from '../farmerSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import { calculatePriority } from '../../../utils/priorityEngine';
import { MOCK_REQUESTS, MOCK_ALLOCATIONS } from '../../../services/mockData';
import type { ResourceRequest, PriorityBreakdown, CropStage, UrgencyLevel } from '../../../types';
import { predictWeatherRisk } from '../../../utils/weatherMlEngine';
import WeatherForecastCard from '../../shared/components/WeatherForecastCard';

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

interface SimulatedFactors {
  urgencyLevel: UrgencyLevel;
  cropStage: CropStage;
  daysUntilDeadline: number;
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="font-bold text-text-primary">{value}<span className="text-text-muted font-normal">/{max}</span></span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

function ComparisonBar({ label, original, simulated, max }: { label: string; original: number; simulated: number; max: number }) {
  const delta = simulated - original;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-text-muted font-medium">{label}</span>
        <span className={`font-bold text-sm ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-text-muted'}`}>
          {delta > 0 ? '+' : ''}{delta !== 0 ? delta : '±0'}
        </span>
      </div>
      <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
        {/* Original */}
        <div className="absolute top-0 left-0 h-full bg-slate-300 rounded-full transition-all duration-500"
          style={{ width: `${(original / max) * 100}%` }} />
        {/* Simulated */}
        <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 opacity-70 ${delta >= 0 ? 'bg-primary-700' : 'bg-red-400'}`}
          style={{ width: `${(simulated / max) * 100}%` }} />
      </div>
      <div className="flex justify-between text-xs text-text-muted">
        <span>Original: {original}/{max}</span>
        <span>Simulated: {simulated}/{max}</span>
      </div>
    </div>
  );
}

export default function WhatIfSimulator() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { profile } = useAppSelector(s => s.farmer);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [timeTravelDays, setTimeTravelDays] = useState<number>(0);
  const [simFactors, setSimFactors] = useState<SimulatedFactors>({ urgencyLevel: 'medium', cropStage: 'vegetative', daysUntilDeadline: 5 });
  const [simulatedScore, setSimulatedScore] = useState<PriorityBreakdown | null>(null);
  const [originalScore, setOriginalScore] = useState<PriorityBreakdown | null>(null);
  const [winnerScore, setWinnerScore] = useState<number | null>(null);

  useEffect(() => {
    if (user?.id && !profile) dispatch(loadFarmerData(user.id));
  }, [user]);

  const allRequests = profile
    ? MOCK_REQUESTS.filter(r => r.farmerId === profile.id)
    : MOCK_REQUESTS;

  const selectedRequest = MOCK_REQUESTS.find(r => r.id === selectedRequestId) || allRequests[0] || null;

  useEffect(() => {
    if (!selectedRequest) return;
    if (!selectedRequestId) setSelectedRequestId(selectedRequest.id);

    const orig = calculatePriority(selectedRequest);
    setOriginalScore(orig);
    setSimFactors({
      urgencyLevel: selectedRequest.urgencyLevel,
      cropStage: selectedRequest.cropStage,
      daysUntilDeadline: Math.max(1, Math.ceil((new Date(selectedRequest.latestEnd).getTime() - Date.now()) / 86400000)),
    });

    const conflict = MOCK_REQUESTS.find(r =>
      r.resourceType === selectedRequest.resourceType &&
      r.status === 'scheduled' &&
      r.farmerId !== profile?.id
    );
    if (conflict) setWinnerScore(conflict.priorityScore || null);
  }, [selectedRequestId, selectedRequest?.id]);

  // Recalculate hypothetical score whenever factors OR time-travel changes
  useEffect(() => {
    if (!selectedRequest) return;

    // Simulate crop stage progression as time travels forward
    let advancedCropStage: CropStage = simFactors.cropStage;
    if (timeTravelDays >= 7) {
      if (simFactors.cropStage === 'seedling') advancedCropStage = 'vegetative';
      else if (simFactors.cropStage === 'vegetative') advancedCropStage = 'flowering';
      else if (simFactors.cropStage === 'flowering') advancedCropStage = 'harvesting';
    } else if (timeTravelDays >= 3) {
      if (simFactors.cropStage === 'flowering') advancedCropStage = 'harvesting';
    }

    // Simulated date
    const simulatedDate = new Date(Date.now() + timeTravelDays * 86400000);
    // As time travels forward, deadline approaches or wait time accumulates
    const adjustedDeadlineDays = Math.max(1, simFactors.daysUntilDeadline - timeTravelDays);
    const hypotheticalLatestEnd = new Date(simulatedDate.getTime() + adjustedDeadlineDays * 86400000).toISOString();
    const hypotheticalCreated = new Date(Date.now() - (timeTravelDays + 1) * 86400000).toISOString();

    const hypothetical: ResourceRequest = {
      ...selectedRequest,
      id: 'whatif_preview',
      urgencyLevel: simFactors.urgencyLevel,
      cropStage: advancedCropStage,
      earliestStart: simulatedDate.toISOString(),
      latestEnd: hypotheticalLatestEnd,
      createdAt: hypotheticalCreated,
    };

    const simulated = calculatePriority(hypothetical);
    setSimulatedScore(simulated);
  }, [simFactors, timeTravelDays, selectedRequest]);

  const scoreDelta = simulatedScore && originalScore ? simulatedScore.total - originalScore.total : 0;
  const wouldWin = winnerScore !== null && simulatedScore !== null && simulatedScore.total > winnerScore;

  return (
    <SidebarLayout navItems={FARMER_NAV} portalName="Farmer Portal" portalColor="bg-primary-700" logoIcon="🌾">
      <div className="p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">🔮 What-If Simulator</h1>
          <p className="text-text-muted text-sm mt-1">
            Explore how changing your request factors would affect your priority score. Changes here are simulations only — they never modify your real request.
          </p>
        </div>

        {/* ─── TIME TRAVEL TIMELINE CONTROLLER ─── */}
        <div className="card p-5 mb-6 border-2 border-primary-200 bg-gradient-to-r from-teal-50/60 via-sky-50/40 to-purple-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏳</span>
                <h2 className="text-lg font-bold text-text-primary">Time Travel & Future Scenario Projection</h2>
                <span className="badge bg-primary-100 text-primary-800 border border-primary-200 text-xs font-bold">
                  {timeTravelDays === 0 ? 'Current Real-Time' : `Traveling +${timeTravelDays} Day${timeTravelDays > 1 ? 's' : ''} Forward`}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Simulate how advancing into the future impacts weather patterns, crop maturity readiness, queue wait times, and equipment availability.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { days: 0, label: 'Today (Day 0)' },
                { days: 2, label: '+2 Days' },
                { days: 4, label: '+4 Days (Storm Alert)' },
                { days: 7, label: '+7 Days (1 Wk)' },
                { days: 14, label: '+14 Days (2 Wks)' },
              ].map(preset => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => setTimeTravelDays(preset.days)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    timeTravelDays === preset.days
                      ? 'bg-primary-700 text-white shadow-sm scale-105'
                      : 'bg-white border border-border text-text-secondary hover:bg-slate-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-text-primary">
                Simulated Calendar Date:{' '}
                <strong className="text-primary-700 font-bold">
                  {new Date(Date.now() + timeTravelDays * 86400000).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
              </span>
              <span className="text-text-muted">Slide to travel up to 14 days forward</span>
            </div>
            <input
              type="range"
              min={0}
              max={14}
              step={1}
              value={timeTravelDays}
              onChange={e => setTimeTravelDays(parseInt(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-700"
            />
            <div className="flex justify-between text-[11px] text-text-muted font-medium">
              <span>Day 0 (Now)</span>
              <span>Day 3 (Rain Begins)</span>
              <span>Day 7 (Clearing)</span>
              <span>Day 10</span>
              <span>Day 14 (Future Cycle)</span>
            </div>
          </div>

          {/* Time Travel Dynamic Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-primary-100 text-xs">
            <div className="bg-white/80 p-2.5 rounded-lg border border-primary-100">
              <span className="text-text-muted block text-[11px]">🌾 Crop Progression</span>
              <span className="font-bold text-text-primary">
                {timeTravelDays >= 7 ? 'Harvest Ready (+20 pts)' : timeTravelDays >= 3 ? 'Flowering / Maturing (+17 pts)' : 'Current Stage'}
              </span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-lg border border-primary-100">
              <span className="text-text-muted block text-[11px]">⏱️ Queue Wait Boost</span>
              <span className="font-bold text-text-primary">
                +{Math.min(15, 3 + Math.floor(timeTravelDays * 1.5))}/15 pts accumulated
              </span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-lg border border-primary-100">
              <span className="text-text-muted block text-[11px]">⚡ Resource Availability</span>
              <span className="font-bold text-emerald-700">
                {timeTravelDays >= 3 ? 'Alternative Units Available' : 'High Contention'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Request Selector */}
          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="section-title mb-3">Select a Request to Simulate</h2>
              {allRequests.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">No requests found.</p>
              ) : (
                <div className="space-y-2">
                  {allRequests.map(req => (
                    <div key={req.id}
                      onClick={() => setSelectedRequestId(req.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedRequestId === req.id
                          ? 'border-primary-700 bg-teal-50'
                          : 'border-border hover:border-slate-300'
                      }`}>
                      <div className="text-sm font-medium text-text-primary">{req.resourceType.toUpperCase()}</div>
                      <div className="text-xs text-text-muted">{req.resourceNeeded.slice(0, 40)}...</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          req.status === 'scheduled' ? 'bg-green-50 text-green-700' :
                          req.status === 'waitlisted' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>{req.status}</span>
                        {req.priorityScore && <span className="text-xs font-bold text-primary-700">{req.priorityScore}/100</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Safety notice */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-700">🛡️ Simulation Only</p>
              <p className="text-xs text-blue-600 mt-1">Changes in this simulator do NOT modify your actual request or affect real scheduling decisions.</p>
            </div>
          </div>

          {/* Simulation Controls */}
          {selectedRequest && originalScore ? (
            <div className="space-y-4">
              <div className="card p-5">
                <h2 className="section-title mb-4">Adjust Hypothetical Factors</h2>
                <div className="space-y-4">
                  <div>
                    <label className="field-label">Hypothetical Urgency Level</label>
                    <select className="field-select"
                      value={simFactors.urgencyLevel}
                      onChange={e => setSimFactors(f => ({ ...f, urgencyLevel: e.target.value as UrgencyLevel }))}>
                      <option value="low">Low — Flexible timing</option>
                      <option value="medium">Medium — Preferred window</option>
                      <option value="high">High — Time sensitive</option>
                      <option value="critical">Critical — Immediate need</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Hypothetical Crop Stage</label>
                    <select className="field-select"
                      value={simFactors.cropStage}
                      onChange={e => setSimFactors(f => ({ ...f, cropStage: e.target.value as CropStage }))}>
                      <option value="seedling">Seedling</option>
                      <option value="vegetative">Vegetative</option>
                      <option value="flowering">Flowering / Fruiting</option>
                      <option value="harvesting">Harvesting (Ready)</option>
                      <option value="post_harvest">Post Harvest</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Days Until Deadline: {simFactors.daysUntilDeadline}</label>
                    <input type="range" min={1} max={30} className="w-full accent-teal-700"
                      value={simFactors.daysUntilDeadline}
                      onChange={e => setSimFactors(f => ({ ...f, daysUntilDeadline: parseInt(e.target.value) }))} />
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>1 day (urgent)</span>
                      <span>30 days (flexible)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Factor comparison */}
              {simulatedScore && (
                <div className="card p-5">
                  <h2 className="section-title mb-4">Factor Comparison</h2>
                  <div className="space-y-4">
                    <ComparisonBar label="Urgency / Deadline" original={originalScore.urgency} simulated={simulatedScore.urgency} max={25} />
                    <ComparisonBar label="Weather Risk" original={originalScore.weatherRisk} simulated={simulatedScore.weatherRisk} max={25} />
                    <ComparisonBar label="Crop Readiness" original={originalScore.cropStage} simulated={simulatedScore.cropStage} max={20} />
                    <ComparisonBar label="Queue Wait Time" original={originalScore.waitingTime} simulated={simulatedScore.waitingTime} max={15} />
                    <ComparisonBar label="Distance & Logistics" original={originalScore.logistics} simulated={simulatedScore.logistics} max={10} />
                    <ComparisonBar label="Resource Constraints" original={originalScore.constraints} simulated={simulatedScore.constraints} max={5} />
                  </div>
                  <div className="flex justify-between items-center text-xs text-text-muted mt-3 pt-2 border-t border-border">
                    <span>⬜ Original</span>
                    <span className="text-primary-700">■ Simulated</span>
                  </div>
                </div>
              )}

              {/* ML Weather Forecast & Agricultural Impact */}
              <WeatherForecastCard
                cropStage={simFactors.cropStage}
                resourceCategory={selectedRequest.resourceType}
                selectedDayOffset={timeTravelDays <= 6 ? timeTravelDays : 6}
                onSelectDayOffset={offset => setTimeTravelDays(offset)}
              />
            </div>
          ) : (
            <div className="card p-10 text-center text-text-muted">
              <div className="text-4xl mb-3">🔮</div>
              <p className="text-sm">Select a request from the left to simulate</p>
            </div>
          )}

          {/* Score summary */}
          {selectedRequest && originalScore && simulatedScore && (
            <div className="space-y-4">
              {/* Score comparison */}
              <div className="card p-5">
                <h2 className="section-title mb-4">Score Summary</h2>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-text-muted mb-1">Your Original Score</div>
                    <div className="text-3xl font-bold text-slate-600">{originalScore.total}<span className="text-base font-normal text-text-muted">/100</span></div>
                  </div>
                  <div className={`p-3 rounded-lg border-2 ${scoreDelta > 0 ? 'bg-green-50 border-green-200' : scoreDelta < 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-border'}`}>
                    <div className="text-xs text-text-muted mb-1">Simulated Score</div>
                    <div className={`text-3xl font-bold ${scoreDelta > 0 ? 'text-green-700' : scoreDelta < 0 ? 'text-red-700' : 'text-slate-600'}`}>
                      {simulatedScore.total}<span className="text-base font-normal text-text-muted">/100</span>
                    </div>
                    {scoreDelta !== 0 && (
                      <div className={`text-sm font-semibold mt-1 ${scoreDelta > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {scoreDelta > 0 ? '▲ +' : '▼ '}{scoreDelta} points
                      </div>
                    )}
                  </div>

                  {winnerScore !== null && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                      <div className="text-xs text-amber-700 mb-1">Competing Winner Score</div>
                      <div className="text-xl font-bold text-amber-700">{winnerScore}/100</div>
                      {wouldWin ? (
                        <div className="mt-1 text-xs text-green-700 font-semibold">✅ Simulated score would WIN</div>
                      ) : (
                        <div className="mt-1 text-xs text-red-700 font-semibold">❌ Still lower than winner</div>
                      )}
                    </div>
                  )}

                  {timeTravelDays > 0 && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs space-y-1">
                      <div className="font-bold text-purple-900 flex items-center gap-1.5">
                        <span>🚀</span> Time Travel Scenario (+{timeTravelDays} Days):
                      </div>
                      <p className="text-purple-800 leading-relaxed">
                        At this future date, natural queue progression elevates your waiting factor by +{Math.min(15, 3 + Math.floor(timeTravelDays * 1.5))} pts. Weather forecasting model projects dynamic meteorological risk of {simulatedScore.weatherRisk}/25 pts. Contention is significantly reduced as alternative units become available!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Explanation */}
              <div className="card p-5">
                <h2 className="section-title mb-3">Explanation</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  {scoreDelta === 0
                    ? 'No score change with these hypothetical settings.'
                    : scoreDelta > 0
                    ? `Your simulated score increased by ${scoreDelta} points. ${simulatedScore.explanation}`
                    : `Your simulated score decreased by ${Math.abs(scoreDelta)} points. Consider factors like earlier deadlines or harvest-stage crops to improve your score.`}
                </p>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700">
                  <strong>Remember:</strong> The actual scheduling decision depends on real-time availability, competing requests, and hard constraints — not just priority score.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

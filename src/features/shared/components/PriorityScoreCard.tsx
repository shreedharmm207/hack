import React from 'react';
import type { PriorityBreakdown } from '../../../types';
import { getPriorityLabel } from '../../../utils/priorityEngine';

interface Props {
  breakdown: PriorityBreakdown;
  compact?: boolean;
}

interface BarProps {
  label: string;
  value: number;
  max: number;
  color: string;
}

function ScoreBar({ label, value, max, color }: BarProps) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-xs text-text-secondary flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs font-semibold text-text-primary">
        {value}<span className="text-text-muted font-normal">/{max}</span>
      </span>
    </div>
  );
}

export default function PriorityScoreCard({ breakdown, compact = false }: Props) {
  const { label, color } = getPriorityLabel(breakdown.total);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Priority Score
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-text-primary">{breakdown.total}</span>
            <span className="text-text-muted text-lg">/100</span>
          </div>
        </div>
        <span className={`badge text-sm font-semibold px-3 py-1 ${color}`}>{label}</span>
      </div>

      {/* Circular gauge */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke={breakdown.total >= 70 ? '#0F766E' : breakdown.total >= 50 ? '#F59E0B' : '#DC2626'}
              strokeWidth="3"
              strokeDasharray={`${breakdown.total} ${100 - breakdown.total}`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-text-primary">{breakdown.total}%</span>
          </div>
        </div>
        {!compact && (
          <p className="text-xs text-text-secondary leading-relaxed">{breakdown.explanation}</p>
        )}
      </div>

      {/* Score breakdown bars */}
      <div className="space-y-3">
        <ScoreBar label="Urgency" value={breakdown.urgency} max={25} color="bg-red-400" />
        <ScoreBar label="Weather Risk" value={breakdown.weatherRisk} max={25} color="bg-amber-400" />
        <ScoreBar label="Crop Stage" value={breakdown.cropStage} max={20} color="bg-green-500" />
        <ScoreBar label="Waiting Time" value={breakdown.waitingTime} max={15} color="bg-blue-400" />
        <ScoreBar label="Logistics" value={breakdown.logistics} max={10} color="bg-purple-400" />
        <ScoreBar label="Constraints" value={breakdown.constraints} max={5} color="bg-teal-400" />
      </div>

      <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
        <span className="text-xs text-text-muted">Calculated by FarmGrid Engine</span>
        <span className="text-sm font-bold text-primary-700">Total: {breakdown.total}/100</span>
      </div>
    </div>
  );
}

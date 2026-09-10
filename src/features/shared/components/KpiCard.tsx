import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  trend?: { value: number; label: string };
}

const colorMap = {
  primary: { bg: 'bg-teal-50', icon: 'text-primary-700', border: 'border-teal-100' },
  success: { bg: 'bg-green-50', icon: 'text-success', border: 'border-green-100' },
  warning: { bg: 'bg-amber-50', icon: 'text-warning', border: 'border-amber-100' },
  danger: { bg: 'bg-red-50', icon: 'text-danger', border: 'border-red-100' },
  info: { bg: 'bg-sky-50', icon: 'text-info', border: 'border-sky-100' },
  neutral: { bg: 'bg-slate-50', icon: 'text-slate-600', border: 'border-slate-100' },
};

export default function KpiCard({ title, value, subtitle, icon, color = 'primary', trend }: KpiCardProps) {
  const c = colorMap[color];
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
          <span className={`text-xl ${c.icon}`}>{icon}</span>
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            trend.value >= 0 ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'
          }`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-text-primary tracking-tight">{value}</div>
        <div className="text-sm font-medium text-text-secondary mt-0.5">{title}</div>
        {subtitle && <div className="text-xs text-text-muted mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}

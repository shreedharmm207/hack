import React from 'react';
import type { RequestStatus, AllocationStatus } from '../../../types';
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS, ALLOCATION_STATUS_COLORS } from '../../../utils/constants';

interface StatusBadgeProps {
  status: RequestStatus | AllocationStatus | string;
  type?: 'request' | 'allocation' | 'custom';
  label?: string;
  customClass?: string;
}

export default function StatusBadge({ status, type = 'request', label, customClass }: StatusBadgeProps) {
  let className = 'badge';
  let displayLabel = label || status;

  if (type === 'request') {
    className = REQUEST_STATUS_COLORS[status as string] || 'badge-neutral';
    displayLabel = label || REQUEST_STATUS_LABELS[status as string] || status;
  } else if (type === 'allocation') {
    className = ALLOCATION_STATUS_COLORS[status as AllocationStatus] || 'badge-neutral';
    displayLabel = label || (status === 'scheduled' ? 'Scheduled' : status === 'active' ? 'Active' : status === 'completed' ? 'Completed' : String(status));
  } else if (customClass) {
    className = customClass;
  }

  return <span className={className}>{displayLabel}</span>;
}

// Dot indicator
export function SyncBadge({ status }: { status: 'pending_sync' | 'synced' | 'failed_sync' }) {
  const map = {
    pending_sync: { dot: 'bg-amber-400', label: 'Pending Sync', text: 'text-amber-700 bg-amber-50' },
    synced: { dot: 'bg-green-500', label: 'Synced', text: 'text-green-700 bg-green-50' },
    failed_sync: { dot: 'bg-red-500', label: 'Sync Failed', text: 'text-red-700 bg-red-50' },
  };
  const s = map[status];
  return (
    <span className={`badge gap-1.5 ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadFarmerData } from '../farmerSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import StatusBadge, { SyncBadge } from '../../shared/components/StatusBadge';
import PriorityScoreCard from '../../shared/components/PriorityScoreCard';
import { formatDate, RESOURCE_CATEGORY_ICONS, RESOURCE_CATEGORIES } from '../../../utils/constants';
import { calculatePriority } from '../../../utils/priorityEngine';
import type { ResourceRequest } from '../../../types';

const FARMER_NAV = [
  { path: '/farmer/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/farmer/request', label: 'New Request', icon: '📝' },
  { path: '/farmer/requests', label: 'My Requests', icon: '📋' },
  { path: '/farmer/schedule', label: 'My Schedule', icon: '📅' },
  { path: '/farmer/profile', label: 'Profile', icon: '👤' },
];

export default function MyRequests() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { profile, requests, isLoading } = useAppSelector(s => s.farmer);
  const [selected, setSelected] = useState<ResourceRequest | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user?.id) dispatch(loadFarmerData(user.id));
  }, [user]);

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);

  return (
    <SidebarLayout navItems={FARMER_NAV} portalName="Farmer Portal" portalColor="bg-primary-700" logoIcon="🌾">
      <div className="p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">My Requests</h1>
          <p className="text-text-muted text-sm mt-1">Track all your resource requests and allocation statuses</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {['all', 'pending', 'processing', 'approved', 'allocated', 'completed', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === s ? 'bg-primary-700 text-white' : 'bg-white border border-border text-text-secondary hover:bg-slate-50'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s === 'all' && <span className="ml-1.5 text-xs opacity-70">({requests.length})</span>}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Request list */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="card p-10 text-center text-text-muted">
                <div className="text-4xl mb-3">📋</div>
                <p>No requests found for this filter</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(req => (
                  <button
                    key={req.id}
                    onClick={() => setSelected(req)}
                    className={`w-full card p-4 text-left transition-all hover:shadow-card-hover ${
                      selected?.id === req.id ? 'ring-2 ring-primary-700' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">{RESOURCE_CATEGORY_ICONS[req.resourceType]}</span>
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{req.resourceNeeded}</div>
                          <div className="text-xs text-text-muted mt-0.5">
                            {formatDate(req.earliestStart)} → {formatDate(req.latestEnd)} · {req.durationDays} days
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <StatusBadge status={req.status} />
                            {req.syncStatus && <SyncBadge status={req.syncStatus} />}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {req.priorityScore !== undefined && (
                          <div>
                            <div className="text-lg font-bold text-primary-700">{req.priorityScore}</div>
                            <div className="text-2xs text-text-muted">priority</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border text-xs text-text-muted">
                      <span className="font-medium">Urgency:</span> {req.urgencyReason}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div>
            {selected ? (
              <div className="space-y-4 sticky top-6">
                <div className="card p-4">
                  <h3 className="font-semibold text-text-primary mb-3">Request Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Status</span>
                      <StatusBadge status={selected.status} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Resource</span>
                      <span className="font-medium text-right max-w-40">{RESOURCE_CATEGORIES[selected.resourceType]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Duration</span>
                      <span>{selected.durationDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Window</span>
                      <span className="text-right">{formatDate(selected.earliestStart)} – {formatDate(selected.latestEnd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Submitted</span>
                      <span>{formatDate(selected.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {selected.priorityScore !== undefined && (
                  <PriorityScoreCard
                    breakdown={calculatePriority(selected)}
                  />
                )}
              </div>
            ) : (
              <div className="card p-6 text-center text-text-muted">
                <div className="text-3xl mb-3">👆</div>
                <p className="text-sm">Select a request to see details and priority breakdown</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

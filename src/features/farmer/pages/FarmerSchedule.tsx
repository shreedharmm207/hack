import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadFarmerData } from '../farmerSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import StatusBadge from '../../shared/components/StatusBadge';
import { formatDate } from '../../../utils/constants';

const FARMER_NAV = [
  { path: '/farmer/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/farmer/request', label: 'New Request', icon: '📝' },
  { path: '/farmer/requests', label: 'My Requests', icon: '📋' },
  { path: '/farmer/schedule', label: 'My Schedule', icon: '📅' },
  { path: '/farmer/profile', label: 'Profile', icon: '👤' },
];

function TimelineDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: 'bg-blue-400',
    active: 'bg-primary-700',
    completed: 'bg-success',
    cancelled: 'bg-slate-300',
  };
  return <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colors[status] || 'bg-slate-400'}`} />;
}

export default function FarmerSchedule() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { profile, allocations } = useAppSelector(s => s.farmer);

  useEffect(() => {
    if (user?.id) dispatch(loadFarmerData(user.id));
  }, [user]);

  const myAllocations = (allocations || []);

  return (
    <SidebarLayout navItems={FARMER_NAV} portalName="Farmer Portal" portalColor="bg-primary-700" logoIcon="🌾">
      <div className="p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">My Schedule</h1>
          <p className="text-text-muted text-sm mt-1">Timeline of all your allocated resources</p>
        </div>

        {myAllocations.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">No Scheduled Allocations</h2>
            <p className="text-text-muted text-sm">Once your resource requests are approved and allocated, they will appear here on your timeline.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="section-title mb-4">Allocation Timeline</h2>
              <div className="relative pl-6">
                {/* Timeline line */}
                <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-6">
                  {myAllocations.map(a => (
                    <div key={a.id} className="relative flex items-start gap-4">
                      <div className="absolute -left-4">
                        <TimelineDot status={a.status} />
                      </div>
                      <div className="flex-1 card p-4 ml-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">🚜</span>
                              <span className="font-semibold text-text-primary">{a.resourceName || a.resource?.name || 'Assigned Resource'}</span>
                            </div>
                            <div className="text-xs text-text-muted">{a.providerName || a.organization?.org_name || 'Agricultural Provider'}</div>
                          </div>
                          <StatusBadge status={a.status} type="allocation" />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <div>
                            <div className="text-2xs text-text-muted uppercase tracking-wider">Start</div>
                            <div className="text-sm font-medium text-text-primary">{formatDate(a.scheduledStart || a.scheduled_start || '')}</div>
                          </div>
                          <div>
                            <div className="text-2xs text-text-muted uppercase tracking-wider">End</div>
                            <div className="text-sm font-medium text-text-primary">{formatDate(a.scheduledEnd || a.scheduled_end || '')}</div>
                          </div>
                          <div>
                            <div className="text-2xs text-text-muted uppercase tracking-wider">Priority</div>
                            <div className="text-sm font-bold text-primary-700">{a.priorityScore || a.priority_score || 0}/100</div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="text-xs text-text-muted">{(a.priorityBreakdown as any)?.explanation || (a.priority_breakdown as any)?.explanation || 'Automated allocation via priority scheduling.'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

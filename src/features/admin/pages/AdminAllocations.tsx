import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadAdminData } from '../adminSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import StatusBadge from '../../shared/components/StatusBadge';
import { formatDate } from '../../../utils/constants';

const ADMIN_NAV = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/conflicts', label: 'Conflict Queue', icon: '⚠️' },
  { path: '/admin/allocations', label: 'Allocations', icon: '🔗' },
  { path: '/admin/users', label: 'User Management', icon: '👥' },
  { path: '/admin/resources', label: 'Resources', icon: '🚜' },
  { path: '/admin/audit', label: 'Audit Log', icon: '📋' },
];

export default function AdminAllocations() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { allocations } = useAppSelector(s => s.admin);

  useEffect(() => {
    if (user?.id) dispatch(loadAdminData());
  }, [user]);

  return (
    <SidebarLayout navItems={ADMIN_NAV} portalName="Admin Portal" portalColor="bg-slate-800" logoIcon="⚙️">
      <div className="p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">All Allocations</h1>
          <p className="text-text-muted text-sm mt-1">View and manage all resource allocations across the platform</p>
        </div>

        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Farmer</th>
                <th>Resource</th>
                <th>Provider</th>
                <th>Start</th>
                <th>End</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map(a => (
                <tr key={a.id}>
                  <td className="font-medium">{a.farmerName}</td>
                  <td>{a.resourceName}</td>
                  <td className="text-text-muted">{a.providerName}</td>
                  <td>{formatDate(a.scheduledStart)}</td>
                  <td>{formatDate(a.scheduledEnd)}</td>
                  <td>
                    <span className="font-bold text-primary-700">{a.priorityScore}</span>
                    <span className="text-text-muted text-xs">/100</span>
                  </td>
                  <td><StatusBadge status={a.status} type="allocation" /></td>
                </tr>
              ))}
              {allocations.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-text-muted">No allocations yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}

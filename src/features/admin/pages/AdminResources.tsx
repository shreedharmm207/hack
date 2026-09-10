import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadAdminData } from '../adminSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import StatusBadge from '../../shared/components/StatusBadge';
import { formatDate, RESOURCE_CATEGORY_ICONS, RESOURCE_STATUS_LABELS } from '../../../utils/constants';

const ADMIN_NAV = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/conflicts', label: 'Conflict Queue', icon: '⚠️' },
  { path: '/admin/allocations', label: 'Allocations', icon: '🔗' },
  { path: '/admin/users', label: 'User Management', icon: '👥' },
  { path: '/admin/resources', label: 'Resources', icon: '🚜' },
  { path: '/admin/audit', label: 'Audit Log', icon: '📋' },
];

export default function AdminResources() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { resources } = useAppSelector(s => s.admin);

  useEffect(() => {
    if (user?.id) dispatch(loadAdminData());
  }, [user]);

  return (
    <SidebarLayout navItems={ADMIN_NAV} portalName="Admin Portal" portalColor="bg-slate-800" logoIcon="⚙️">
      <div className="p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Platform Resources</h1>
          <p className="text-text-muted text-sm mt-1">Overview of all resources registered on FarmGrid</p>
        </div>

        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Category</th>
                <th>Provider</th>
                <th>Qty</th>
                <th>Daily Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {resources.map(r => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td>
                    <span className="flex items-center gap-1.5">
                      <span>{RESOURCE_CATEGORY_ICONS[r.category]}</span>
                      <span className="text-text-muted text-xs capitalize">{r.category.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="text-text-muted">{r.providerName}</td>
                  <td>{r.quantity}</td>
                  <td>{r.dailyRate ? `₹${r.dailyRate.toLocaleString()}` : '—'}</td>
                  <td>
                    <StatusBadge
                      status={r.status}
                      type="custom"
                      label={RESOURCE_STATUS_LABELS[r.status]}
                      customClass={
                        r.status === 'available' ? 'badge badge-success' :
                        r.status === 'maintenance' ? 'badge badge-warning' :
                        r.status === 'allocated' ? 'badge badge-info' : 'badge badge-neutral'
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}

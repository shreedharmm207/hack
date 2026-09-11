import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadAdminData } from '../adminSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import { formatDateTime, timeAgo } from '../../../utils/constants';

const ADMIN_NAV = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/conflicts', label: 'Conflict Queue', icon: '⚠️' },
  { path: '/admin/allocations', label: 'Allocations', icon: '🔗' },
  { path: '/admin/users', label: 'User Management', icon: '👥' },
  { path: '/admin/resources', label: 'Resources', icon: '🚜' },
  { path: '/admin/audit', label: 'Audit Log', icon: '📋' },
];

const ACTION_ICONS: Record<string, string> = {
  ALLOCATION_CREATED: '🔗',
  CONFLICT_RESOLVED: '⚠️',
  PROVIDER_APPROVED: '✅',
  USER_SUSPENDED: '🚫',
  RESOURCE_ADDED: '🚜',
  OVERRIDE_APPLIED: '✏️',
};

export default function AuditLog() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { auditLogs } = useAppSelector(s => s.admin);

  useEffect(() => {
    if (user?.id) dispatch(loadAdminData());
  }, [user]);

  return (
    <SidebarLayout navItems={ADMIN_NAV} portalName="Admin Portal" portalColor="bg-slate-800" logoIcon="⚙️">
      <div className="p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Audit Log</h1>
          <p className="text-text-muted text-sm mt-1">
            Complete record of all admin actions on the platform. Every entry is immutable.
          </p>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-slate-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-text-secondary">{auditLogs.length} total entries</span>
            <span className="badge badge-neutral">Read-only</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
                <th>Admin</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-text-muted">No audit entries yet</td>
                </tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{ACTION_ICONS[log.action] || '📋'}</span>
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">
                          {log.action}
                        </code>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs">
                        <div className="font-medium">{log.entityType || log.entity_type}</div>
                        <div className="text-text-muted font-mono">{(log.entityId || log.entity_id || '').slice(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="max-w-64">
                      <div className="text-xs text-text-secondary line-clamp-2">{log.details}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {(log.adminName || log.actor_name || 'A')[0].toUpperCase()}
                        </div>
                        <span className="text-sm">{log.adminName || log.actor_name || 'Admin'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs">
                        <div className="text-text-primary">{formatDateTime(log.createdAt || log.created_at || '')}</div>
                        <div className="text-text-muted">{timeAgo(log.createdAt || log.created_at || '')}</div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadAdminData, suspendUser, approveProvider } from '../adminSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import { PROVIDER_TYPES } from '../../../utils/constants';

const ADMIN_NAV = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/conflicts', label: 'Conflict Queue', icon: '⚠️' },
  { path: '/admin/allocations', label: 'Allocations', icon: '🔗' },
  { path: '/admin/users', label: 'User Management', icon: '👥' },
  { path: '/admin/resources', label: 'Resources', icon: '🚜' },
  { path: '/admin/audit', label: 'Audit Log', icon: '📋' },
];

export default function UserManagement() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { farmers, providers } = useAppSelector(s => s.admin);
  const [tab, setTab] = useState<'farmers' | 'providers'>('farmers');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (user?.id) dispatch(loadAdminData());
  }, [user]);

  const handleSuspend = (userId: string) => {
    if (confirm('Suspend this user?')) {
      dispatch(suspendUser({ userId, adminId: user?.id || 'admin', adminName: user?.email?.split('@')[0] || 'Admin' }));
    }
  };

  const handleApprove = (providerId: string) => {
    dispatch(approveProvider({ providerId, adminId: user?.id || 'admin', adminName: user?.email?.split('@')[0] || 'Admin' }));
  };

  const filteredFarmers = farmers.filter(f =>
    filter === '' || f.name.toLowerCase().includes(filter.toLowerCase()) ||
    f.district.toLowerCase().includes(filter.toLowerCase())
  );
  const filteredProviders = providers.filter(p =>
    filter === '' || p.orgName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <SidebarLayout navItems={ADMIN_NAV} portalName="Admin Portal" portalColor="bg-slate-800" logoIcon="⚙️">
      <div className="p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">User Management</h1>
          <p className="text-text-muted text-sm mt-1">Manage all farmers and resource providers on the platform</p>
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setTab('farmers')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'farmers' ? 'bg-primary-700 text-white' : 'bg-white text-text-secondary hover:bg-slate-50'}`}
            >
              🌾 Farmers ({farmers.length})
            </button>
            <button
              onClick={() => setTab('providers')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'providers' ? 'bg-primary-700 text-white' : 'bg-white text-text-secondary hover:bg-slate-50'}`}
            >
              🏭 Providers ({providers.length})
            </button>
          </div>
          <input
            className="field-input w-64"
            placeholder="Search by name, district..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>

        {tab === 'farmers' && (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Location</th>
                  <th>Farm Size</th>
                  <th>Crop</th>
                  <th>Stage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFarmers.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-text-muted">{f.mobile}</div>
                    </td>
                    <td className="text-text-muted">{f.village}, {f.district}, {f.state}</td>
                    <td>{f.farmSize} acres</td>
                    <td>{f.cropType || '—'}</td>
                    <td><span className="badge badge-primary capitalize">{f.cropStage}</span></td>
                    <td>
                      <button
                        onClick={() => handleSuspend(f.userId)}
                        className="btn btn-sm btn-danger"
                      >
                        Suspend
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredFarmers.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-text-muted">No farmers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'providers' && (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Region</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProviders.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="font-medium">{p.orgName}</div>
                      <div className="text-xs text-text-muted">{p.contactPerson}</div>
                    </td>
                    <td className="text-text-muted">{PROVIDER_TYPES[p.providerType]}</td>
                    <td className="text-text-muted">{p.contactNumber}</td>
                    <td className="text-text-muted text-xs max-w-32">{p.operationalRegion}</td>
                    <td>
                      <span className={`badge ${p.isApproved ? 'badge-success' : 'badge-warning'}`}>
                        {p.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {!p.isApproved && (
                          <button onClick={() => handleApprove(p.id)} className="btn btn-sm bg-success text-white hover:bg-green-700">
                            Approve
                          </button>
                        )}
                        <button onClick={() => handleSuspend(p.userId)} className="btn btn-sm btn-danger">
                          Suspend
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProviders.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-text-muted">No providers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

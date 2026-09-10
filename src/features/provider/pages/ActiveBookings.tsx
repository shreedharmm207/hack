import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadProviderData } from '../providerSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import StatusBadge from '../../shared/components/StatusBadge';
import { formatDate } from '../../../utils/constants';

const PROVIDER_NAV = [
  { path: '/provider/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/provider/resources', label: 'My Resources', icon: '🚜' },
  { path: '/provider/bookings', label: 'Active Bookings', icon: '📋' },
  { path: '/provider/calendar', label: 'Schedule Calendar', icon: '📅' },
  { path: '/provider/profile', label: 'Profile', icon: '🏭' },
];

export default function ActiveBookings() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { allocations } = useAppSelector(s => s.provider);

  useEffect(() => {
    if (user?.id) dispatch(loadProviderData(user.id));
  }, [user]);

  const active = allocations.filter(a => a.status === 'active' || a.status === 'scheduled');
  const past = allocations.filter(a => a.status === 'completed' || a.status === 'cancelled');

  return (
    <SidebarLayout navItems={PROVIDER_NAV} portalName="Provider Portal" portalColor="bg-teal-600" logoIcon="🏭">
      <div className="p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Active Bookings</h1>
          <p className="text-text-muted text-sm mt-1">Track current and upcoming resource assignments</p>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="section-title mb-4">Current & Upcoming ({active.length})</h2>
            {active.length === 0 ? (
              <div className="text-center py-6 text-text-muted text-sm">No active bookings</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Resource</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map(a => (
                    <tr key={a.id}>
                      <td className="font-medium">{a.farmerName}</td>
                      <td>{a.resourceName}</td>
                      <td>{formatDate(a.scheduledStart)}</td>
                      <td>{formatDate(a.scheduledEnd)}</td>
                      <td>
                        <span className="font-bold text-primary-700">{a.priorityScore}</span>
                        <span className="text-text-muted text-xs">/100</span>
                      </td>
                      <td><StatusBadge status={a.status} type="allocation" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card p-5">
            <h2 className="section-title mb-4">Past Bookings ({past.length})</h2>
            {past.length === 0 ? (
              <div className="text-center py-6 text-text-muted text-sm">No past bookings</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Resource</th>
                    <th>Period</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {past.map(a => (
                    <tr key={a.id}>
                      <td className="font-medium">{a.farmerName}</td>
                      <td>{a.resourceName}</td>
                      <td className="text-text-muted">{formatDate(a.scheduledStart)} → {formatDate(a.scheduledEnd)}</td>
                      <td><StatusBadge status={a.status} type="allocation" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

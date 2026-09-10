import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadProviderData, addResource, updateResource, deleteResource } from '../providerSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import StatusBadge from '../../shared/components/StatusBadge';
import { RESOURCE_CATEGORIES, RESOURCE_CATEGORY_ICONS, RESOURCE_STATUS_LABELS } from '../../../utils/constants';
import type { Resource, ResourceCategory, ResourceStatus } from '../../../types';
import { useForm } from 'react-hook-form';

const PROVIDER_NAV = [
  { path: '/provider/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/provider/resources', label: 'My Resources', icon: '🚜' },
  { path: '/provider/bookings', label: 'Active Bookings', icon: '📋' },
  { path: '/provider/calendar', label: 'Schedule Calendar', icon: '📅' },
  { path: '/provider/profile', label: 'Profile', icon: '🏭' },
];

interface ResourceForm {
  name: string; category: ResourceCategory; description: string;
  quantity: number; dailyRate: number; status: ResourceStatus; lat: number; lng: number;
}

function ResourceModal({
  resource, providerId, providerName, onClose
}: {
  resource?: Resource; providerId: string; providerName: string;
  onClose: (saved: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const { register, handleSubmit, formState: { errors } } = useForm<ResourceForm>({
    defaultValues: resource ? {
      name: resource.name, category: resource.category, description: resource.description,
      quantity: resource.quantity, dailyRate: resource.dailyRate || 0,
      status: resource.status, lat: resource.lat, lng: resource.lng,
    } : { status: 'available', quantity: 1, lat: 20.5937, lng: 78.9629 }
  });

  const onSubmit = async (data: ResourceForm) => {
    if (resource) {
      await dispatch(updateResource({ ...resource, ...data }));
    } else {
      await dispatch(addResource({ ...data, providerId, providerName }));
    }
    onClose(true);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary">{resource ? 'Edit Resource' : 'Add New Resource'}</h2>
          <button onClick={() => onClose(false)} className="btn-ghost p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="field-label">Resource Name *</label>
            <input className="field-input" placeholder="e.g. John Deere 5050D Tractor"
              {...register('name', { required: 'Name required' })} />
            {errors.name && <p className="field-error">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Category *</label>
              <select className="field-select" {...register('category', { required: true })}>
                {Object.entries(RESOURCE_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Status</label>
              <select className="field-select" {...register('status')}>
                {Object.entries(RESOURCE_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea rows={2} className="field-input resize-none" placeholder="Brief description..."
              {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Quantity *</label>
              <input type="number" min={1} className="field-input"
                {...register('quantity', { required: true, valueAsNumber: true, min: 1 })} />
            </div>
            <div>
              <label className="field-label">Daily Rate (₹)</label>
              <input type="number" min={0} className="field-input"
                {...register('dailyRate', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Latitude</label>
              <input type="number" step="any" className="field-input" {...register('lat', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="field-label">Longitude</label>
              <input type="number" step="any" className="field-input" {...register('lng', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {resource ? 'Update Resource' : 'Add Resource'}
            </button>
            <button type="button" onClick={() => onClose(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResourceManagement() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { profile, resources, isLoading } = useAppSelector(s => s.provider);
  const [showModal, setShowModal] = useState(false);
  const [editResource, setEditResource] = useState<Resource | undefined>();

  useEffect(() => {
    if (user?.id) dispatch(loadProviderData(user.id));
  }, [user]);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this resource?')) dispatch(deleteResource(id));
  };

  return (
    <SidebarLayout navItems={PROVIDER_NAV} portalName="Provider Portal" portalColor="bg-teal-600" logoIcon="🏭">
      <div className="p-6 animate-fade-in">
        <div className="section-header mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Resource Management</h1>
            <p className="text-text-muted text-sm mt-1">Add, edit, and manage your agricultural resources</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => { setEditResource(undefined); setShowModal(true); }}
          >
            + Add Resource
          </button>
        </div>

        {resources.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">🚜</div>
            <h2 className="text-lg font-semibold mb-2">No Resources Yet</h2>
            <p className="text-text-muted text-sm mb-4">Add your first resource to start receiving allocation requests</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>Add First Resource</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {resources.map(r => (
              <div key={r.id} className="card-hover p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{RESOURCE_CATEGORY_ICONS[r.category]}</span>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{r.name}</div>
                      <div className="text-xs text-text-muted capitalize">{r.category.replace('_', ' ')}</div>
                    </div>
                  </div>
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
                </div>

                <p className="text-xs text-text-muted mb-3 line-clamp-2">{r.description}</p>

                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div>
                    <span className="text-text-muted text-xs">Quantity</span>
                    <div className="font-semibold">{r.quantity} units</div>
                  </div>
                  <div>
                    <span className="text-text-muted text-xs">Daily Rate</span>
                    <div className="font-semibold">{r.dailyRate ? `₹${r.dailyRate.toLocaleString()}` : '—'}</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => { setEditResource(r); setShowModal(true); }}
                    className="btn btn-sm btn-secondary flex-1"
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="btn btn-sm btn-danger flex-1">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && profile && (
        <ResourceModal
          resource={editResource}
          providerId={profile.id}
          providerName={profile.orgName}
          onClose={() => setShowModal(false)}
        />
      )}
    </SidebarLayout>
  );
}

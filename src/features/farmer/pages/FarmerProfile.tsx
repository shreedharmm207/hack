import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loadFarmerData, updateProfile } from '../farmerSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import { CROP_STAGES, INDIAN_STATES } from '../../../utils/constants';
import type { Farmer, CropStage } from '../../../types';

const FARMER_NAV = [
  { path: '/farmer/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/farmer/request', label: 'New Request', icon: '📝' },
  { path: '/farmer/requests', label: 'My Requests', icon: '📋' },
  { path: '/farmer/schedule', label: 'My Schedule', icon: '📅' },
  { path: '/farmer/profile', label: 'Profile', icon: '👤' },
];

export default function FarmerProfile() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const { profile, requests, isLoading } = useAppSelector(s => s.farmer);
  const [saved, setSaved] = React.useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Farmer>();

  useEffect(() => {
    if (user?.id) dispatch(loadFarmerData(user.id));
  }, [user]);

  useEffect(() => {
    if (profile) reset({
      ...profile,
      mobile: profile.mobile || profile.phone || '',
      village: profile.village || '',
      district: profile.district || '',
      state: profile.state || '',
      primaryCrop: profile.primaryCrop || profile.primary_crop || '',
      cropStage: (profile.cropStage || profile.crop_stage || 'sowing') as CropStage,
      farmSizeAcres: profile.farmSizeAcres || profile.farm_size_acres || 0,
    } as any);
  }, [profile]);

  const onSubmit = (data: Farmer) => {
    if (!profile) return;
    dispatch(updateProfile({ ...profile, ...data }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SidebarLayout navItems={FARMER_NAV} portalName="Farmer Portal" portalColor="bg-primary-700" logoIcon="🌾">
      <div className="p-6 max-w-2xl animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Farmer Profile</h1>
          <p className="text-text-muted text-sm mt-1">Keep your profile updated for accurate resource matching</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Personal Info */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Full Name *</label>
                <input className="field-input" {...register('name', { required: 'Name required' })} />
                {errors.name && <p className="field-error">{errors.name.message}</p>}
              </div>
              <div>
                <label className="field-label">Mobile Number *</label>
                <input className="field-input" type="tel" {...register('mobile', { required: 'Mobile required' })} />
                {errors.mobile && <p className="field-error">{errors.mobile.message}</p>}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Location</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Village</label>
                <input className="field-input" placeholder="Village name" {...register('village')} />
              </div>
              <div>
                <label className="field-label">District *</label>
                <input className="field-input" placeholder="District" {...register('district', { required: 'District required' })} />
              </div>
              <div>
                <label className="field-label">State *</label>
                <select className="field-select" {...register('state', { required: 'State required' })}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Farm Size (acres) *</label>
                <input type="number" min={0.5} step={0.5} className="field-input"
                  {...register('farmSize', { required: 'Farm size required', valueAsNumber: true, min: 0.1 })} />
              </div>
              <div>
                <label className="field-label">Latitude</label>
                <input type="number" step="any" className="field-input"
                  {...register('lat', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="field-label">Longitude</label>
                <input type="number" step="any" className="field-input"
                  {...register('lng', { valueAsNumber: true })} />
              </div>
            </div>
          </div>

          {/* Crop Info */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Crop Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Crop Type *</label>
                <input className="field-input" placeholder="e.g. Soybean, Wheat, Cotton"
                  {...register('cropType', { required: 'Crop type required' })} />
              </div>
              <div>
                <label className="field-label">Current Crop Stage *</label>
                <select className="field-select" {...register('cropStage', { required: true })}>
                  {Object.entries(CROP_STAGES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary btn-lg" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Profile'}
            </button>
            {saved && (
              <span className="text-sm text-success font-medium flex items-center gap-1">
                ✅ Profile saved successfully
              </span>
            )}
          </div>
        </form>

        {/* My Requests Section */}
        <div className="card p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">📋 My Requests</h2>
              <p className="text-xs text-text-muted mt-0.5">Your submitted resource requests in the database</p>
            </div>
            <Link to="/farmer/requests" className="text-xs text-primary-700 hover:underline font-semibold">
              View All ({requests.length}) →
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-sm">
              <p>No resource requests created yet.</p>
              <Link to="/farmer/request" className="btn-primary btn-sm mt-3 inline-block">Create New Request</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 3).map(r => (
                <div key={r.id} className="p-3 bg-slate-50 border border-border rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-text-primary">
                      {(r as any).resourceName || r.resource_needed || r.resource_type || 'Resource'}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {(r as any).orgName || (r as any).organization?.org_name || 'Kaveri Agri Cooperative'} · {r.created_at ? r.created_at.split('T')[0] : 'Today'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-0.5 rounded font-semibold bg-teal-50 text-teal-700 border border-teal-200 uppercase">
                      {r.status}
                    </span>
                    {r.priority_score && (
                      <div className="text-xs font-bold text-primary-700 mt-1">{r.priority_score}/100</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

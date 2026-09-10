import React, { useEffect } from 'react';
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
  const { profile, isLoading } = useAppSelector(s => s.farmer);
  const [saved, setSaved] = React.useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Farmer>();

  useEffect(() => {
    if (user?.id) dispatch(loadFarmerData(user.id));
  }, [user]);

  useEffect(() => {
    if (profile) reset(profile);
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
      </div>
    </SidebarLayout>
  );
}

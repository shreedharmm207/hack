import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { submitRequest, loadFarmerData } from '../farmerSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import PriorityScoreCard from '../../shared/components/PriorityScoreCard';
import { RESOURCE_CATEGORIES, CROP_STAGES } from '../../../utils/constants';
import { calculatePriority } from '../../../utils/priorityEngine';
import type { ResourceRequest, ResourceCategory, CropStage, UrgencyLevel } from '../../../types';

const FARMER_NAV = [
  { path: '/farmer/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/farmer/request', label: 'New Request', icon: '📝' },
  { path: '/farmer/requests', label: 'My Requests', icon: '📋' },
  { path: '/farmer/schedule', label: 'My Schedule', icon: '📅' },
  { path: '/farmer/profile', label: 'Profile', icon: '👤' },
];

interface FormData {
  resourceType: ResourceCategory;
  resourceNeeded: string;
  earliestStart: string;
  latestEnd: string;
  durationDays: number;
  cropStage: CropStage;
  urgencyLevel: UrgencyLevel;
  urgencyReason: string;
  additionalNotes: string;
}

export default function RequestForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector(s => s.auth);
  const { profile, isLoading } = useAppSelector(s => s.farmer);
  const [previewScore, setPreviewScore] = useState<ReturnType<typeof calculatePriority> | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { durationDays: 1, urgencyLevel: 'medium', cropStage: profile?.cropStage || 'vegetative' }
  });

  const watchedValues = watch();

  useEffect(() => {
    if (user?.id && !profile) dispatch(loadFarmerData(user.id));
  }, [user]);

  // Live priority preview
  useEffect(() => {
    if (watchedValues.urgencyLevel && watchedValues.latestEnd && watchedValues.cropStage) {
      const mockReq: ResourceRequest = {
        id: 'preview_' + Date.now(),
        farmerId: profile?.id || 'f_preview',
        farmerName: profile?.name || 'Preview',
        resourceType: watchedValues.resourceType || 'tractor',
        resourceNeeded: watchedValues.resourceNeeded || '',
        earliestStart: watchedValues.earliestStart || new Date().toISOString(),
        latestEnd: watchedValues.latestEnd,
        durationDays: watchedValues.durationDays || 1,
        cropStage: watchedValues.cropStage,
        urgencyLevel: watchedValues.urgencyLevel,
        urgencyReason: watchedValues.urgencyReason || '',
        lat: profile?.lat || 20.5937,
        lng: profile?.lng || 78.9629,
        additionalNotes: '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      setPreviewScore(calculatePriority(mockReq));
    }
  }, [watchedValues.urgencyLevel, watchedValues.latestEnd, watchedValues.cropStage]);

  const onSubmit = async (data: FormData) => {
    if (!profile) return;
    await dispatch(submitRequest({
      ...data,
      farmerId: profile.id,
      farmerName: profile.name,
      lat: profile.lat,
      lng: profile.lng,
    }));
    setSubmitted(true);
    setTimeout(() => navigate('/farmer/requests'), 1500);
  };

  if (submitted) {
    return (
      <SidebarLayout navItems={FARMER_NAV} portalName="Farmer Portal" portalColor="bg-primary-700" logoIcon="🌾">
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-center animate-slide-up">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">✅</div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Request Submitted!</h2>
            <p className="text-text-muted text-sm">Your request is being processed. Redirecting to My Requests...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout navItems={FARMER_NAV} portalName="Farmer Portal" portalColor="bg-primary-700" logoIcon="🌾">
      <div className="p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Submit Resource Request</h1>
          <p className="text-text-muted text-sm mt-1">Fill in the details below. Our engine will calculate your priority score.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Resource Info */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Resource Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Resource Type *</label>
                    <select className="field-select" {...register('resourceType', { required: 'Select resource type' })}>
                      <option value="">Select type</option>
                      {Object.entries(RESOURCE_CATEGORIES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    {errors.resourceType && <p className="field-error">{errors.resourceType.message}</p>}
                  </div>
                  <div>
                    <label className="field-label">Duration Required (Days) *</label>
                    <input type="number" min={1} max={30} className="field-input"
                      {...register('durationDays', { required: true, min: 1, valueAsNumber: true })} />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="field-label">Describe Resource Needed *</label>
                  <input className="field-input" placeholder="e.g. Combine harvester for 12 acres of soybean"
                    {...register('resourceNeeded', { required: 'Describe what you need' })} />
                  {errors.resourceNeeded && <p className="field-error">{errors.resourceNeeded.message}</p>}
                </div>
              </div>

              {/* Timeline */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Timeline</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Earliest Start Date *</label>
                    <input type="date" className="field-input"
                      {...register('earliestStart', { required: 'Select start date' })} />
                    {errors.earliestStart && <p className="field-error">{errors.earliestStart.message}</p>}
                  </div>
                  <div>
                    <label className="field-label">Latest End Date *</label>
                    <input type="date" className="field-input"
                      {...register('latestEnd', { required: 'Select end date' })} />
                    {errors.latestEnd && <p className="field-error">{errors.latestEnd.message}</p>}
                  </div>
                </div>
              </div>

              {/* Urgency */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Urgency & Crop Info</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Crop Stage *</label>
                    <select className="field-select" {...register('cropStage', { required: true })}>
                      {Object.entries(CROP_STAGES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Urgency Level *</label>
                    <select className="field-select" {...register('urgencyLevel', { required: true })}>
                      <option value="low">Low — Flexible timing</option>
                      <option value="medium">Medium — Preferred window</option>
                      <option value="high">High — Time sensitive</option>
                      <option value="critical">Critical — Immediate need</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="field-label">Urgency Reason *</label>
                  <textarea rows={3} className="field-input resize-none"
                    placeholder="Explain why this resource is urgently needed..."
                    {...register('urgencyReason', { required: 'Provide urgency reason' })} />
                  {errors.urgencyReason && <p className="field-error">{errors.urgencyReason.message}</p>}
                </div>
                <div className="mt-4">
                  <label className="field-label">Additional Notes</label>
                  <textarea rows={2} className="field-input resize-none"
                    placeholder="Any other relevant information..."
                    {...register('additionalNotes')} />
                </div>
              </div>

              <button type="submit" className="btn-primary btn-lg w-full" disabled={isLoading || !profile}>
                {!profile ? 'Complete your profile first' : isLoading ? 'Submitting...' : 'Submit Resource Request'}
              </button>

              {!profile && (
                <p className="text-xs text-center text-danger">You must complete your profile before submitting a request.</p>
              )}
            </form>
          </div>

          {/* Priority Preview */}
          <div className="space-y-4">
            {previewScore ? (
              <>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-xs font-semibold text-amber-700">Live Priority Preview</p>
                  <p className="text-xs text-amber-600 mt-0.5">Score updates as you fill the form</p>
                </div>
                <PriorityScoreCard breakdown={previewScore} />
              </>
            ) : (
              <div className="card p-5 text-center text-text-muted">
                <div className="text-3xl mb-3">🎯</div>
                <p className="text-sm font-medium">Priority Score Preview</p>
                <p className="text-xs mt-1">Fill in urgency, deadline, and crop stage to see your score</p>
              </div>
            )}

            <div className="card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">How Priority Works</h3>
              <div className="space-y-2 text-xs text-text-muted">
                {[
                  ['🔴', 'Urgency / Deadline', '25%'],
                  ['🌦️', 'Weather Risk', '25%'],
                  ['🌱', 'Crop Readiness', '20%'],
                  ['⏱️', 'Queue Wait Time', '15%'],
                  ['📍', 'Distance / Logistics', '10%'],
                  ['📦', 'Resource Scarcity', '5%'],
                ].map(([icon, label, pct]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span>{icon} {label}</span>
                    <span className="font-semibold text-primary-700">{pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

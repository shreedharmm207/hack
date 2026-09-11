import type { ResourceCategory, ResourceStatus, CropStage, ProviderType, RequestStatus, AllocationStatus, ConflictStatus } from '../types';

export const RESOURCE_CATEGORIES: Record<ResourceCategory, string> = {
  tractor: 'Tractor',
  harvester: 'Harvester',
  tiller: 'Tiller',
  seeder: 'Seeder',
  portable_pump: 'Portable Pump',
  drip_irrigation: 'Drip Irrigation Kit',
  sprinkler: 'Sprinkler System',
  cold_storage: 'Cold Storage Unit',
  solar_storage: 'Solar Storage Unit',
  mini_truck: 'Mini Truck',
  trailer: 'Trailer',
  labour_team: 'Agricultural Labour Team',
  drone_spraying: 'Drone Spraying Service',
  soil_testing: 'Soil Testing Service',
};

export const RESOURCE_CATEGORY_ICONS: Record<ResourceCategory, string> = {
  tractor: '🚜',
  harvester: '🌾',
  tiller: '⚙️',
  seeder: '🌱',
  portable_pump: '💧',
  drip_irrigation: '🪣',
  sprinkler: '🚿',
  cold_storage: '❄️',
  solar_storage: '☀️',
  mini_truck: '🚛',
  trailer: '🛻',
  labour_team: '👷',
  drone_spraying: '🚁',
  soil_testing: '🧪',
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  available: 'Available',
  allocated: 'Allocated',
  maintenance: 'Under Maintenance',
  retired: 'Retired',
};

export const CROP_STAGES: Record<CropStage, string> = {
  seedling: 'Seedling',
  vegetative: 'Vegetative',
  flowering: 'Flowering / Fruiting',
  harvesting: 'Harvesting',
  post_harvest: 'Post Harvest',
};

export const PROVIDER_TYPES: Record<ProviderType, string> = {
  individual: 'Individual Owner',
  cooperative: 'Cooperative Society',
  ngo: 'NGO',
  private_company: 'Private Company',
  government: 'Government Agency',
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  processing: 'Processing',
  scheduled: 'Auto-Scheduled ✅',
  waitlisted: 'Waitlisted',
  conflict: 'In Conflict',
  disrupted: 'Disrupted',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  manual_review: 'Manual Review Required',
  // Legacy
  pending: 'Pending Review',
  approved: 'Approved',
  allocated: 'Allocated',
  rejected: 'Rejected',
};

export const REQUEST_STATUS_COLORS: Record<string, string> = {
  draft: 'badge-neutral',
  submitted: 'badge-info',
  processing: 'badge-info',
  scheduled: 'badge-success',
  waitlisted: 'badge-warning',
  conflict: 'badge-danger',
  disrupted: 'badge-danger',
  rescheduled: 'badge-primary',
  completed: 'badge-success',
  cancelled: 'badge-neutral',
  manual_review: 'badge-danger',
  // Legacy
  pending: 'badge-warning',
  approved: 'badge-primary',
  allocated: 'badge-success',
  rejected: 'badge-danger',
};

export const ALLOCATION_STATUS_COLORS: Record<AllocationStatus, string> = {
  scheduled: 'badge-info',
  active: 'badge-primary',
  completed: 'badge-success',
  cancelled: 'badge-neutral',
};

export const CONFLICT_STATUS_COLORS: Record<string, string> = {
  open: 'badge-danger',
  resolved: 'badge-success',
  escalated: 'badge-warning',
  auto_resolved: 'badge-primary',
};

export const ALLOCATION_METHOD_LABELS: Record<string, { label: string; color: string }> = {
  auto: { label: 'Auto-Allocated', color: 'badge-success' },
  auto_alternative: { label: 'Alternative Allocated', color: 'badge-teal' },
  fcfs_tiebreak: { label: 'FCFS Tiebreak', color: 'badge-primary' },
  conflict_resolved: { label: 'Conflict Resolved', color: 'badge-warning' },
  admin_override: { label: 'Admin Override', color: 'badge-neutral' },
};

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar', 'Chandigarh', 'Delhi', 'Jammu & Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
];

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// ─── User & Auth ────────────────────────────────────────────────────────────
export type UserRole = 'farmer' | 'provider' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  otpPending: boolean;
  otpEmail: string | null;
}

// ─── Farmer ─────────────────────────────────────────────────────────────────
export type CropStage = 'seedling' | 'vegetative' | 'flowering' | 'harvesting' | 'post_harvest';
export type CropType = string;

export interface Farmer {
  id: string;
  userId: string;
  name: string;
  mobile: string;
  village: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  farmSize: number; // acres
  cropType: CropType;
  cropStage: CropStage;
  createdAt: string;
  // Fairness tracking
  allocationAttempts?: number;
  successfulAllocations?: number;
  consecutiveLosses?: number;
  waitingStartedAt?: string | null;
}

// ─── Provider ────────────────────────────────────────────────────────────────
export type ProviderType = 'individual' | 'cooperative' | 'ngo' | 'private_company' | 'government';

export interface Provider {
  id: string;
  userId: string;
  orgName: string;
  contactPerson: string;
  contactNumber: string;
  address: string;
  operationalRegion: string;
  providerType: ProviderType;
  isApproved: boolean;
  createdAt: string;
}

// ─── Resource ────────────────────────────────────────────────────────────────
export type ResourceCategory =
  | 'tractor' | 'harvester' | 'tiller' | 'seeder'
  | 'portable_pump' | 'drip_irrigation' | 'sprinkler' | 'cold_storage'
  | 'solar_storage' | 'mini_truck' | 'trailer'
  | 'labour_team' | 'drone_spraying' | 'soil_testing';

export type ResourceStatus = 'available' | 'allocated' | 'maintenance' | 'retired';

export interface Resource {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  category: ResourceCategory;
  description: string;
  quantity: number;
  status: ResourceStatus;
  dailyRate?: number;
  lat: number;
  lng: number;
  operatingHoursStart?: number; // 0-23
  operatingHoursEnd?: number;   // 0-23
  createdAt: string;
}

// ─── Availability ────────────────────────────────────────────────────────────
export interface ResourceAvailability {
  id: string;
  resourceId: string;
  startDate: string;
  endDate: string;
  isBooked: boolean;
}

// ─── Request ─────────────────────────────────────────────────────────────────
export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'scheduled'
  | 'waitlisted'
  | 'conflict'
  | 'disrupted'
  | 'rescheduled'
  | 'completed'
  | 'cancelled'
  | 'manual_review'
  // Legacy (keep for backward compat)
  | 'pending'
  | 'approved'
  | 'allocated'
  | 'rejected';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ResourceRequest {
  id: string;
  farmerId: string;
  farmerName: string;
  resourceType: ResourceCategory;
  resourceNeeded: string;
  earliestStart: string;
  latestEnd: string;
  durationDays: number;
  cropStage: CropStage;
  urgencyLevel: UrgencyLevel;
  urgencyReason: string;
  lat: number;
  lng: number;
  additionalNotes: string;
  status: RequestStatus;
  priorityScore?: number;
  createdAt: string;
  syncStatus?: 'pending_sync' | 'synced' | 'failed_sync';
  // Auto-allocation metadata
  allocatedResourceId?: string;
  allocationMethod?: 'auto' | 'conflict_resolved' | 'admin_override' | 'fcfs_tiebreak';
  manualReviewReason?: string;
  waitlistReason?: string;
  fcfsTiebreak?: boolean;
}

// ─── Priority Score ───────────────────────────────────────────────────────────
export interface PriorityBreakdown {
  urgency: number;        // /25
  weatherRisk: number;    // /25
  cropStage: number;      // /20
  waitingTime: number;    // /15
  logistics: number;      // /10
  constraints: number;    // /5
  total: number;          // /100
  explanation: string;
}

// ─── Allocation ───────────────────────────────────────────────────────────────
export type AllocationStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type AllocationMethod = 'auto' | 'conflict_resolved' | 'admin_override' | 'fcfs_tiebreak';

export interface Allocation {
  id: string;
  requestId: string;
  resourceId: string;
  resourceName: string;
  farmerId: string;
  farmerName: string;
  providerId: string;
  providerName: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: AllocationStatus;
  priorityScore: number;
  priorityBreakdown: PriorityBreakdown;
  allocationMethod: AllocationMethod;
  fcfsTiebreak?: boolean;
  tiebreakExplanation?: string;
  createdAt: string;
}

// ─── Conflict ─────────────────────────────────────────────────────────────────
export type ConflictStatus = 'open' | 'resolved' | 'escalated' | 'auto_resolved';
export type ConflictResolution = 'approved_top' | 'override' | 'split' | 'alternative' | 'auto_priority' | 'auto_fcfs';

export interface Conflict {
  id: string;
  resourceId: string;
  resourceName: string;
  requestIds: string[];
  rankedRequests: Array<{
    requestId: string;
    farmerName: string;
    priorityScore: number;
    rank: number;
  }>;
  scoreDelta: number;
  status: ConflictStatus;
  resolution?: ConflictResolution;
  adminNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  autoResolved?: boolean;
  winnerRequestId?: string;
  createdAt: string;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
export interface Schedule {
  id: string;
  allocationId: string;
  resourceId: string;
  resourceName: string;
  farmerId: string;
  farmerName: string;
  start: string;
  end: string;
  status: AllocationStatus;
  allocationMethod?: AllocationMethod;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
export type AuditEventType =
  | 'REQUEST_CREATED'
  | 'RESOURCE_MATCHED'
  | 'CONFLICT_DETECTED'
  | 'PRIORITY_CALCULATED'
  | 'AUTO_ALLOCATED'
  | 'FCFS_TIE_BREAK'
  | 'WAITLISTED'
  | 'DISRUPTION_DETECTED'
  | 'REALLOCATION_PERFORMED'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'FAIRNESS_GUARD_ACTIVATED'
  | 'CONFLICT_RESOLVED'
  | 'ALLOCATION_CREATED'
  | 'PROVIDER_APPROVED'
  | 'USER_SUSPENDED';

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

// ─── Fairness ─────────────────────────────────────────────────────────────────
export type StarvationRisk = 'low' | 'medium' | 'high';

export interface FairnessEvent {
  id: string;
  farmerId: string;
  timestamp: string;
  eventType: 'request_submitted' | 'allocation_failed' | 'allocation_success' | 'fairness_guard_activated' | 'waitlisted';
  details: string;
  priorityScore?: number;
  winnerScore?: number;
  winnerFarmerName?: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface AdminStats {
  totalFarmers: number;
  totalProviders: number;
  totalResources: number;
  pendingRequests: number;
  activeAllocations: number;
  openConflicts: number;
  resolvedToday: number;
  autoAllocated?: number;
  manualReview?: number;
  waitlisted?: number;
  autoResolutionRate?: number;
}

export interface FarmerStats {
  activeRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  allocatedResources: number;
  scheduledResources?: number;
  waitlistedRequests?: number;
}

export interface ProviderStats {
  totalResources: number;
  activeBookings: number;
  upcomingJobs: number;
  utilizationRate: number;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Allocation Engine Result ─────────────────────────────────────────────────
export interface AllocationResult {
  success: boolean;
  method: 'auto' | 'fcfs_tiebreak' | 'waitlisted' | 'manual_review' | 'no_resource' | 'conflict_resolved' | 'admin_override';
  requestId: string;
  allocation?: Allocation;
  conflictId?: string;
  message: string;
  tiebreakExplanation?: string;
  manualReviewReason?: string;
}

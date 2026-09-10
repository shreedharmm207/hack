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
  | 'pending' | 'processing' | 'approved' | 'allocated'
  | 'rejected' | 'cancelled' | 'completed';

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
  createdAt: string;
}

// ─── Conflict ─────────────────────────────────────────────────────────────────
export type ConflictStatus = 'open' | 'resolved' | 'escalated';
export type ConflictResolution = 'approved_top' | 'override' | 'split' | 'alternative';

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

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface AdminStats {
  totalFarmers: number;
  totalProviders: number;
  totalResources: number;
  pendingRequests: number;
  activeAllocations: number;
  openConflicts: number;
  resolvedToday: number;
}

export interface FarmerStats {
  activeRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  allocatedResources: number;
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

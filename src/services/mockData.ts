import type {
  Farmer, Provider, Resource, ResourceRequest, Allocation,
  Conflict, Notification, AuditLog, Schedule, User,
  AdminStats, FarmerStats, ProviderStats
} from '../types';
import { calculatePriority } from '../utils/priorityEngine';

// ─── Seed Users ─────────────────────────────────────────────────────────────
export const MOCK_USERS: User[] = [
  { id: 'u1', email: 'admin@farmgrid.in', role: 'admin', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'u2', email: 'rajan@farmer.in', role: 'farmer', createdAt: '2024-02-10T00:00:00Z' },
  { id: 'u3', email: 'priya@farmer.in', role: 'farmer', createdAt: '2024-02-15T00:00:00Z' },
  { id: 'u4', email: 'suresh@farmer.in', role: 'farmer', createdAt: '2024-03-01T00:00:00Z' },
  { id: 'u5', email: 'agrotech@provider.in', role: 'provider', createdAt: '2024-01-20T00:00:00Z' },
  { id: 'u6', email: 'ngo_farms@provider.in', role: 'provider', createdAt: '2024-01-25T00:00:00Z' },
];

export const MOCK_FARMERS: Farmer[] = [
  {
    id: 'f1', userId: 'u2', name: 'Rajan Verma', mobile: '9876543210',
    village: 'Khargpur', district: 'Wardha', state: 'Maharashtra',
    lat: 20.7449, lng: 78.6019, farmSize: 12, cropType: 'Soybean',
    cropStage: 'flowering', createdAt: '2024-02-10T00:00:00Z',
  },
  {
    id: 'f2', userId: 'u3', name: 'Priya Sharma', mobile: '9876543211',
    village: 'Hingoli', district: 'Hingoli', state: 'Maharashtra',
    lat: 19.7197, lng: 77.1498, farmSize: 8, cropType: 'Cotton',
    cropStage: 'harvesting', createdAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'f3', userId: 'u4', name: 'Suresh Patel', mobile: '9876543212',
    village: 'Dhar', district: 'Dhar', state: 'Madhya Pradesh',
    lat: 22.5985, lng: 75.2990, farmSize: 20, cropType: 'Wheat',
    cropStage: 'vegetative', createdAt: '2024-03-01T00:00:00Z',
  },
];

export const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'p1', userId: 'u5', orgName: 'AgroTech Solutions Pvt Ltd',
    contactPerson: 'Vikram Singh', contactNumber: '9900112233',
    address: '45 Industrial Area, Nagpur, Maharashtra',
    operationalRegion: 'Vidarbha, Maharashtra',
    providerType: 'private_company', isApproved: true,
    createdAt: '2024-01-20T00:00:00Z',
  },
  {
    id: 'p2', userId: 'u6', orgName: 'Kisan Sahayak Cooperative Society',
    contactPerson: 'Anita Desai', contactNumber: '9900112244',
    address: 'Village Road, Amravati, Maharashtra',
    operationalRegion: 'Amravati Division, Maharashtra',
    providerType: 'cooperative', isApproved: true,
    createdAt: '2024-01-25T00:00:00Z',
  },
];

export const MOCK_RESOURCES: Resource[] = [
  {
    id: 'r1', providerId: 'p1', providerName: 'AgroTech Solutions Pvt Ltd',
    name: 'John Deere 5050D Tractor', category: 'tractor',
    description: '50 HP 4WD tractor with rotavator attachment', quantity: 3,
    status: 'available', dailyRate: 2500, lat: 20.7001, lng: 78.6501,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'r2', providerId: 'p1', providerName: 'AgroTech Solutions Pvt Ltd',
    name: 'New Holland TC5.90 Harvester', category: 'harvester',
    description: 'Self-propelled combine harvester for wheat and soybean', quantity: 1,
    status: 'available', dailyRate: 8000, lat: 20.7001, lng: 78.6501,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'r3', providerId: 'p2', providerName: 'Kisan Sahayak Cooperative Society',
    name: 'Kirloskar Water Pump Set', category: 'portable_pump',
    description: '10 HP centrifugal pump, 100m head, diesel powered', quantity: 5,
    status: 'available', dailyRate: 800, lat: 19.7500, lng: 77.1800,
    createdAt: '2024-02-05T00:00:00Z',
  },
  {
    id: 'r4', providerId: 'p2', providerName: 'Kisan Sahayak Cooperative Society',
    name: 'Drip Irrigation Kit (1 acre)', category: 'drip_irrigation',
    description: 'Complete drip irrigation system for 1 acre, includes emitters & pipes', quantity: 10,
    status: 'allocated', dailyRate: 600, lat: 19.7500, lng: 77.1800,
    createdAt: '2024-02-05T00:00:00Z',
  },
  {
    id: 'r5', providerId: 'p1', providerName: 'AgroTech Solutions Pvt Ltd',
    name: 'Ag Drone DJI T30', category: 'drone_spraying',
    description: '30L tank drone sprayer, covers 40 acres/day, GPS guided', quantity: 2,
    status: 'maintenance', dailyRate: 3500, lat: 20.7001, lng: 78.6501,
    createdAt: '2024-02-10T00:00:00Z',
  },
  {
    id: 'r6', providerId: 'p2', providerName: 'Kisan Sahayak Cooperative Society',
    name: 'Agricultural Labour Team (10 members)', category: 'labour_team',
    description: 'Trained team of 10 agricultural workers for harvesting and planting', quantity: 3,
    status: 'available', dailyRate: 5000, lat: 19.7500, lng: 77.1800,
    createdAt: '2024-02-05T00:00:00Z',
  },
];

const now = new Date();
const d = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86400000).toISOString();

const baseRequest1: ResourceRequest = {
  id: 'req1', farmerId: 'f1', farmerName: 'Rajan Verma',
  resourceType: 'harvester', resourceNeeded: 'Combine harvester for soybean harvest',
  earliestStart: d(1), latestEnd: d(6), durationDays: 2,
  cropStage: 'harvesting', urgencyLevel: 'critical',
  urgencyReason: 'Rains forecast in 5 days, harvest must complete before that.',
  lat: 20.7449, lng: 78.6019, additionalNotes: 'Night harvesting support needed',
  status: 'processing', createdAt: d(-3), syncStatus: 'synced',
};

const baseRequest2: ResourceRequest = {
  id: 'req2', farmerId: 'f2', farmerName: 'Priya Sharma',
  resourceType: 'harvester', resourceNeeded: 'Harvester for cotton picking',
  earliestStart: d(2), latestEnd: d(8), durationDays: 3,
  cropStage: 'harvesting', urgencyLevel: 'high',
  urgencyReason: 'Cotton is over-mature, risk of quality loss.',
  lat: 19.7197, lng: 77.1498, additionalNotes: '',
  status: 'processing', createdAt: d(-1), syncStatus: 'synced',
};

const baseRequest3: ResourceRequest = {
  id: 'req3', farmerId: 'f3', farmerName: 'Suresh Patel',
  resourceType: 'tractor', resourceNeeded: 'Tractor with rotavator for land preparation',
  earliestStart: d(3), latestEnd: d(15), durationDays: 4,
  cropStage: 'vegetative', urgencyLevel: 'medium',
  urgencyReason: 'Need to prepare for next sowing season.',
  lat: 22.5985, lng: 75.2990, additionalNotes: 'Prefer 4WD model',
  status: 'approved', createdAt: d(-7), syncStatus: 'synced',
};

const baseRequest4: ResourceRequest = {
  id: 'req4', farmerId: 'f1', farmerName: 'Rajan Verma',
  resourceType: 'portable_pump', resourceNeeded: 'Water pump for irrigation',
  earliestStart: d(-5), latestEnd: d(-1), durationDays: 3,
  cropStage: 'flowering', urgencyLevel: 'high',
  urgencyReason: 'Dry spell affecting flowering stage.',
  lat: 20.7449, lng: 78.6019, additionalNotes: '',
  status: 'completed', createdAt: d(-15), syncStatus: 'synced',
};

export const MOCK_REQUESTS: ResourceRequest[] = [baseRequest1, baseRequest2, baseRequest3, baseRequest4];

const pb1 = calculatePriority(baseRequest1, 20.7001, 78.6501, 1, 2);
const pb2 = calculatePriority(baseRequest2, 20.7001, 78.6501, 1, 2);
const pb3 = calculatePriority(baseRequest3, 20.7001, 78.6501, 3, 1);

export const MOCK_ALLOCATIONS: Allocation[] = [
  {
    id: 'a1', requestId: 'req3', resourceId: 'r1', resourceName: 'John Deere 5050D Tractor',
    farmerId: 'f3', farmerName: 'Suresh Patel', providerId: 'p1', providerName: 'AgroTech Solutions Pvt Ltd',
    scheduledStart: d(3), scheduledEnd: d(7), status: 'scheduled',
    priorityScore: pb3.total, priorityBreakdown: pb3, createdAt: d(-6),
  },
  {
    id: 'a2', requestId: 'req4', resourceId: 'r3', resourceName: 'Kirloskar Water Pump Set',
    farmerId: 'f1', farmerName: 'Rajan Verma', providerId: 'p2', providerName: 'Kisan Sahayak Cooperative Society',
    scheduledStart: d(-5), scheduledEnd: d(-2), status: 'completed',
    priorityScore: 72, priorityBreakdown: { urgency: 18, weatherRisk: 18, cropStage: 17, waitingTime: 10, logistics: 6, constraints: 3, total: 72, explanation: 'Standard allocation' },
    createdAt: d(-14),
  },
];

export const MOCK_CONFLICTS: Conflict[] = [
  {
    id: 'c1', resourceId: 'r2', resourceName: 'New Holland TC5.90 Harvester',
    requestIds: ['req1', 'req2'],
    rankedRequests: [
      { requestId: 'req1', farmerName: 'Rajan Verma', priorityScore: pb1.total, rank: 1 },
      { requestId: 'req2', farmerName: 'Priya Sharma', priorityScore: pb2.total, rank: 2 },
    ],
    scoreDelta: Math.abs(pb1.total - pb2.total),
    status: 'open',
    createdAt: d(-1),
  },
];

export const MOCK_SCHEDULES: Schedule[] = [
  {
    id: 's1', allocationId: 'a1', resourceId: 'r1', resourceName: 'John Deere 5050D Tractor',
    farmerId: 'f3', farmerName: 'Suresh Patel',
    start: d(3), end: d(7), status: 'scheduled',
  },
  {
    id: 's2', allocationId: 'a2', resourceId: 'r3', resourceName: 'Kirloskar Water Pump Set',
    farmerId: 'f1', farmerName: 'Rajan Verma',
    start: d(-5), end: d(-2), status: 'completed',
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1', userId: 'u2',
    title: 'Request Submitted',
    message: 'Your request for a Harvester has been submitted and is under review.',
    type: 'info', isRead: false, createdAt: d(-3),
  },
  {
    id: 'n2', userId: 'u2',
    title: 'Conflict Detected',
    message: 'Your harvester request is in conflict with another farmer. Admin review pending.',
    type: 'warning', isRead: false, createdAt: d(-1),
  },
  {
    id: 'n3', userId: 'u4',
    title: 'Resource Allocated!',
    message: 'A John Deere 5050D Tractor has been allocated to you from ' + formatDate(d(3)) + '.',
    type: 'success', isRead: false, createdAt: d(-6),
  },
  {
    id: 'n4', userId: 'u1',
    title: 'New Conflict in Queue',
    message: 'A scheduling conflict for the Harvester requires admin resolution.',
    type: 'warning', isRead: false, createdAt: d(-1),
  },
];

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'al1', adminId: 'u1', adminName: 'System Admin',
    action: 'ALLOCATION_CREATED', entityType: 'Allocation', entityId: 'a1',
    details: 'Resource Tractor allocated to Suresh Patel (req3). Priority score: ' + pb3.total,
    createdAt: d(-6),
  },
  {
    id: 'al2', adminId: 'u1', adminName: 'System Admin',
    action: 'PROVIDER_APPROVED', entityType: 'Provider', entityId: 'p1',
    details: 'AgroTech Solutions Pvt Ltd approved as resource provider.',
    createdAt: d(-20),
  },
];

// ─── Stats ───────────────────────────────────────────────────────────────────
export const MOCK_ADMIN_STATS: AdminStats = {
  totalFarmers: 3,
  totalProviders: 2,
  totalResources: 6,
  pendingRequests: 2,
  activeAllocations: 1,
  openConflicts: 1,
  resolvedToday: 0,
};

export function getFarmerStats(farmerId: string): FarmerStats {
  const farmerRequests = MOCK_REQUESTS.filter(r => r.farmerId === farmerId);
  return {
    activeRequests: farmerRequests.filter(r => r.status === 'processing').length,
    approvedRequests: farmerRequests.filter(r => r.status === 'approved' || r.status === 'allocated').length,
    pendingRequests: farmerRequests.filter(r => r.status === 'pending').length,
    allocatedResources: farmerRequests.filter(r => r.status === 'allocated' || r.status === 'completed').length,
  };
}

export const MOCK_PROVIDER_STATS: ProviderStats = {
  totalResources: 6,
  activeBookings: 1,
  upcomingJobs: 1,
  utilizationRate: 42,
};

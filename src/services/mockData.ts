import type {
  Farmer, Provider, Resource, ResourceRequest, Allocation,
  Conflict, Notification, AuditLog, Schedule, User,
  AdminStats, FarmerStats, ProviderStats, FairnessEvent
} from '../types';
import { calculatePriority } from '../utils/priorityEngine';

// ─── Seed Users ─────────────────────────────────────────────────────────────
export const MOCK_USERS: User[] = [
  { id: 'u1', email: 'admin@farmgrid.in', role: 'admin', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'u2', email: 'rajan@farmer.in', role: 'farmer', createdAt: '2024-02-10T00:00:00Z' },
  { id: 'u3', email: 'priya@farmer.in', role: 'farmer', createdAt: '2024-02-15T00:00:00Z' },
  { id: 'u4', email: 'suresh@farmer.in', role: 'farmer', createdAt: '2024-03-01T00:00:00Z' },
  { id: 'u7', email: 'anita@farmer.in', role: 'farmer', createdAt: '2024-03-05T00:00:00Z' },
  { id: 'u8', email: 'ramesh@farmer.in', role: 'farmer', createdAt: '2024-03-10T00:00:00Z' },
  { id: 'u5', email: 'agrotech@provider.in', role: 'provider', createdAt: '2024-01-20T00:00:00Z' },
  { id: 'u6', email: 'ngo_farms@provider.in', role: 'provider', createdAt: '2024-01-25T00:00:00Z' },
];

export const MOCK_FARMERS: Farmer[] = [
  {
    id: 'f1', userId: 'u2', name: 'Rajan Verma', mobile: '9876543210',
    village: 'Khargpur', district: 'Wardha', state: 'Maharashtra',
    lat: 20.7449, lng: 78.6019, farmSize: 12, cropType: 'Soybean',
    cropStage: 'harvesting', createdAt: '2024-02-10T00:00:00Z',
    allocationAttempts: 2, successfulAllocations: 0, consecutiveLosses: 2, waitingStartedAt: null,
  },
  {
    id: 'f2', userId: 'u3', name: 'Priya Sharma', mobile: '9876543211',
    village: 'Hingoli', district: 'Hingoli', state: 'Maharashtra',
    lat: 19.7197, lng: 77.1498, farmSize: 8, cropType: 'Cotton',
    cropStage: 'harvesting', createdAt: '2024-02-15T00:00:00Z',
    allocationAttempts: 1, successfulAllocations: 1, consecutiveLosses: 0, waitingStartedAt: null,
  },
  {
    id: 'f3', userId: 'u4', name: 'Suresh Patel', mobile: '9876543212',
    village: 'Dhar', district: 'Dhar', state: 'Madhya Pradesh',
    lat: 22.5985, lng: 75.2990, farmSize: 20, cropType: 'Wheat',
    cropStage: 'vegetative', createdAt: '2024-03-01T00:00:00Z',
    allocationAttempts: 5, successfulAllocations: 1, consecutiveLosses: 4, waitingStartedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
  },
  {
    id: 'f4', userId: 'u7', name: 'Anita Rao', mobile: '9876543213',
    village: 'Nanded', district: 'Nanded', state: 'Maharashtra',
    lat: 19.1383, lng: 77.3210, farmSize: 6, cropType: 'Rice',
    cropStage: 'harvesting', createdAt: '2024-03-05T00:00:00Z',
    allocationAttempts: 1, successfulAllocations: 0, consecutiveLosses: 1, waitingStartedAt: null,
  },
  {
    id: 'f5', userId: 'u8', name: 'Ramesh Kumar', mobile: '9876543214',
    village: 'Aurangabad', district: 'Aurangabad', state: 'Maharashtra',
    lat: 19.8762, lng: 75.3433, farmSize: 15, cropType: 'Sugarcane',
    cropStage: 'vegetative', createdAt: '2024-03-10T00:00:00Z',
    allocationAttempts: 0, successfulAllocations: 0, consecutiveLosses: 0, waitingStartedAt: null,
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
    name: 'John Deere 5050D Tractor (Alpha)', category: 'tractor',
    description: '50 HP 4WD tractor with rotavator attachment', quantity: 1,
    status: 'available', dailyRate: 2500, lat: 20.7001, lng: 78.6501,
    operatingHoursStart: 6, operatingHoursEnd: 20,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'r2', providerId: 'p1', providerName: 'AgroTech Solutions Pvt Ltd',
    name: 'John Deere 5050D Tractor (Beta)', category: 'tractor',
    description: '50 HP 4WD tractor — second unit', quantity: 1,
    status: 'available', dailyRate: 2500, lat: 20.7001, lng: 78.6501,
    operatingHoursStart: 6, operatingHoursEnd: 20,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'r3', providerId: 'p1', providerName: 'AgroTech Solutions Pvt Ltd',
    name: 'New Holland TC5.90 Harvester', category: 'harvester',
    description: 'Self-propelled combine harvester for wheat and soybean', quantity: 1,
    status: 'available', dailyRate: 8000, lat: 20.7001, lng: 78.6501,
    operatingHoursStart: 7, operatingHoursEnd: 19,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'r4', providerId: 'p2', providerName: 'Kisan Sahayak Cooperative Society',
    name: 'Kirloskar Water Pump Set', category: 'portable_pump',
    description: '10 HP centrifugal pump, 100m head, diesel powered', quantity: 5,
    status: 'available', dailyRate: 800, lat: 19.7500, lng: 77.1800,
    operatingHoursStart: 5, operatingHoursEnd: 22,
    createdAt: '2024-02-05T00:00:00Z',
  },
  {
    id: 'r5', providerId: 'p2', providerName: 'Kisan Sahayak Cooperative Society',
    name: 'Drip Irrigation Kit (1 acre)', category: 'drip_irrigation',
    description: 'Complete drip irrigation system for 1 acre', quantity: 10,
    status: 'allocated', dailyRate: 600, lat: 19.7500, lng: 77.1800,
    operatingHoursStart: 0, operatingHoursEnd: 24,
    createdAt: '2024-02-05T00:00:00Z',
  },
  {
    id: 'r6', providerId: 'p1', providerName: 'AgroTech Solutions Pvt Ltd',
    name: 'Ag Drone DJI T30', category: 'drone_spraying',
    description: '30L tank drone sprayer, covers 40 acres/day, GPS guided', quantity: 2,
    status: 'maintenance', dailyRate: 3500, lat: 20.7001, lng: 78.6501,
    operatingHoursStart: 8, operatingHoursEnd: 18,
    createdAt: '2024-02-10T00:00:00Z',
  },
  {
    id: 'r7', providerId: 'p2', providerName: 'Kisan Sahayak Cooperative Society',
    name: 'Agricultural Labour Team (10 members)', category: 'labour_team',
    description: 'Trained team of 10 agricultural workers', quantity: 3,
    status: 'available', dailyRate: 5000, lat: 19.7500, lng: 77.1800,
    operatingHoursStart: 6, operatingHoursEnd: 18,
    createdAt: '2024-02-05T00:00:00Z',
  },
];

const now = new Date();
const d = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86400000).toISOString();

// ─── Seed Requests (for demo conflict scenario) ────────────────────────────
// req1, req2, req3 all compete for the same tractor window — classic conflict
export const MOCK_REQUESTS: ResourceRequest[] = [
  {
    id: 'req1', farmerId: 'f1', farmerName: 'Rajan Verma',
    resourceType: 'harvester', resourceNeeded: 'Combine harvester for soybean harvest',
    earliestStart: d(1), latestEnd: d(6), durationDays: 2,
    cropStage: 'harvesting', urgencyLevel: 'critical',
    urgencyReason: 'Rains forecast in 5 days, harvest must complete before that.',
    lat: 20.7449, lng: 78.6019, additionalNotes: 'Night harvesting support needed',
    status: 'scheduled', createdAt: d(-3), syncStatus: 'synced',
    allocatedResourceId: 'r3', allocationMethod: 'auto',
    priorityScore: 89,
  },
  {
    id: 'req2', farmerId: 'f2', farmerName: 'Priya Sharma',
    resourceType: 'harvester', resourceNeeded: 'Harvester for cotton picking',
    earliestStart: d(2), latestEnd: d(8), durationDays: 3,
    cropStage: 'harvesting', urgencyLevel: 'high',
    urgencyReason: 'Cotton is over-mature, risk of quality loss.',
    lat: 19.7197, lng: 77.1498, additionalNotes: '',
    status: 'waitlisted', createdAt: d(-1), syncStatus: 'synced',
    waitlistReason: 'Harvester allocated to Rajan Verma (higher priority score: 89 vs 74)',
    priorityScore: 74,
  },
  {
    id: 'req3', farmerId: 'f3', farmerName: 'Suresh Patel',
    resourceType: 'tractor', resourceNeeded: 'Tractor with rotavator for land preparation',
    earliestStart: d(3), latestEnd: d(15), durationDays: 4,
    cropStage: 'vegetative', urgencyLevel: 'medium',
    urgencyReason: 'Need to prepare for next sowing season.',
    lat: 22.5985, lng: 75.2990, additionalNotes: 'Prefer 4WD model',
    status: 'waitlisted', createdAt: d(-7), syncStatus: 'synced',
    waitlistReason: 'No tractor available in requested window. Fairness Guard active — waiting time elevated.',
    priorityScore: 61,
  },
  {
    id: 'req4', farmerId: 'f1', farmerName: 'Rajan Verma',
    resourceType: 'portable_pump', resourceNeeded: 'Water pump for irrigation',
    earliestStart: d(-5), latestEnd: d(-1), durationDays: 3,
    cropStage: 'flowering', urgencyLevel: 'high',
    urgencyReason: 'Dry spell affecting flowering stage.',
    lat: 20.7449, lng: 78.6019, additionalNotes: '',
    status: 'completed', createdAt: d(-15), syncStatus: 'synced',
    allocatedResourceId: 'r4', allocationMethod: 'auto',
  },
  {
    id: 'req5', farmerId: 'f4', farmerName: 'Anita Rao',
    resourceType: 'tractor', resourceNeeded: 'Tractor for rice field harvesting prep',
    earliestStart: d(1), latestEnd: d(5), durationDays: 2,
    cropStage: 'harvesting', urgencyLevel: 'high',
    urgencyReason: 'Rice crop ready and cannot delay further.',
    lat: 19.1383, lng: 77.3210, additionalNotes: '',
    status: 'scheduled', createdAt: d(-2), syncStatus: 'synced',
    allocatedResourceId: 'r1', allocationMethod: 'auto',
    priorityScore: 82,
  },
  {
    id: 'req6', farmerId: 'f5', farmerName: 'Ramesh Kumar',
    resourceType: 'tractor', resourceNeeded: 'Tractor for sugarcane field preparation',
    earliestStart: d(6), latestEnd: d(12), durationDays: 3,
    cropStage: 'vegetative', urgencyLevel: 'medium',
    urgencyReason: 'Seasonal prep before monsoon ends.',
    lat: 19.8762, lng: 75.3433, additionalNotes: 'Prefer early morning slot',
    status: 'submitted', createdAt: d(0), syncStatus: 'synced',
    priorityScore: 55,
  },
];

const pb1 = calculatePriority(MOCK_REQUESTS[0], 20.7001, 78.6501, 1, 2);
const pb3 = calculatePriority(MOCK_REQUESTS[2], 20.7001, 78.6501, 1, 2);
const pb5 = calculatePriority(MOCK_REQUESTS[4], 20.7001, 78.6501, 1, 2);

export const MOCK_ALLOCATIONS: Allocation[] = [
  {
    id: 'a1', requestId: 'req1', resourceId: 'r3', resourceName: 'New Holland TC5.90 Harvester',
    farmerId: 'f1', farmerName: 'Rajan Verma', providerId: 'p1', providerName: 'AgroTech Solutions Pvt Ltd',
    scheduledStart: d(1), scheduledEnd: d(3), status: 'scheduled',
    priorityScore: pb1.total, priorityBreakdown: pb1,
    allocationMethod: 'auto',
    createdAt: d(-3),
  },
  {
    id: 'a2', requestId: 'req4', resourceId: 'r4', resourceName: 'Kirloskar Water Pump Set',
    farmerId: 'f1', farmerName: 'Rajan Verma', providerId: 'p2', providerName: 'Kisan Sahayak Cooperative Society',
    scheduledStart: d(-5), scheduledEnd: d(-2), status: 'completed',
    priorityScore: 72, priorityBreakdown: { urgency: 18, weatherRisk: 18, cropStage: 17, waitingTime: 10, logistics: 6, constraints: 3, total: 72, explanation: 'Auto-allocated: irrigation pump during dry spell.' },
    allocationMethod: 'auto',
    createdAt: d(-14),
  },
  {
    id: 'a3', requestId: 'req5', resourceId: 'r1', resourceName: 'John Deere 5050D Tractor (Alpha)',
    farmerId: 'f4', farmerName: 'Anita Rao', providerId: 'p1', providerName: 'AgroTech Solutions Pvt Ltd',
    scheduledStart: d(1), scheduledEnd: d(3), status: 'scheduled',
    priorityScore: pb5.total, priorityBreakdown: pb5,
    allocationMethod: 'auto',
    createdAt: d(-2),
  },
];

export const MOCK_CONFLICTS: Conflict[] = [
  {
    id: 'c1', resourceId: 'r3', resourceName: 'New Holland TC5.90 Harvester',
    requestIds: ['req1', 'req2'],
    rankedRequests: [
      { requestId: 'req1', farmerName: 'Rajan Verma', priorityScore: pb1.total, rank: 1 },
      { requestId: 'req2', farmerName: 'Priya Sharma', priorityScore: 74, rank: 2 },
    ],
    scoreDelta: Math.abs(pb1.total - 74),
    status: 'auto_resolved',
    resolution: 'auto_priority',
    resolvedBy: 'FarmGrid Engine',
    resolvedAt: d(-3),
    autoResolved: true,
    winnerRequestId: 'req1',
    createdAt: d(-3),
  },
];

export const MOCK_SCHEDULES: Schedule[] = [
  {
    id: 's1', allocationId: 'a1', resourceId: 'r3', resourceName: 'New Holland TC5.90 Harvester',
    farmerId: 'f1', farmerName: 'Rajan Verma',
    start: d(1), end: d(3), status: 'scheduled', allocationMethod: 'auto',
  },
  {
    id: 's2', allocationId: 'a2', resourceId: 'r4', resourceName: 'Kirloskar Water Pump Set',
    farmerId: 'f1', farmerName: 'Rajan Verma',
    start: d(-5), end: d(-2), status: 'completed', allocationMethod: 'auto',
  },
  {
    id: 's3', allocationId: 'a3', resourceId: 'r1', resourceName: 'John Deere 5050D Tractor (Alpha)',
    farmerId: 'f4', farmerName: 'Anita Rao',
    start: d(1), end: d(3), status: 'scheduled', allocationMethod: 'auto',
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1', userId: 'u2',
    title: '✅ Resource Allocated!',
    message: 'New Holland TC5.90 Harvester has been automatically allocated to you from ' + formatDate(d(1)) + '.',
    type: 'success', isRead: false, createdAt: d(-3),
  },
  {
    id: 'n2', userId: 'u3',
    title: '⏳ Request Waitlisted',
    message: 'Your harvester request was waitlisted. Rajan Verma had a higher priority score (89 vs 74). Check What-If to explore options.',
    type: 'warning', isRead: false, createdAt: d(-3),
  },
  {
    id: 'n3', userId: 'u4',
    title: '⚠️ Fairness Guard Active',
    message: 'You have had 4 consecutive unsuccessful requests. FarmGrid is prioritizing your waiting time contribution.',
    type: 'warning', isRead: false, createdAt: d(-1),
  },
  {
    id: 'n4', userId: 'u7',
    title: '✅ Tractor Allocated!',
    message: 'John Deere 5050D Tractor (Alpha) has been automatically allocated to you from ' + formatDate(d(1)) + '.',
    type: 'success', isRead: false, createdAt: d(-2),
  },
  {
    id: 'n5', userId: 'u1',
    title: 'ℹ️ Automation Report',
    message: 'FarmGrid auto-allocated 3 resources today. 0 manual review required. 1 conflict auto-resolved.',
    type: 'info', isRead: false, createdAt: d(0),
  },
  {
    id: 'n6', userId: 'u5',
    title: '📋 New Booking: Harvester',
    message: 'Harvester allocated to Rajan Verma for ' + formatDate(d(1)) + ' to ' + formatDate(d(3)) + '. Priority: 89/100.',
    type: 'info', isRead: false, createdAt: d(-3),
  },
  {
    id: 'n7', userId: 'u5',
    title: '📋 New Booking: Tractor Alpha',
    message: 'Tractor (Alpha) allocated to Anita Rao for ' + formatDate(d(1)) + ' to ' + formatDate(d(3)) + '.',
    type: 'info', isRead: false, createdAt: d(-2),
  },
];

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'al1', adminId: 'system', adminName: 'FarmGrid Engine',
    action: 'AUTO_ALLOCATED', entityType: 'Allocation', entityId: 'a1',
    details: 'Harvester auto-allocated to Rajan Verma (req1). Priority: ' + pb1.total + '/100. Conflict with Priya Sharma auto-resolved by priority.',
    createdAt: d(-3),
  },
  {
    id: 'al2', adminId: 'system', adminName: 'FarmGrid Engine',
    action: 'CONFLICT_DETECTED', entityType: 'Conflict', entityId: 'c1',
    details: 'Conflict detected: Harvester requested by Rajan (89pts) and Priya (74pts). Score delta = 15. Auto-resolving by priority.',
    createdAt: d(-3),
  },
  {
    id: 'al3', adminId: 'system', adminName: 'FarmGrid Engine',
    action: 'WAITLISTED', entityType: 'Request', entityId: 'req2',
    details: 'Priya Sharma (req2) waitlisted. Lower priority score (74 vs 89). Reason: Rajan Verma had critical urgency + high weather risk.',
    createdAt: d(-3),
  },
  {
    id: 'al4', adminId: 'system', adminName: 'FarmGrid Engine',
    action: 'AUTO_ALLOCATED', entityType: 'Allocation', entityId: 'a3',
    details: 'Tractor (Alpha) auto-allocated to Anita Rao (req5). Priority: ' + pb5.total + '/100. No competing request.',
    createdAt: d(-2),
  },
  {
    id: 'al5', adminId: 'system', adminName: 'FarmGrid Engine',
    action: 'FAIRNESS_GUARD_ACTIVATED', entityType: 'Farmer', entityId: 'f3',
    details: 'Fairness Guard activated for Suresh Patel. 4 consecutive unsuccessful allocations. 18+ hours waiting. Waiting-time factor elevated to 14/15.',
    createdAt: d(-1),
  },
  {
    id: 'al6', adminId: 'u1', adminName: 'System Admin',
    action: 'PROVIDER_APPROVED', entityType: 'Provider', entityId: 'p1',
    details: 'AgroTech Solutions Pvt Ltd approved as resource provider.',
    createdAt: d(-20),
  },
];

// ─── Fairness Events ─────────────────────────────────────────────────────────
export const MOCK_FAIRNESS_EVENTS: FairnessEvent[] = [
  {
    id: 'fe1', farmerId: 'f3', timestamp: d(-8),
    eventType: 'request_submitted', details: 'Tractor request submitted for land preparation.',
    priorityScore: 58,
  },
  {
    id: 'fe2', farmerId: 'f3', timestamp: d(-7),
    eventType: 'allocation_failed', details: 'Allocation unsuccessful — tractor allocated to Anita Rao (higher weather risk score).',
    priorityScore: 58, winnerScore: 82, winnerFarmerName: 'Anita Rao',
  },
  {
    id: 'fe3', farmerId: 'f3', timestamp: d(-5),
    eventType: 'request_submitted', details: 'Second tractor request submitted.',
    priorityScore: 60,
  },
  {
    id: 'fe4', farmerId: 'f3', timestamp: d(-4),
    eventType: 'allocation_failed', details: 'Allocation unsuccessful — no tractor available in requested window.',
    priorityScore: 60,
  },
  {
    id: 'fe5', farmerId: 'f3', timestamp: d(-3),
    eventType: 'request_submitted', details: 'Third tractor request submitted.',
    priorityScore: 61,
  },
  {
    id: 'fe6', farmerId: 'f3', timestamp: d(-2),
    eventType: 'allocation_failed', details: 'Allocation unsuccessful — competing request had higher urgency.',
    priorityScore: 61, winnerScore: 79, winnerFarmerName: 'Rajan Verma',
  },
  {
    id: 'fe7', farmerId: 'f3', timestamp: d(-1),
    eventType: 'waitlisted', details: 'Fourth request submitted. Waitlisted due to competing demand.',
    priorityScore: 61,
  },
  {
    id: 'fe8', farmerId: 'f3', timestamp: d(-1),
    eventType: 'fairness_guard_activated', details: 'Fairness Guard activated. 4 consecutive losses. Waiting-time contribution elevated within 15-point limit.',
    priorityScore: 61,
  },
];

// ─── OTP Store (in-memory for demo) ─────────────────────────────────────────
export const OTP_STORE: Record<string, { code: string; expiry: number }> = {};

// ─── Stats ───────────────────────────────────────────────────────────────────
export const MOCK_ADMIN_STATS: AdminStats = {
  totalFarmers: 5,
  totalProviders: 2,
  totalResources: 7,
  pendingRequests: 1,
  activeAllocations: 2,
  openConflicts: 0,
  resolvedToday: 1,
  autoAllocated: 3,
  manualReview: 0,
  waitlisted: 2,
  autoResolutionRate: 100,
};

export function getFarmerStats(farmerId: string): FarmerStats {
  const farmerRequests = MOCK_REQUESTS.filter(r => r.farmerId === farmerId);
  return {
    activeRequests: farmerRequests.filter(r => r.status === 'processing' || r.status === 'submitted').length,
    approvedRequests: farmerRequests.filter(r => r.status === 'scheduled').length,
    pendingRequests: farmerRequests.filter(r => r.status === 'waitlisted' || r.status === 'conflict').length,
    allocatedResources: farmerRequests.filter(r => r.status === 'scheduled' || r.status === 'completed' || r.status === 'allocated').length,
    scheduledResources: farmerRequests.filter(r => r.status === 'scheduled').length,
    waitlistedRequests: farmerRequests.filter(r => r.status === 'waitlisted').length,
  };
}

export const MOCK_PROVIDER_STATS: ProviderStats = {
  totalResources: 7,
  activeBookings: 2,
  upcomingJobs: 2,
  utilizationRate: 58,
};

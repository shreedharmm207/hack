/**
 * FarmGrid Admin Slice — Supabase Backend
 * Real database reads. Admin reads ALL records regardless of RLS.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

export interface AdminStats {
  totalFarmers: number;
  totalOrganizations: number;
  totalProviders?: number;
  totalResources: number;
  pendingRequests: number;
  activeAllocations: number;
  openConflicts: number;
  resolvedToday: number;
  autoAllocated: number;
  waitlisted: number;
  manualReview: number;
  autoResolutionRate: number;
}

export interface AdminRequest {
  id: string;
  farmer_id: string;
  farmerName?: string;
  resource_type: string;
  resourceType?: string;
  resource_needed: string;
  resourceNeeded?: string;
  status: string;
  priority_score: number | null;
  priorityScore?: number | null;
  urgency_level: string;
  urgencyLevel?: string;
  manual_review_reason?: string | null;
  manualReviewReason?: string | null;
  created_at: string;
  createdAt?: string;
  farmer?: { name: string; village: string | null; district: string | null } | null;
  organization?: { org_name: string } | null;
  resource?: { name: string } | null;
  resourceName?: string;
  earliest_start?: string;
  latest_end?: string;
  orgName?: string;
}

export interface AdminAllocation {
  id: string;
  request_id: string;
  resource_id: string;
  farmer_id: string;
  organization_id: string;
  scheduled_start: string;
  scheduled_end: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  status: string;
  priority_score: number | null;
  priorityScore?: number | null;
  allocation_method: string;
  allocationMethod?: string;
  created_at: string;
  createdAt?: string;
  farmerName?: string;
  resourceName?: string;
  providerName?: string;
  farmer?: { name: string } | null;
  resource?: { name: string; category: string } | null;
  organization?: { org_name: string } | null;
}

export interface AdminConflict {
  id: string;
  resource_id: string;
  resourceId?: string;
  resourceName?: string;
  request_ids: string[];
  requestIds?: string[];
  ranked_requests: unknown[];
  rankedRequests?: any[];
  score_delta: number;
  scoreDelta?: number;
  status: string;
  resolution: string | null;
  winner_request_id: string | null;
  winnerRequestId?: string | null;
  resolved_by: string | null;
  resolvedBy?: string | null;
  resolved_at: string | null;
  resolvedAt?: string | null;
  auto_resolved: boolean;
  autoResolved?: boolean;
  admin_note: string | null;
  adminNote?: string | null;
  created_at: string;
  createdAt?: string;
  resource?: { name: string; category: string } | null;
}

export interface AdminAuditLog {
  id: string;
  actor_id: string | null;
  actor_name: string;
  adminName?: string;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entityType?: string;
  entity_id: string | null;
  entityId?: string | null;
  details: string | null;
  created_at: string;
  createdAt?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  created_at: string;
}

interface AdminState {
  stats: AdminStats | null;
  requests: AdminRequest[];
  allocations: AdminAllocation[];
  conflicts: AdminConflict[];
  auditLogs: AdminAuditLog[];
  users: AdminUser[];
  farmers: any[];
  providers: any[];
  resources: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  stats: null, requests: [], allocations: [], conflicts: [], auditLogs: [], users: [],
  farmers: [], providers: [], resources: [],
  isLoading: false, error: null,
};

// ─── LOAD ADMIN DASHBOARD ─────────────────────────────────────────────────────
export const loadAdminData = createAsyncThunk(
  'admin/loadData',
  async (_, { rejectWithValue }) => {
    const [
      { count: farmersCount, data: farmersData },
      { count: orgsCount, data: orgsData },
      { data: resourcesData },
      { data: requests },
      { data: allocations },
      { data: conflicts },
    ] = await Promise.all([
      (supabase.from('farmers') as any).select('*'),
      (supabase.from('organizations') as any).select('*'),
      (supabase.from('resources') as any).select('*, organization:organization_id (org_name)'),
      (supabase.from('requests') as any).select(`
        *, farmer:farmer_id (name, village, district),
        organization:organization_id (org_name),
        resource:resource_id (name)
      `).order('created_at', { ascending: false }).limit(100),
      (supabase.from('allocations') as any).select(`
        *, farmer:farmer_id (name),
        resource:resource_id (name, category),
        organization:organization_id (org_name)
      `).order('created_at', { ascending: false }).limit(100),
      (supabase.from('conflicts') as any).select(`
        *, resource:resource_id (name, category)
      `).order('created_at', { ascending: false }).limit(50),
    ]);

    const reqs = ((requests || []) as any[]).map(r => ({
      ...r,
      farmerName: r.farmer?.name || 'Farmer',
      resourceType: r.resource_type,
      resourceNeeded: r.resource_needed,
      priorityScore: r.priority_score,
      urgencyLevel: r.urgency_level,
      manualReviewReason: r.manual_review_reason,
      createdAt: r.created_at,
    })) as AdminRequest[];

    const allocs = ((allocations || []) as any[]).map(a => ({
      ...a,
      farmerName: a.farmer?.name || 'Farmer',
      resourceName: a.resource?.name || 'Assigned Resource',
      providerName: a.organization?.org_name || 'Provider',
      scheduledStart: a.scheduled_start,
      scheduledEnd: a.scheduled_end,
      priorityScore: a.priority_score,
      allocationMethod: a.allocation_method,
      createdAt: a.created_at,
    })) as AdminAllocation[];

    const confs = ((conflicts || []) as any[]).map(c => ({
      ...c,
      resourceId: c.resource_id,
      resourceName: c.resource?.name || 'Assigned Resource',
      requestIds: c.request_ids || [],
      rankedRequests: c.ranked_requests || [],
      scoreDelta: c.score_delta || 0,
      winnerRequestId: c.winner_request_id,
      resolvedBy: c.resolved_by,
      resolvedAt: c.resolved_at,
      autoResolved: c.auto_resolved,
      adminNote: c.admin_note,
      createdAt: c.created_at,
    })) as AdminConflict[];

    const mappedFarmers = ((farmersData || []) as any[]).map(f => ({
      ...f,
      farmSize: f.farm_size_acres,
      primaryCrop: f.primary_crop,
      cropStage: f.crop_stage,
      createdAt: f.created_at,
    }));

    const mappedProviders = ((orgsData || []) as any[]).map(o => ({
      ...o,
      orgName: o.org_name,
      contactPerson: o.contact_person,
      contactNumber: o.contact_number,
      operationalRegion: o.operational_region,
      orgType: o.org_type,
      isApproved: o.is_approved,
      createdAt: o.created_at,
    }));

    const mappedResources = ((resourcesData || []) as any[]).map(r => ({
      ...r,
      dailyRate: r.daily_rate,
      providerName: r.organization?.org_name || 'Provider',
      createdAt: r.created_at,
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const autoAllocated = reqs.filter(r => r.status === 'allocated' && new Date(r.created_at) > today).length;
    const resolvedToday = confs.filter(c => c.resolved_at && new Date(c.resolved_at) > today).length;
    const openConflicts = confs.filter(c => c.status === 'open').length;
    const totalResolved = confs.filter(c => c.status !== 'open').length;
    const autoResolved = confs.filter(c => c.auto_resolved).length;

    const stats: AdminStats = {
      totalFarmers: farmersCount || mappedFarmers.length,
      totalOrganizations: orgsCount || mappedProviders.length,
      totalProviders: orgsCount || mappedProviders.length,
      totalResources: mappedResources.length,
      pendingRequests: reqs.filter(r => ['submitted','validating','pending_conflict','manual_review'].includes(r.status)).length,
      activeAllocations: allocs.filter(a => ['scheduled','active','confirmed'].includes(a.status)).length,
      openConflicts,
      resolvedToday,
      autoAllocated,
      waitlisted: reqs.filter(r => r.status === 'waitlisted').length,
      manualReview: reqs.filter(r => r.status === 'manual_review').length,
      autoResolutionRate: totalResolved > 0 ? Math.round((autoResolved / totalResolved) * 100) : 0,
    };

    return {
      stats,
      requests: reqs,
      allocations: allocs,
      conflicts: confs,
      farmers: mappedFarmers,
      providers: mappedProviders,
      resources: mappedResources,
    };
  }
);

// ─── LOAD AUDIT LOGS ─────────────────────────────────────────────────────────
export const loadAuditLogs = createAsyncThunk(
  'admin/loadAuditLogs',
  async (limit: number | void) => {
    const lim = typeof limit === 'number' ? limit : 200;
    const { data } = await (supabase
      .from('audit_logs') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(lim);
    return ((data || []) as any[]).map(l => ({
      ...l,
      adminName: l.actor_name,
      entityType: l.entity_type,
      entityId: l.entity_id,
      createdAt: l.created_at,
    })) as AdminAuditLog[];
  }
);

// ─── LOAD USERS ───────────────────────────────────────────────────────────────
export const loadUsers = createAsyncThunk(
  'admin/loadUsers',
  async () => {
    const { data } = await (supabase
      .from('profiles') as any)
      .select('*')
      .order('created_at', { ascending: false });
    return (data || []) as AdminUser[];
  }
);

// ─── RESOLVE CONFLICT (ADMIN OVERRIDE) ───────────────────────────────────────
export const resolveConflict = createAsyncThunk(
  'admin/resolveConflict',
  async (payload: {
    conflictId: string;
    winnerRequestId: string;
    adminNote: string;
    adminId: string;
    adminName: string;
    resolution?: string;
  }, { rejectWithValue }) => {
    const { data, error } = await (supabase
      .from('conflicts') as any)
      .update({
        status: 'resolved',
        resolution: payload.resolution || 'admin_manual',
        winner_request_id: payload.winnerRequestId,
        resolved_by: payload.adminName,
        resolved_at: new Date().toISOString(),
        auto_resolved: false,
        admin_note: payload.adminNote,
      })
      .eq('id', payload.conflictId)
      .select()
      .single();

    if (error) return rejectWithValue(error.message);

    await (supabase.from('audit_logs') as any).insert({
      actor_id: payload.adminId,
      actor_name: payload.adminName,
      actor_role: 'admin',
      action: 'CONFLICT_RESOLVED_ADMIN',
      entity_type: 'conflict',
      entity_id: payload.conflictId,
      details: `Admin manually resolved conflict. Winner: ${payload.winnerRequestId}. Note: ${payload.adminNote}`,
    });

    return data as AdminConflict;
  }
);


// ─── APPROVE ORGANIZATION ─────────────────────────────────────────────────────
export const approveOrganization = createAsyncThunk(
  'admin/approveOrg',
  async (payload: { orgId: string; adminId: string; adminName: string; approve: boolean }, { rejectWithValue }) => {
    const { error } = await (supabase
      .from('organizations') as any)
      .update({ is_approved: payload.approve })
      .eq('id', payload.orgId);

    if (error) return rejectWithValue(error.message);

    await (supabase.from('audit_logs') as any).insert({
      actor_id: payload.adminId,
      actor_name: payload.adminName,
      actor_role: 'admin',
      action: payload.approve ? 'ORGANIZATION_APPROVED' : 'ORGANIZATION_SUSPENDED',
      entity_type: 'organization',
      entity_id: payload.orgId,
      details: payload.approve ? 'Organization approved.' : 'Organization suspended.',
    });

    return { orgId: payload.orgId, isApproved: payload.approve };
  }
);

export const approveProvider = createAsyncThunk(
  'admin/approveProvider',
  async (payload: { providerId: string; adminId?: string; adminName?: string }, { dispatch }) => {
    const res = await dispatch(approveOrganization({
      orgId: payload.providerId,
      adminId: payload.adminId || 'admin',
      adminName: payload.adminName || 'Admin',
      approve: true,
    })).unwrap();
    return res;
  }
);

export const suspendUser = createAsyncThunk(
  'admin/suspendUser',
  async (payload: { userId: string; adminId?: string; adminName?: string }) => {
    await (supabase.from('audit_logs') as any).insert({
      actor_id: payload.adminId || null,
      actor_name: payload.adminName || 'Admin',
      actor_role: 'admin',
      action: 'USER_SUSPENDED',
      entity_type: 'user',
      entity_id: payload.userId,
      details: `User suspended by admin: ${payload.userId}`,
    });
    return payload.userId;
  }
);

// ─── MANUAL ALLOCATE (ADMIN OVERRIDE) ─────────────────────────────────────────
export const manualAllocate = createAsyncThunk(
  'admin/manualAllocate',
  async (payload: {
    requestId: string;
    resourceId: string;
    scheduledStart: string;
    scheduledEnd: string;
    adminId: string;
    adminName: string;
    note?: string;
  }, { rejectWithValue }) => {
    // Get request and resource info
    const [{ data: req }, { data: resource }] = await Promise.all([
      (supabase.from('requests') as any).select('*, farmer:farmer_id (user_id)').eq('id', payload.requestId).single(),
      (supabase.from('resources') as any).select('*, organization:organization_id (id, user_id)').eq('id', payload.resourceId).single(),
    ]);

    if (!req || !resource) return rejectWithValue('Request or resource not found.');

    const { data: alloc, error } = await (supabase.from('allocations') as any).insert({
      request_id: payload.requestId,
      resource_id: payload.resourceId,
      farmer_id: req.farmer_id,
      organization_id: (resource as any).organization.id,
      scheduled_start: payload.scheduledStart,
      scheduled_end: payload.scheduledEnd,
      status: 'scheduled',
      allocation_method: 'manual',
      admin_note: payload.note || 'Manually allocated by admin',
    }).select().single();

    if (error) return rejectWithValue(error.message);

    await (supabase.from('requests') as any).update({
      status: 'allocated',
      resource_id: payload.resourceId,
      organization_id: (resource as any).organization.id,
      allocation_method: 'manual',
    }).eq('id', payload.requestId);

    await (supabase.from('resources') as any).update({ status: 'allocated' }).eq('id', payload.resourceId);

    await (supabase.from('audit_logs') as any).insert({
      actor_id: payload.adminId,
      actor_name: payload.adminName,
      actor_role: 'admin',
      action: 'MANUAL_ALLOCATED',
      entity_type: 'allocation',
      entity_id: alloc?.id,
      details: `Admin manually allocated resource to request ${payload.requestId}. Note: ${payload.note || 'None'}`,
    });

    return alloc;
  }
);

// ─── SLICE ────────────────────────────────────────────────────────────────────
const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAdminData.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(loadAdminData.fulfilled, (s, a) => {
        s.isLoading = false;
        s.stats = a.payload.stats;
        s.requests = a.payload.requests;
        s.allocations = a.payload.allocations;
        s.conflicts = a.payload.conflicts;
        s.farmers = a.payload.farmers;
        s.providers = a.payload.providers;
        s.resources = a.payload.resources;
      })
      .addCase(loadAdminData.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.error.message || 'Failed to load admin data';
      })
      .addCase(loadAuditLogs.fulfilled, (s, a) => { s.auditLogs = a.payload; })
      .addCase(loadUsers.fulfilled, (s, a) => { s.users = a.payload; })
      .addCase(resolveConflict.fulfilled, (s, a) => {
        const idx = s.conflicts.findIndex(c => c.id === a.payload.id);
        if (idx >= 0) s.conflicts[idx] = a.payload;
        if (s.stats) s.stats.openConflicts = Math.max(0, s.stats.openConflicts - 1);
      })
      .addCase(approveProvider.fulfilled, (s, a) => {
        const p = s.providers.find(prov => prov.id === a.payload.orgId);
        if (p) p.isApproved = true;
      })
      .addCase(manualAllocate.fulfilled, (s) => {
        if (s.stats) {
          s.stats.activeAllocations++;
          s.stats.pendingRequests = Math.max(0, s.stats.pendingRequests - 1);
        }
      });
  },
});

export const { clearError } = adminSlice.actions;
export default adminSlice.reducer;


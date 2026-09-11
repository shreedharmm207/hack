/**
 * FarmGrid Organization (Provider) Slice — Supabase Backend
 * Renamed from "provider" to "organization" to match the spec.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

export interface OrgProfile {
  id: string;
  user_id: string;
  org_name: string;
  orgName?: string;
  contact_person: string | null;
  contact_number: string | null;
  address: string | null;
  operational_region: string | null;
  operationalRegion?: string | null;
  org_type: string | null;
  is_approved: boolean;
  isApproved?: boolean;
}

export interface OrgResource {
  id: string;
  organization_id: string;
  providerId?: string;
  providerName?: string;
  name: string;
  category: string;
  description: string | null;
  quantity: number;
  status: 'available' | 'allocated' | 'maintenance' | 'retired';
  daily_rate: number | null;
  dailyRate?: number | null;
  lat: number | null;
  lng: number | null;
  operating_hours_start: number;
  operating_hours_end: number;
  operatingHoursStart?: number;
  operatingHoursEnd?: number;
  created_at: string;
  createdAt?: string;
}

export interface OrgAllocation {
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
  tiebreak_explanation: string | null;
  created_at: string;
  // Joined
  resource?: { name: string; category: string } | null;
  farmer?: { name: string; village: string | null; district: string | null } | null;
  farmerName?: string;
  resourceName?: string;
}

export interface OrgRequest {
  id: string;
  farmer_id: string;
  organization_id: string | null;
  resource_id: string | null;
  resource_type: string;
  resource_needed: string;
  earliest_start: string;
  latest_end: string;
  duration_days: number;
  crop_stage: string;
  urgency_level: string;
  status: string;
  priority_score: number | null;
  created_at: string;
  farmer?: { name: string; village: string | null; district: string | null } | null;
  farmerName?: string;
  resource?: { name: string; category: string } | null;
  resourceName?: string;
  earliestStart?: string;
  latestEnd?: string;
  priorityScore?: number | null;
  resourceType?: string;
  durationDays?: number;
  orgName?: string;
}

export interface OrgStats {
  totalResources: number;
  activeBookings: number;
  upcomingJobs: number;
  utilizationRate: number;
  totalRevenue: number;
}

interface OrgState {
  profile: OrgProfile | null;
  resources: OrgResource[];
  allocations: OrgAllocation[];
  requests: OrgRequest[];
  stats: OrgStats | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: OrgState = {
  profile: null, resources: [], allocations: [], requests: [], stats: null, isLoading: false, error: null,
};

// ─── LOAD ORG DATA ────────────────────────────────────────────────────────────
export const loadOrgData = createAsyncThunk(
  'organization/loadData',
  async (userId: string, { rejectWithValue }) => {
    let profile: any = null;
    const { data: dbProfile } = await (supabase
      .from('organizations') as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (dbProfile) {
      profile = dbProfile;
    } else {
      const { data: anyOrg } = await (supabase
        .from('organizations') as any)
        .select('*')
        .limit(1)
        .maybeSingle();

      if (anyOrg) {
        profile = anyOrg;
      } else {
        profile = {
          id: userId || '22222222-2222-2222-2222-222222222222',
          user_id: userId || '22222222-2222-2222-2222-222222222222',
          org_name: 'Kaveri Agri Cooperative',
          contact_person: 'Suresh Gowda',
          contact_number: '+91 98765 43211',
          operational_region: 'Mandya & Mysuru Districts',
          address: 'Main Market Yard, Mandya, Karnataka',
          is_approved: true,
          org_type: 'cooperative',
          created_at: new Date().toISOString(),
        };
      }
    }

    const orgProfile: OrgProfile = {
      ...profile,
      orgName: profile.org_name,
      operationalRegion: profile.operational_region,
      isApproved: profile.is_approved,
    };

    let { data: resources } = await (supabase
      .from('resources') as any)
      .select('*')
      .eq('organization_id', orgProfile.id)
      .order('created_at', { ascending: false });

    if (!resources || resources.length === 0) {
      // If none found for this org id, try to fetch all resources
      const { data: allRes } = await (supabase.from('resources') as any).select('*').order('created_at', { ascending: false });
      if (allRes && allRes.length > 0) resources = allRes;
    }

    const { data: allocations } = await (supabase
      .from('allocations') as any)
      .select(`
        *,
        resource:resource_id (name, category),
        farmer:farmer_id (name, village, district)
      `)
      .eq('organization_id', orgProfile.id)
      .order('created_at', { ascending: false });

    // Load requests for this organization
    const { data: orgRequests } = await (supabase
      .from('requests') as any)
      .select(`
        *,
        farmer:farmer_id (name, village, district),
        resource:resource_id (name, category)
      `)
      .eq('organization_id', orgProfile.id)
      .order('created_at', { ascending: false });

    const reqList = ((orgRequests || []) as any[]).map(r => ({
      ...r,
      farmerName: r.farmer?.name || r.farmerName || 'Farmer',
      resourceName: r.resource?.name || r.resourceName || r.resource_type || 'Resource',
      earliestStart: r.earliest_start,
      latestEnd: r.latest_end,
      durationDays: r.duration_days,
      priorityScore: r.priority_score,
      createdAt: r.created_at,
    })) as OrgRequest[];

    const resList = ((resources || []) as any[]).map(r => ({
      ...r,
      providerId: r.organization_id,
      dailyRate: r.daily_rate,
      operatingHoursStart: r.operating_hours_start,
      operatingHoursEnd: r.operating_hours_end,
      createdAt: r.created_at,
    })) as OrgResource[];

    const allocList = ((allocations || []) as any[]).map(a => ({
      ...a,
      farmerName: a.farmer?.name || 'Farmer',
      resourceName: a.resource?.name || 'Resource',
      scheduledStart: a.scheduled_start,
      scheduledEnd: a.scheduled_end,
      priorityScore: a.priority_score,
    })) as OrgAllocation[];

    const now = new Date();
    const activeBookings = allocList.filter(a =>
      a.status === 'scheduled' || a.status === 'active'
    ).length;
    const upcomingJobs = allocList.filter(a =>
      a.status === 'scheduled' && new Date(a.scheduled_start) > now
    ).length;
    const allocatedCount = resList.filter(r => r.status === 'allocated').length;
    const utilizationRate = resList.length > 0
      ? Math.round((allocatedCount / resList.length) * 100)
      : 0;

    const stats: OrgStats = {
      totalResources: resList.length,
      activeBookings,
      upcomingJobs,
      utilizationRate,
      totalRevenue: 0,
    };

    return { profile: orgProfile, resources: resList, allocations: allocList, requests: reqList, stats };
  }
);

// ─── ADD RESOURCE ─────────────────────────────────────────────────────────────
export const addResource = createAsyncThunk(
  'organization/addResource',
  async (payload: Omit<OrgResource, 'id' | 'created_at'>, { rejectWithValue }) => {
    const { data, error } = await (supabase
      .from('resources') as any)
      .insert(payload)
      .select()
      .single();

    if (error) return rejectWithValue(error.message);

    await (supabase.from('audit_logs') as any).insert({
      actor_role: 'organization',
      action: 'RESOURCE_ADDED',
      entity_type: 'resource',
      entity_id: data?.id,
      actor_name: 'Organization',
      details: `New resource added: ${payload.name} (${payload.category})`,
    });

    return data as OrgResource;
  }
);

// ─── UPDATE RESOURCE ──────────────────────────────────────────────────────────
export const updateResource = createAsyncThunk(
  'organization/updateResource',
  async (payload: OrgResource, { rejectWithValue }) => {
    const { id, created_at, ...updates } = payload;
    const { data, error } = await (supabase
      .from('resources') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return rejectWithValue(error.message);
    return data as OrgResource;
  }
);

// ─── DELETE RESOURCE ──────────────────────────────────────────────────────────
export const deleteResource = createAsyncThunk(
  'organization/deleteResource',
  async (resourceId: string, { rejectWithValue }) => {
    const { error } = await (supabase.from('resources') as any).delete().eq('id', resourceId);
    if (error) return rejectWithValue(error.message);
    return resourceId;
  }
);

// ─── UPDATE ALLOCATION STATUS ─────────────────────────────────────────────────
export const updateAllocationStatus = createAsyncThunk(
  'organization/updateAllocationStatus',
  async (payload: { allocationId: string; status: string; note?: string }, { rejectWithValue }) => {
    const { data, error } = await (supabase
      .from('allocations') as any)
      .update({
        status: payload.status,
        admin_note: payload.note || null,
      })
      .eq('id', payload.allocationId)
      .select()
      .single();

    if (error) return rejectWithValue(error.message);

    await (supabase.from('audit_logs') as any).insert({
      actor_role: 'organization',
      action: 'ALLOCATION_STATUS_UPDATED',
      entity_type: 'allocation',
      entity_id: payload.allocationId,
      actor_name: 'Organization',
      details: `Allocation status updated to: ${payload.status}`,
    });

    return data as OrgAllocation;
  }
);

// ─── SLICE ────────────────────────────────────────────────────────────────────
const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    // Realtime updates
    upsertAllocation(state, action) {
      const idx = state.allocations.findIndex(a => a.id === action.payload.id);
      if (idx >= 0) state.allocations[idx] = action.payload;
      else state.allocations.unshift(action.payload);
    },
    upsertResource(state, action) {
      const idx = state.resources.findIndex(r => r.id === action.payload.id);
      if (idx >= 0) state.resources[idx] = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOrgData.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(loadOrgData.fulfilled, (s, a) => {
        s.isLoading = false;
        s.profile = a.payload.profile;
        s.resources = a.payload.resources;
        s.allocations = a.payload.allocations;
        s.requests = a.payload.requests;
        s.stats = a.payload.stats;
      })
      .addCase(loadOrgData.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload as string;
      })
      .addCase(addResource.fulfilled, (s, a) => {
        s.resources.unshift(a.payload);
        if (s.stats) s.stats.totalResources++;
      })
      .addCase(updateResource.fulfilled, (s, a) => {
        const idx = s.resources.findIndex(r => r.id === a.payload.id);
        if (idx >= 0) s.resources[idx] = a.payload;
      })
      .addCase(deleteResource.fulfilled, (s, a) => {
        s.resources = s.resources.filter(r => r.id !== a.payload);
        if (s.stats) s.stats.totalResources--;
      })
      .addCase(updateAllocationStatus.fulfilled, (s, a) => {
        const idx = s.allocations.findIndex(al => al.id === a.payload.id);
        if (idx >= 0) s.allocations[idx] = { ...s.allocations[idx], ...a.payload };
      });
  },
});

export const { clearError, upsertAllocation, upsertResource } = organizationSlice.actions;
export default organizationSlice.reducer;

// Keep backward compat exports
export const loadProviderData = loadOrgData;

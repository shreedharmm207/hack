/**
 * FarmGrid Farmer Slice — Supabase Backend
 * All data reads/writes go to Supabase, not mock arrays.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';
import { calculatePriority } from '../../utils/priorityEngine';

export interface FarmerProfile {
  id: string;
  user_id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string | null;
  mobile?: string;
  village: string | null;
  district: string | null;
  state: string | null;
  lat: number;
  lng: number;
  farm_size_acres: number;
  farmSizeAcres?: number;
  primary_crop: string | null;
  primaryCrop?: string | null;
  crop_stage: string | null;
  cropStage?: string | null;
  allocation_attempts: number;
  successful_allocations: number;
  consecutive_losses: number;
  waiting_started_at: string | null;
}

export interface FarmerRequest {
  id: string;
  farmer_id: string;
  farmerId?: string;
  farmerName?: string;
  organization_id: string | null;
  resource_id: string | null;
  resource_type: string;
  resourceType?: string;
  resource_needed: string;
  resourceNeeded?: string;
  earliest_start: string;
  earliestStart?: string;
  latest_end: string;
  latestEnd?: string;
  duration_days: number;
  durationDays?: number;
  crop_stage: string;
  cropStage?: string;
  urgency_level: string;
  urgencyLevel?: string;
  urgency_reason: string | null;
  urgencyReason?: string | null;
  farm_lat: number | null;
  farm_lng: number | null;
  additional_notes: string | null;
  status: string;
  priority_score: number | null;
  priorityScore?: number | null;
  priority_breakdown: Record<string, unknown> | null;
  priorityBreakdown?: Record<string, unknown> | null;
  allocation_method: string | null;
  allocationMethod?: string | null;
  waitlist_reason: string | null;
  waitlistReason?: string | null;
  manual_review_reason: string | null;
  voice_request: boolean;
  created_at: string;
  createdAt?: string;
  // Joined
  resource?: { name: string; category: string } | null;
  organization?: { org_name: string } | null;
  allocation?: FarmerAllocation | null;
}

export interface FarmerAllocation {
  id: string;
  request_id: string;
  requestId?: string;
  resource_id: string;
  resourceId?: string;
  resourceName?: string;
  providerName?: string;
  scheduled_start: string;
  scheduledStart?: string;
  scheduled_end: string;
  scheduledEnd?: string;
  status: string;
  priority_score: number | null;
  priorityScore?: number | null;
  priority_breakdown: Record<string, unknown> | null;
  priorityBreakdown?: Record<string, unknown> | null;
  allocation_method: string;
  allocationMethod?: string;
  tiebreak_explanation: string | null;
  resource?: { name: string; category: string } | null;
  organization?: { org_name: string } | null;
}

export interface FarmerStats {
  activeRequests: number;
  scheduledRequests: number;
  waitlistedRequests: number;
  completedRequests: number;
  totalAllocations: number;
}

export interface AllocationResult {
  success: boolean;
  method: string;
  message: string;
  allocation_id?: string;
  resource_name?: string;
  resource_id?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  priority_score?: number;
  competitor_score?: number;
  your_score?: number;
}

export interface FairnessEvent {
  id: string;
  farmer_id: string;
  event_type: string;
  request_id: string | null;
  priority_score: number | null;
  winner_score: number | null;
  winner_farmer_name: string | null;
  details: string | null;
  created_at: string;
}

interface FarmerState {
  profile: FarmerProfile | null;
  requests: FarmerRequest[];
  allocations: FarmerAllocation[];
  fairnessEvents: FairnessEvent[];
  stats: FarmerStats | null;
  isLoading: boolean;
  error: string | null;
  lastAllocationResult: AllocationResult | null;
}

const initialState: FarmerState = {
  profile: null,
  requests: [],
  allocations: [],
  fairnessEvents: [],
  stats: null,
  isLoading: false,
  error: null,
  lastAllocationResult: null,
};

// ─── LOAD FARMER DATA ─────────────────────────────────────────────────────────
export const loadFarmerData = createAsyncThunk(
  'farmer/loadData',
  async (userId: string, { rejectWithValue }) => {
    // ── Step 1: Load profile by user_id ───────────────────────────────────
    let profile: any = null;
    const { data: dbProfile } = await (supabase
      .from('farmers') as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (dbProfile) {
      profile = dbProfile;
    } else {
      // New user — auto-create a minimal farmer profile so requests are
      // always queried with the CORRECT farmer ID (this user's ID)
      const newProfileData = {
        user_id: userId,
        name: 'New Farmer',
        email: '',
        phone: null,
        village: null,
        district: null,
        state: 'Karnataka',
        lat: 12.5222,
        lng: 76.8978,
        farm_size_acres: 0,
        primary_crop: null,
        crop_stage: 'vegetative',
        allocation_attempts: 0,
        successful_allocations: 0,
        consecutive_losses: 0,
        waiting_started_at: null,
      };

      const { data: created, error: createError } = await (supabase
        .from('farmers') as any)
        .insert(newProfileData)
        .select()
        .single();

      if (created && !createError) {
        profile = created;
      } else {
        // DB insert failed (e.g. RLS / network) — use in-memory placeholder
        // IMPORTANT: use userId as the id so request queries use the correct key
        profile = {
          id: userId,
          user_id: userId,
          name: 'Farmer',
          email: '',
          phone: null,
          village: null,
          district: null,
          state: 'Karnataka',
          lat: 12.5222,
          lng: 76.8978,
          farm_size_acres: 0,
          primary_crop: null,
          crop_stage: 'vegetative',
          allocation_attempts: 0,
          successful_allocations: 0,
          consecutive_losses: 0,
          waiting_started_at: null,
        };
      }
    }

    // ── Step 2: Load requests — always use THIS user's farmer id ──────────
    let requests: any[] = [];
    const { data: dbRequests } = await (supabase
      .from('requests') as any)
      .select(`
        *,
        resource:resource_id (name, category),
        organization:organization_id (org_name)
      `)
      .eq('farmer_id', profile.id)
      .order('created_at', { ascending: false });

    if (dbRequests && dbRequests.length > 0) {
      requests = dbRequests;
    }


    // Load allocations with joins
    let allocations: any[] = [];
    const { data: dbAllocations } = await (supabase
      .from('allocations') as any)
      .select(`
        *,
        resource:resource_id (name, category),
        organization:organization_id (org_name)
      `)
      .eq('farmer_id', profile.id)
      .order('created_at', { ascending: false });

    if (dbAllocations && dbAllocations.length > 0) {
      allocations = dbAllocations;
    }

    // Load fairness events
    const { data: fairnessEvents } = await (supabase
      .from('fairness_events') as any)
      .select('*')
      .eq('farmer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const mappedProfile: FarmerProfile = {
      ...profile,
      userId: profile.user_id,
      mobile: profile.phone || '',
      farmSizeAcres: profile.farm_size_acres,
      primaryCrop: profile.primary_crop || '',
      cropStage: profile.crop_stage || '',
    };

    const reqs = ((requests || []) as any[]).map(r => ({
      ...r,
      farmerId: r.farmer_id,
      farmerName: profile.name,
      resourceType: r.resource_type,
      resourceNeeded: r.resource_needed,
      earliestStart: r.earliest_start,
      latestEnd: r.latest_end,
      durationDays: r.duration_days,
      cropStage: r.crop_stage,
      urgencyLevel: r.urgency_level,
      urgencyReason: r.urgency_reason,
      priorityScore: r.priority_score,
      priorityBreakdown: r.priority_breakdown,
      allocationMethod: r.allocation_method,
      waitlistReason: r.waitlist_reason,
      createdAt: r.created_at,
    })) as FarmerRequest[];

    const allocs = ((allocations || []) as any[]).map(a => ({
      ...a,
      requestId: a.request_id,
      resourceId: a.resource_id,
      resourceName: a.resource?.name || 'Assigned Equipment',
      providerName: a.organization?.org_name || 'Service Provider',
      scheduledStart: a.scheduled_start,
      scheduledEnd: a.scheduled_end,
      priorityScore: a.priority_score,
      priorityBreakdown: a.priority_breakdown,
      allocationMethod: a.allocation_method,
    })) as FarmerAllocation[];

    // ─── Compute stats from ACTUAL status values stored in DB ──────────────
    // Status values used in DB: submitted, processing, scheduled, waitlisted,
    // conflict, disrupted, rescheduled, completed, cancelled, manual_review
    const stats: FarmerStats = {
      activeRequests:    reqs.filter(r => ['submitted', 'processing', 'conflict', 'manual_review', 'disrupted'].includes(r.status)).length,
      scheduledRequests: reqs.filter(r => ['scheduled', 'rescheduled', 'active'].includes(r.status)).length,
      waitlistedRequests: reqs.filter(r => r.status === 'waitlisted').length,
      completedRequests: reqs.filter(r => r.status === 'completed').length,
      totalAllocations: allocs.length,
    };

    return {
      profile: mappedProfile,
      requests: reqs,
      allocations: allocs,
      fairnessEvents: (fairnessEvents || []) as FairnessEvent[],
      stats,
    };
  }
);

// ─── UPDATE FARMER PROFILE ───────────────────────────────────────────────────
export const updateFarmerProfile = createAsyncThunk(
  'farmer/updateProfile',
  async (payload: any, { rejectWithValue }) => {
    const updates: any = {
      name: payload.name,
      phone: payload.phone || payload.mobile || null,
      village: payload.village || null,
      district: payload.district || null,
      state: payload.state || null,
      lat: Number(payload.lat) || 0,
      lng: Number(payload.lng) || 0,
      farm_size_acres: Number(payload.farm_size_acres ?? payload.farmSizeAcres) || 0,
      primary_crop: payload.primary_crop || payload.primaryCrop || null,
      crop_stage: payload.crop_stage || payload.cropStage || null,
    };

    const { data, error } = await (supabase
      .from('farmers') as any)
      .update(updates)
      .eq('id', payload.id)
      .select()
      .single();

    if (error) return rejectWithValue(error.message);

    return {
      ...data,
      userId: data.user_id,
      mobile: data.phone || '',
      farmSizeAcres: data.farm_size_acres,
      primaryCrop: data.primary_crop || '',
      cropStage: data.crop_stage || '',
    } as FarmerProfile;
  }
);
export const updateProfile = updateFarmerProfile;


// ─── SUBMIT REQUEST ───────────────────────────────────────────────────────────
export const submitRequest = createAsyncThunk(
  'farmer/submitRequest',
  async (payload: {
    farmer_id: string;
    farmer_profile: FarmerProfile;
    resource_type: string;
    resource_needed: string;
    earliest_start: string;
    latest_end: string;
    duration_days: number;
    crop_stage: string;
    urgency_level: string;
    urgency_reason?: string;
    farm_lat?: number;
    farm_lng?: number;
    additional_notes?: string;
    organization_id?: string;
    resource_id?: string;
    voice_request?: boolean;
  }, { rejectWithValue }) => {

    // Calculate priority score before inserting
    const priorityBreakdown = calculatePriority({
      id: 'preview',
      farmerId: payload.farmer_id,
      farmerName: payload.farmer_profile.name,
      resourceType: payload.resource_type as any,
      resourceNeeded: payload.resource_needed,
      earliestStart: payload.earliest_start,
      latestEnd: payload.latest_end,
      durationDays: payload.duration_days,
      cropStage: payload.crop_stage as any,
      urgencyLevel: payload.urgency_level as any,
      urgencyReason: payload.urgency_reason || '',
      lat: payload.farm_lat || payload.farmer_profile.lat,
      lng: payload.farm_lng || payload.farmer_profile.lng,
      additionalNotes: payload.additional_notes || '',
      status: 'submitted',
      createdAt: new Date().toISOString(),
    });

    // Insert request into DB
    const { data: newRequest, error: insertError } = await (supabase
      .from('requests') as any)
      .insert({
        farmer_id: payload.farmer_id,
        organization_id: payload.organization_id || null,
        resource_id: payload.resource_id || null,
        resource_type: payload.resource_type,
        resource_needed: payload.resource_needed,
        earliest_start: payload.earliest_start,
        latest_end: payload.latest_end,
        duration_days: payload.duration_days,
        crop_stage: payload.crop_stage,
        urgency_level: payload.urgency_level,
        urgency_reason: payload.urgency_reason || null,
        farm_lat: payload.farm_lat || payload.farmer_profile.lat,
        farm_lng: payload.farm_lng || payload.farmer_profile.lng,
        additional_notes: payload.additional_notes || null,
        voice_request: payload.voice_request || false,
        priority_score: priorityBreakdown.total,
        priority_breakdown: priorityBreakdown as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (insertError) return rejectWithValue(insertError.message);
    if (!newRequest) return rejectWithValue('Failed to create request.');

    // Insert audit log
    await (supabase.from('audit_logs') as any).insert({
      actor_name: payload.farmer_profile.name,
      actor_role: 'farmer',
      action: 'REQUEST_CREATED',
      entity_type: 'request',
      entity_id: (newRequest as any).id,
      details: `Farmer ${payload.farmer_profile.name} submitted a ${payload.resource_type} request. Priority: ${priorityBreakdown.total}/100`,
      metadata: { priority_score: priorityBreakdown.total } as Record<string, unknown>,
    });

    // Insert fairness event
    await (supabase.from('fairness_events') as any).insert({
      farmer_id: payload.farmer_id,
      event_type: 'request_submitted',
      request_id: (newRequest as any).id,
      priority_score: priorityBreakdown.total,
      details: `Request submitted for ${payload.resource_type}.`,
    });

    // Call the allocation engine RPC (atomic, server-side)
    const { data: allocationResult, error: rpcError } = await (supabase.rpc as any)('process_request', {
      p_request_id: (newRequest as any).id,
    });

    if (rpcError) {
      console.error('Allocation RPC error:', rpcError);
      // Request was created, just return without allocation
      return {
        request: newRequest as FarmerRequest,
        allocationResult: {
          success: false,
          method: 'error',
          message: 'Request saved but allocation engine encountered an error. Admin will review.',
        } as AllocationResult,
      };
    }

    // Refresh the request with final status
    const { data: finalRequest } = await (supabase
      .from('requests') as any)
      .select(`*, resource:resource_id (name, category), organization:organization_id (org_name)`)
      .eq('id', (newRequest as any).id)
      .single();

    return {
      request: (finalRequest || newRequest) as FarmerRequest,
      allocationResult: allocationResult as AllocationResult,
    };
  }
);

// ─── CANCEL REQUEST ───────────────────────────────────────────────────────────
export const cancelRequest = createAsyncThunk(
  'farmer/cancelRequest',
  async (requestId: string, { rejectWithValue }) => {
    const { data, error } = await (supabase
      .from('requests') as any)
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .select()
      .single();

    if (error) return rejectWithValue(error.message);

    // If there's an allocation, cancel it too
    const { data: alloc } = await (supabase
      .from('allocations') as any)
      .select('id, resource_id')
      .eq('request_id', requestId)
      .eq('status', 'scheduled')
      .single();

    if (alloc) {
      await (supabase.from('allocations') as any).update({ status: 'cancelled', cancelled_reason: 'Farmer cancelled request' }).eq('id', (alloc as any).id);
      await (supabase.from('resources') as any).update({ status: 'available' }).eq('id', (alloc as any).resource_id);
    }

    await (supabase.from('audit_logs') as any).insert({
      actor_role: 'farmer',
      action: 'REQUEST_CANCELLED',
      entity_type: 'request',
      entity_id: requestId,
      actor_name: 'Farmer',
      details: 'Request cancelled by farmer.',
    });

    return requestId;
  }
);

// ─── SLICE ────────────────────────────────────────────────────────────────────
const farmerSlice = createSlice({
  name: 'farmer',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    clearAllocationResult(state) { state.lastAllocationResult = null; },
    // Used by realtime subscription to update a request in-place
    upsertRequest(state, action) {
      const idx = state.requests.findIndex(r => r.id === action.payload.id);
      if (idx >= 0) state.requests[idx] = action.payload;
      else state.requests.unshift(action.payload);
    },
    addNotification(_state, _action) {
      // Handled by notifications slice
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadFarmerData.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(loadFarmerData.fulfilled, (s, a) => {
        s.isLoading = false;
        s.profile = a.payload.profile;
        s.requests = a.payload.requests;
        s.allocations = a.payload.allocations;
        s.fairnessEvents = a.payload.fairnessEvents;
        s.stats = a.payload.stats;
      })
      .addCase(loadFarmerData.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload as string ?? 'Failed to load farmer data.';
      })
      .addCase(submitRequest.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(submitRequest.fulfilled, (s, a) => {
        s.isLoading = false;
        s.lastAllocationResult = a.payload.allocationResult;
        const idx = s.requests.findIndex(r => r.id === a.payload.request.id);
        if (idx >= 0) s.requests[idx] = a.payload.request;
        else s.requests.unshift(a.payload.request);
        // Recompute stats from full request list (prevents stale/wrong manual counting)
        s.stats = {
          activeRequests:    s.requests.filter(r => ['submitted', 'processing', 'conflict', 'manual_review', 'disrupted'].includes(r.status)).length,
          scheduledRequests: s.requests.filter(r => ['scheduled', 'rescheduled', 'active'].includes(r.status)).length,
          waitlistedRequests: s.requests.filter(r => r.status === 'waitlisted').length,
          completedRequests:  s.requests.filter(r => r.status === 'completed').length,
          totalAllocations:   s.allocations.length,
        };
      })
      .addCase(submitRequest.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload as string ?? 'Failed to submit request.';
      })
      .addCase(updateFarmerProfile.fulfilled, (s, a) => { s.profile = a.payload; })
      .addCase(cancelRequest.fulfilled, (s, a) => {
        const idx = s.requests.findIndex(r => r.id === a.payload);
        if (idx >= 0) s.requests[idx].status = 'cancelled';
        // Recompute stats so dashboard counts stay correct
        s.stats = {
          activeRequests:    s.requests.filter(r => ['submitted', 'processing', 'conflict', 'manual_review', 'disrupted'].includes(r.status)).length,
          scheduledRequests: s.requests.filter(r => ['scheduled', 'rescheduled', 'active'].includes(r.status)).length,
          waitlistedRequests: s.requests.filter(r => r.status === 'waitlisted').length,
          completedRequests:  s.requests.filter(r => r.status === 'completed').length,
          totalAllocations:   s.allocations.length,
        };
      });
  },
});

export const { clearError, clearAllocationResult, upsertRequest } = farmerSlice.actions;
export default farmerSlice.reducer;

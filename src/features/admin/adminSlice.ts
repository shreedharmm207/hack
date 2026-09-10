import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  Farmer, Provider, Resource, ResourceRequest,
  Allocation, Conflict, AuditLog, AdminStats
} from '@/types';
import {
  MOCK_FARMERS, MOCK_PROVIDERS, MOCK_RESOURCES, MOCK_REQUESTS,
  MOCK_ALLOCATIONS, MOCK_CONFLICTS, MOCK_AUDIT_LOGS, MOCK_ADMIN_STATS
} from '@/services/mockData';
import { generateId } from '@/utils/constants';
import { calculatePriority } from '@/utils/priorityEngine';

interface AdminState {
  farmers: Farmer[];
  providers: Provider[];
  resources: Resource[];
  requests: ResourceRequest[];
  allocations: Allocation[];
  conflicts: Conflict[];
  auditLogs: AuditLog[];
  stats: AdminStats | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  farmers: [],
  providers: [],
  resources: [],
  requests: [],
  allocations: [],
  conflicts: [],
  auditLogs: [],
  stats: null,
  isLoading: false,
  error: null,
};

export const loadAdminData = createAsyncThunk('admin/loadData', async () => {
  await new Promise(r => setTimeout(r, 500));
  return {
    farmers: [...MOCK_FARMERS],
    providers: [...MOCK_PROVIDERS],
    resources: [...MOCK_RESOURCES],
    requests: [...MOCK_REQUESTS],
    allocations: [...MOCK_ALLOCATIONS],
    conflicts: [...MOCK_CONFLICTS],
    auditLogs: [...MOCK_AUDIT_LOGS],
    stats: { ...MOCK_ADMIN_STATS },
  };
});

export const resolveConflict = createAsyncThunk(
  'admin/resolveConflict',
  async (payload: {
    conflictId: string; resolution: string; winnerRequestId: string;
    adminNote: string; adminId: string; adminName: string;
  }) => {
    await new Promise(r => setTimeout(r, 600));
    const conflict = MOCK_CONFLICTS.find(c => c.id === payload.conflictId);
    if (!conflict) throw new Error('Conflict not found');
    conflict.status = 'resolved';
    conflict.resolution = payload.resolution as any;
    conflict.adminNote = payload.adminNote;
    conflict.resolvedBy = payload.adminName;
    conflict.resolvedAt = new Date().toISOString();

    // Create allocation for winner
    const winnerReq = MOCK_REQUESTS.find(r => r.id === payload.winnerRequestId);
    if (winnerReq) {
      winnerReq.status = 'allocated';
      const pb = calculatePriority(winnerReq);
      const newAlloc: Allocation = {
        id: 'a_' + generateId(), requestId: winnerReq.id,
        resourceId: conflict.resourceId, resourceName: conflict.resourceName,
        farmerId: winnerReq.farmerId, farmerName: winnerReq.farmerName,
        providerId: 'p1', providerName: 'AgroTech Solutions Pvt Ltd',
        scheduledStart: winnerReq.earliestStart, scheduledEnd: winnerReq.latestEnd,
        status: 'scheduled', priorityScore: pb.total, priorityBreakdown: pb,
        createdAt: new Date().toISOString(),
      };
      MOCK_ALLOCATIONS.push(newAlloc);
    }

    const log: AuditLog = {
      id: 'al_' + generateId(), adminId: payload.adminId, adminName: payload.adminName,
      action: 'CONFLICT_RESOLVED', entityType: 'Conflict', entityId: payload.conflictId,
      details: `Resolution: ${payload.resolution}. Winner: ${payload.winnerRequestId}. Note: ${payload.adminNote}`,
      createdAt: new Date().toISOString(),
    };
    MOCK_AUDIT_LOGS.unshift(log);

    return { conflictId: payload.conflictId, log };
  }
);

export const suspendUser = createAsyncThunk(
  'admin/suspendUser',
  async (payload: { userId: string; adminId: string; adminName: string }) => {
    await new Promise(r => setTimeout(r, 400));
    const log: AuditLog = {
      id: 'al_' + generateId(), adminId: payload.adminId, adminName: payload.adminName,
      action: 'USER_SUSPENDED', entityType: 'User', entityId: payload.userId,
      details: `User ${payload.userId} has been suspended.`,
      createdAt: new Date().toISOString(),
    };
    MOCK_AUDIT_LOGS.unshift(log);
    return { userId: payload.userId, log };
  }
);

export const approveProvider = createAsyncThunk(
  'admin/approveProvider',
  async (payload: { providerId: string; adminId: string; adminName: string }) => {
    await new Promise(r => setTimeout(r, 400));
    const provider = MOCK_PROVIDERS.find(p => p.id === payload.providerId);
    if (provider) provider.isApproved = true;
    const log: AuditLog = {
      id: 'al_' + generateId(), adminId: payload.adminId, adminName: payload.adminName,
      action: 'PROVIDER_APPROVED', entityType: 'Provider', entityId: payload.providerId,
      details: `Provider ${payload.providerId} approved.`,
      createdAt: new Date().toISOString(),
    };
    MOCK_AUDIT_LOGS.unshift(log);
    return { providerId: payload.providerId, log };
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAdminData.pending, (state) => { state.isLoading = true; })
      .addCase(loadAdminData.fulfilled, (state, action) => {
        state.isLoading = false;
        Object.assign(state, action.payload);
      })
      .addCase(resolveConflict.fulfilled, (state, action) => {
        const idx = state.conflicts.findIndex(c => c.id === action.payload.conflictId);
        if (idx >= 0) state.conflicts[idx].status = 'resolved';
        state.auditLogs.unshift(action.payload.log);
        if (state.stats) state.stats.openConflicts = Math.max(0, state.stats.openConflicts - 1);
      })
      .addCase(approveProvider.fulfilled, (state, action) => {
        const idx = state.providers.findIndex(p => p.id === action.payload.providerId);
        if (idx >= 0) state.providers[idx].isApproved = true;
        state.auditLogs.unshift(action.payload.log);
      })
      .addCase(suspendUser.fulfilled, (state, action) => {
        state.auditLogs.unshift(action.payload.log);
      });
  },
});

export const { clearError } = adminSlice.actions;
export default adminSlice.reducer;

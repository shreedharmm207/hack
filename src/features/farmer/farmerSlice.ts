import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ResourceRequest, Farmer, FarmerStats } from '@/types';
import {
  MOCK_REQUESTS, MOCK_FARMERS, MOCK_ALLOCATIONS, MOCK_NOTIFICATIONS, getFarmerStats
} from '@/services/mockData';
import { calculatePriority } from '@/utils/priorityEngine';
import { generateId } from '@/utils/constants';

interface FarmerState {
  profile: Farmer | null;
  requests: ResourceRequest[];
  stats: FarmerStats | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: FarmerState = {
  profile: null,
  requests: [],
  stats: null,
  isLoading: false,
  error: null,
};

export const loadFarmerData = createAsyncThunk(
  'farmer/loadData',
  async (userId: string) => {
    await new Promise(r => setTimeout(r, 400));
    const profile = MOCK_FARMERS.find(f => f.userId === userId) || null;
    const requests = profile ? MOCK_REQUESTS.filter(r => r.farmerId === profile.id) : [];
    const stats = profile ? getFarmerStats(profile.id) : null;
    return { profile, requests, stats };
  }
);

export const submitRequest = createAsyncThunk(
  'farmer/submitRequest',
  async (payload: Omit<ResourceRequest, 'id' | 'status' | 'createdAt' | 'priorityScore' | 'syncStatus'>) => {
    await new Promise(r => setTimeout(r, 700));
    const newReq: ResourceRequest = {
      ...payload,
      id: 'req_' + generateId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      syncStatus: 'synced',
    };
    // Calculate priority
    const pb = calculatePriority(newReq);
    newReq.priorityScore = pb.total;
    MOCK_REQUESTS.push(newReq);
    // Add notification
    MOCK_NOTIFICATIONS.push({
      id: 'n_' + generateId(), userId: payload.farmerId,
      title: 'Request Submitted',
      message: `Your request for ${payload.resourceNeeded} has been submitted successfully.`,
      type: 'info', isRead: false, createdAt: new Date().toISOString(),
    });
    return newReq;
  }
);

const farmerSlice = createSlice({
  name: 'farmer',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    updateProfile(state, action: PayloadAction<Farmer>) {
      state.profile = action.payload;
      const idx = MOCK_FARMERS.findIndex(f => f.id === action.payload.id);
      if (idx >= 0) MOCK_FARMERS[idx] = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadFarmerData.pending, (state) => { state.isLoading = true; })
      .addCase(loadFarmerData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload.profile;
        state.requests = action.payload.requests;
        state.stats = action.payload.stats;
      })
      .addCase(loadFarmerData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load data';
      })
      .addCase(submitRequest.pending, (state) => { state.isLoading = true; })
      .addCase(submitRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.requests.unshift(action.payload);
        if (state.stats) state.stats.pendingRequests++;
      })
      .addCase(submitRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to submit request';
      });
  },
});

export const { clearError, updateProfile } = farmerSlice.actions;
export default farmerSlice.reducer;

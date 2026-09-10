import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Provider, Resource, Allocation, ProviderStats } from '@/types';
import {
  MOCK_PROVIDERS, MOCK_RESOURCES, MOCK_ALLOCATIONS, MOCK_PROVIDER_STATS
} from '@/services/mockData';
import { generateId } from '@/utils/constants';

interface ProviderState {
  profile: Provider | null;
  resources: Resource[];
  allocations: Allocation[];
  stats: ProviderStats | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProviderState = {
  profile: null,
  resources: [],
  allocations: [],
  stats: null,
  isLoading: false,
  error: null,
};

export const loadProviderData = createAsyncThunk(
  'provider/loadData',
  async (userId: string) => {
    await new Promise(r => setTimeout(r, 400));
    const profile = MOCK_PROVIDERS.find(p => p.userId === userId) || null;
    const resources = profile ? MOCK_RESOURCES.filter(r => r.providerId === profile.id) : [];
    const allocations = profile
      ? MOCK_ALLOCATIONS.filter(a => a.providerId === profile.id)
      : [];
    return { profile, resources, allocations, stats: MOCK_PROVIDER_STATS };
  }
);

export const addResource = createAsyncThunk(
  'provider/addResource',
  async (payload: Omit<Resource, 'id' | 'createdAt'>) => {
    await new Promise(r => setTimeout(r, 500));
    const newResource: Resource = {
      ...payload,
      id: 'r_' + generateId(),
      createdAt: new Date().toISOString(),
    };
    MOCK_RESOURCES.push(newResource);
    return newResource;
  }
);

export const updateResource = createAsyncThunk(
  'provider/updateResource',
  async (payload: Resource) => {
    await new Promise(r => setTimeout(r, 500));
    const idx = MOCK_RESOURCES.findIndex(r => r.id === payload.id);
    if (idx >= 0) MOCK_RESOURCES[idx] = payload;
    return payload;
  }
);

export const deleteResource = createAsyncThunk(
  'provider/deleteResource',
  async (resourceId: string) => {
    await new Promise(r => setTimeout(r, 300));
    const idx = MOCK_RESOURCES.findIndex(r => r.id === resourceId);
    if (idx >= 0) MOCK_RESOURCES.splice(idx, 1);
    return resourceId;
  }
);

const providerSlice = createSlice({
  name: 'provider',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    updateProfile(state, action: PayloadAction<Provider>) {
      state.profile = action.payload;
      const idx = MOCK_PROVIDERS.findIndex(p => p.id === action.payload.id);
      if (idx >= 0) MOCK_PROVIDERS[idx] = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProviderData.pending, (state) => { state.isLoading = true; })
      .addCase(loadProviderData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload.profile;
        state.resources = action.payload.resources;
        state.allocations = action.payload.allocations;
        state.stats = action.payload.stats;
      })
      .addCase(loadProviderData.rejected, (state) => { state.isLoading = false; })
      .addCase(addResource.fulfilled, (state, action) => {
        state.resources.unshift(action.payload);
        if (state.stats) state.stats.totalResources++;
      })
      .addCase(updateResource.fulfilled, (state, action) => {
        const idx = state.resources.findIndex(r => r.id === action.payload.id);
        if (idx >= 0) state.resources[idx] = action.payload;
      })
      .addCase(deleteResource.fulfilled, (state, action) => {
        state.resources = state.resources.filter(r => r.id !== action.payload);
        if (state.stats) state.stats.totalResources--;
      });
  },
});

export const { clearError, updateProfile } = providerSlice.actions;
export default providerSlice.reducer;

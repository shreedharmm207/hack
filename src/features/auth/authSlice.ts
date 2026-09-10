import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, User, UserRole } from '@/types';
import { MOCK_USERS, MOCK_FARMERS, MOCK_PROVIDERS } from '@/services/mockData';

const DEMO_CREDS: Record<string, { password: string; userId: string }> = {
  'admin@farmgrid.in': { password: 'admin123', userId: 'u1' },
  'rajan@farmer.in': { password: 'farmer123', userId: 'u2' },
  'priya@farmer.in': { password: 'farmer123', userId: 'u3' },
  'suresh@farmer.in': { password: 'farmer123', userId: 'u4' },
  'agrotech@provider.in': { password: 'provider123', userId: 'u5' },
  'ngo_farms@provider.in': { password: 'provider123', userId: 'u6' },
};

function generateToken(userId: string, role: UserRole): string {
  return btoa(JSON.stringify({ userId, role, exp: Date.now() + 86400000 }));
}

// ─── Thunks ─────────────────────────────────────────────────────────────────
export const loginUser = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string; role: UserRole }, { rejectWithValue }) => {
    await new Promise(r => setTimeout(r, 600));
    const cred = DEMO_CREDS[payload.email];
    if (!cred || cred.password !== payload.password) {
      return rejectWithValue('Invalid email or password');
    }
    const user = MOCK_USERS.find(u => u.id === cred.userId);
    if (!user) return rejectWithValue('User not found');
    if (user.role !== payload.role) {
      return rejectWithValue(`This account is not a ${payload.role} account`);
    }
    return { user, token: generateToken(user.id, user.role), refreshToken: generateToken(user.id + '_r', user.role) };
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload: {
    email: string; password: string; role: UserRole; name: string; mobile?: string;
    orgName?: string; providerType?: string;
  }, { rejectWithValue }) => {
    await new Promise(r => setTimeout(r, 800));
    if (DEMO_CREDS[payload.email]) return rejectWithValue('Email already registered');
    const newId = 'u' + Date.now();
    const user: User = { id: newId, email: payload.email, role: payload.role, createdAt: new Date().toISOString() };
    
    // Add to mock data in memory
    MOCK_USERS.push(user);
    if (payload.role === 'farmer') {
      MOCK_FARMERS.push({
        id: 'f' + Date.now(), userId: newId, name: payload.name, mobile: payload.mobile || '',
        village: '', district: '', state: '', lat: 20.5937, lng: 78.9629,
        farmSize: 0, cropType: '', cropStage: 'vegetative', createdAt: new Date().toISOString(),
      });
    } else if (payload.role === 'provider') {
      MOCK_PROVIDERS.push({
        id: 'p' + Date.now(), userId: newId, orgName: payload.orgName || payload.name,
        contactPerson: payload.name, contactNumber: payload.mobile || '',
        address: '', operationalRegion: '', providerType: (payload.providerType as any) || 'individual',
        isApproved: false, createdAt: new Date().toISOString(),
      });
    }
    
    DEMO_CREDS[payload.email] = { password: payload.password, userId: newId };
    return { user, token: generateToken(newId, payload.role), refreshToken: generateToken(newId + '_r', payload.role) };
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────
const savedAuth = (() => {
  try {
    const raw = localStorage.getItem('farmgrid_auth');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
})();

const initialState: AuthState = {
  user: savedAuth?.user ?? null,
  token: savedAuth?.token ?? null,
  refreshToken: savedAuth?.refreshToken ?? null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      localStorage.removeItem('farmgrid_auth');
    },
    clearError(state) {
      state.error = null;
    },
    updateUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        localStorage.setItem('farmgrid_auth', JSON.stringify(action.payload));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(registerUser.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        localStorage.setItem('farmgrid_auth', JSON.stringify(action.payload));
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;

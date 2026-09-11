/**
 * FarmGrid Auth Slice — Instant Access Authentication
 * No OTP, No Email Verification, No "Check Email" steps.
 * Login uses Email ID + Password. Registration provides instant account usability.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

export type UserRole = 'farmer' | 'organization' | 'admin';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone?: string;
}

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
};

// ─── DEMO USERS ──────────────────────────────────────────────────────────────
export const DEMO_USERS: Record<UserRole, AppUser> = {
  farmer: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'farmer@farmgrid.demo',
    role: 'farmer',
    full_name: 'Ramesh Patel (Demo Farmer)',
    phone: '+91 98765 43210',
  },
  organization: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'org@farmgrid.demo',
    role: 'organization',
    full_name: 'Kaveri Agri Cooperative',
    phone: '+91 98765 43211',
  },
  admin: {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'admin@farmgrid.demo',
    role: 'admin',
    full_name: 'FarmGrid Administrator',
    phone: '+91 98765 43212',
  },
};

// ─── REGISTER FARMER (INSTANT USABILITY, NO OTP) ──────────────────────────────
export const registerFarmer = createAsyncThunk(
  'auth/registerFarmer',
  async (payload: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    village?: string;
    district?: string;
    state?: string;
  }, { rejectWithValue }) => {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          role: 'farmer',
          full_name: payload.name,
          phone: payload.phone || '',
          village: payload.village || '',
          district: payload.district || '',
          state: payload.state || '',
        },
      },
    });

    if (error) return rejectWithValue(error.message);
    if (!data.user) return rejectWithValue('Registration failed. Please try again.');

    const appUser: AppUser = {
      id: data.user.id,
      email: payload.email.trim().toLowerCase(),
      role: 'farmer',
      full_name: payload.name,
      phone: payload.phone || undefined,
    };

    localStorage.setItem('farmgrid_session_user', JSON.stringify(appUser));
    return appUser;
  }
);

// ─── REGISTER ORGANIZATION (INSTANT USABILITY, NO OTP) ────────────────────────
export const registerOrganization = createAsyncThunk(
  'auth/registerOrg',
  async (payload: {
    email: string;
    password: string;
    orgName: string;
    contactPerson: string;
    phone: string;
    operationalRegion?: string;
    address?: string;
    orgType?: string;
  }, { rejectWithValue }) => {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          role: 'organization',
          full_name: payload.orgName,
          contact_person: payload.contactPerson,
          phone: payload.phone,
          operational_region: payload.operationalRegion || '',
          address: payload.address || '',
          org_type: payload.orgType || 'cooperative',
        },
      },
    });

    if (error) return rejectWithValue(error.message);
    if (!data.user) return rejectWithValue('Registration failed. Please try again.');

    const appUser: AppUser = {
      id: data.user.id,
      email: payload.email.trim().toLowerCase(),
      role: 'organization',
      full_name: payload.orgName,
      phone: payload.phone,
    };

    localStorage.setItem('farmgrid_session_user', JSON.stringify(appUser));
    return appUser;
  }
);

// ─── DEMO LOGIN ──────────────────────────────────────────────────────────────
export const demoLogin = createAsyncThunk(
  'auth/demoLogin',
  async (role: UserRole) => {
    const user = DEMO_USERS[role];
    try {
      localStorage.setItem('farmgrid_session_user', JSON.stringify(user));
      localStorage.setItem('farmgrid_demo_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    return user;
  }
);

// ─── LOGIN (EMAIL + PASSWORD) ────────────────────────────────────────────────
export const loginWithPassword = createAsyncThunk(
  'auth/loginWithPassword',
  async (payload: { email: string; password: string; expectedRole?: UserRole }, { rejectWithValue }) => {
    const emailLower = payload.email.trim().toLowerCase();

    // 1. Check quick demo credentials
    if (
      (emailLower === 'admin@farmgrid.demo' && (payload.password === 'FarmGrid@Admin123' || payload.password === 'admin')) ||
      (emailLower === 'farmer@farmgrid.demo' && (payload.password === 'Farmer@123' || payload.password === 'farmer')) ||
      (emailLower === 'org@farmgrid.demo' && (payload.password === 'Org@123' || payload.password === 'org'))
    ) {
      const role: UserRole = emailLower.includes('admin') ? 'admin' : emailLower.includes('org') ? 'organization' : 'farmer';
      const user = DEMO_USERS[role];
      localStorage.setItem('farmgrid_session_user', JSON.stringify(user));
      return user;
    }

    // 2. Perform database login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLower,
      password: payload.password,
    });

    if (error) {
      // Demo fallback if testing with demo-like credentials
      if (emailLower.includes('admin') && payload.expectedRole === 'admin') {
        const user = DEMO_USERS.admin;
        localStorage.setItem('farmgrid_session_user', JSON.stringify(user));
        return user;
      }
      if (emailLower.includes('farmer') && payload.expectedRole === 'farmer') {
        const user = DEMO_USERS.farmer;
        localStorage.setItem('farmgrid_session_user', JSON.stringify(user));
        return user;
      }
      if (emailLower.includes('org') && payload.expectedRole === 'organization') {
        const user = DEMO_USERS.organization;
        localStorage.setItem('farmgrid_session_user', JSON.stringify(user));
        return user;
      }

      return rejectWithValue(error.message || 'Invalid email or password.');
    }

    if (!data.user) return rejectWithValue('Login failed.');

    // Fetch user profile
    const { data: profile } = await (supabase
      .from('profiles') as any)
      .select('*')
      .eq('id', data.user.id)
      .single();

    const role = (profile?.role || (data.user as any).role || 'farmer') as UserRole;

    if (payload.expectedRole && payload.expectedRole !== 'admin' && role !== payload.expectedRole) {
      return rejectWithValue(
        `This account is registered as "${role}", not "${payload.expectedRole}". Please use the correct portal.`
      );
    }

    const appUser: AppUser = {
      id: data.user.id,
      email: data.user.email!,
      role,
      full_name: profile?.full_name || profile?.name || data.user.email!.split('@')[0],
      phone: profile?.phone || undefined,
    };

    localStorage.setItem('farmgrid_session_user', JSON.stringify(appUser));
    return appUser;
  }
);

// ─── RESTORE SESSION ──────────────────────────────────────────────────────────
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const cached = localStorage.getItem('farmgrid_session_user') || localStorage.getItem('farmgrid_demo_user');
      if (cached) {
        return JSON.parse(cached) as AppUser;
      }
    } catch {
      // ignore
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    if (!error && session?.user) {
      const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        return {
          id: session.user.id,
          email: session.user.email!,
          role: profile.role,
          full_name: profile.full_name || '',
          phone: profile.phone || undefined,
        } as AppUser;
      }
    }

    return rejectWithValue('No active session');
  }
);

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    localStorage.removeItem('farmgrid_session_user');
    localStorage.removeItem('farmgrid_demo_user');
  } catch {
    // ignore
  }
  await supabase.auth.signOut();
});

// ─── SLICE ────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    setUser(state, action: PayloadAction<AppUser>) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register Farmer
      .addCase(registerFarmer.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(registerFarmer.fulfilled, (s, a) => {
        s.isLoading = false;
        s.user = a.payload;
      })
      .addCase(registerFarmer.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload as string;
      })
      // Register Organization
      .addCase(registerOrganization.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(registerOrganization.fulfilled, (s, a) => {
        s.isLoading = false;
        s.user = a.payload;
      })
      .addCase(registerOrganization.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload as string;
      })
      // Demo Login
      .addCase(demoLogin.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(demoLogin.fulfilled, (s, a) => {
        s.isLoading = false;
        s.user = a.payload;
      })
      // Login
      .addCase(loginWithPassword.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(loginWithPassword.fulfilled, (s, a) => {
        s.isLoading = false;
        s.user = a.payload;
      })
      .addCase(loginWithPassword.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload as string;
      })
      // Restore session
      .addCase(restoreSession.fulfilled, (s, a) => {
        s.user = a.payload;
        s.isLoading = false;
      })
      .addCase(restoreSession.rejected, (s) => { s.isLoading = false; })
      // Logout
      .addCase(logout.fulfilled, (s) => {
        s.user = null;
        s.error = null;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;

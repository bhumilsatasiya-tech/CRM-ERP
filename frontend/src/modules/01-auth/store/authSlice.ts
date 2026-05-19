import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../api/authApi';
import { STORAGE_KEYS } from '../api/axiosInstance';
import type { LoginRequest, User } from '../types/auth.types';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  expiresAt: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem(STORAGE_KEYS.accessToken),
  expiresAt:   localStorage.getItem(STORAGE_KEYS.expiresAt),
  status: localStorage.getItem(STORAGE_KEYS.accessToken) ? 'authenticated' : 'idle',
  error: null,
};

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload: LoginRequest, { rejectWithValue }) => {
    try {
      const data = await authApi.login(payload);
      localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
      localStorage.setItem(STORAGE_KEYS.expiresAt, data.expires_at);
      return data;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message ?? 'Login failed.');
    }
  },
);

export const fetchMeThunk = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    return await authApi.me();
  } catch {
    return rejectWithValue('Session expired.');
  }
});

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } catch {
    /* ignore — clear local state regardless */
  }
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.expiresAt);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(loginThunk.fulfilled, (s, a) => {
        s.user = a.payload.user;
        s.accessToken = a.payload.access_token;
        s.expiresAt = a.payload.expires_at;
        s.status = 'authenticated';
        s.error = null;
      })
      .addCase(loginThunk.rejected, (s, a) => {
        s.status = 'error';
        s.error = (a.payload as string) ?? a.error.message ?? 'Login failed';
      })
      .addCase(fetchMeThunk.fulfilled, (s, a) => { s.user = a.payload; s.status = 'authenticated'; })
      .addCase(fetchMeThunk.rejected, (s) => {
        s.user = null;
        s.accessToken = null;
        s.expiresAt = null;
        s.status = 'idle';
      })
      .addCase(logoutThunk.fulfilled, (s) => {
        s.user = null;
        s.accessToken = null;
        s.expiresAt = null;
        s.status = 'idle';
      });
  },
});

export const { clearAuthError, setUser } = authSlice.actions;
export default authSlice.reducer;

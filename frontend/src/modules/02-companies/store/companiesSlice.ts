import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { companyApi } from '../api/companyApi';
import { STORAGE_KEYS } from '../../01-auth/api/axiosInstance';
import type { Company } from '../types/companies.types';

export interface CompaniesState {
  list: Company[];
  activeCompanyId: number | null;
  hasAllCompaniesAccess: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
}

const initialActiveId = (() => {
  const raw = localStorage.getItem(STORAGE_KEYS.companyId);
  return raw ? Number(raw) : null;
})();

const initialState: CompaniesState = {
  list: [],
  activeCompanyId: initialActiveId,
  hasAllCompaniesAccess: false,
  status: 'idle',
  error: null,
};

export const fetchMyCompaniesThunk = createAsyncThunk('companies/mine', async (_, { rejectWithValue }) => {
  try {
    return await companyApi.myCompanies();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    return rejectWithValue(err.response?.data?.message ?? 'Failed to load companies.');
  }
});

export const setActiveCompanyThunk = createAsyncThunk(
  'companies/setActive',
  async (companyId: number, { rejectWithValue }) => {
    try {
      await companyApi.setActive(companyId);
      localStorage.setItem(STORAGE_KEYS.companyId, String(companyId));
      return companyId;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message ?? 'Failed to switch company.');
    }
  },
);

const companiesSlice = createSlice({
  name: 'companies',
  initialState,
  reducers: {
    setActiveCompanyLocal(state, action: PayloadAction<number | null>) {
      state.activeCompanyId = action.payload;
      if (action.payload) localStorage.setItem(STORAGE_KEYS.companyId, String(action.payload));
      else localStorage.removeItem(STORAGE_KEYS.companyId);
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchMyCompaniesThunk.pending, (s) => { s.status = 'loading'; s.error = null; })
     .addCase(fetchMyCompaniesThunk.fulfilled, (s, a) => {
       s.list = a.payload.data;
       s.hasAllCompaniesAccess = a.payload.meta.has_all_companies_access;
       const def = a.payload.meta.default_company_id;
       const cachedIsValid = s.activeCompanyId && s.list.some((c) => c.id === s.activeCompanyId);
       // If the cached activeCompanyId is no longer in the user's companies (e.g. that company
       // was deleted/inactivated), reset to the user's default. Without this, every API call
       // sends a stale X-Company-Id header and gets 404'd by the company.context middleware.
       if (!cachedIsValid) {
         const fallback = def && s.list.some((c) => c.id === def)
           ? def
           : (s.list[0]?.id ?? null);
         s.activeCompanyId = fallback;
         if (fallback) localStorage.setItem(STORAGE_KEYS.companyId, String(fallback));
         else localStorage.removeItem(STORAGE_KEYS.companyId);
       }
       s.status = 'ready';
     })
     .addCase(fetchMyCompaniesThunk.rejected, (s, a) => {
       s.status = 'error';
       s.error = (a.payload as string) ?? a.error.message ?? 'Failed';
     })
     .addCase(setActiveCompanyThunk.fulfilled, (s, a) => {
       s.activeCompanyId = a.payload;
     });
  },
});

export const { setActiveCompanyLocal } = companiesSlice.actions;
export default companiesSlice.reducer;

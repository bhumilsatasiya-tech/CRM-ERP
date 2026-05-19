import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export const STORAGE_KEYS = {
  accessToken: 'crm_erp.auth.access_token',
  expiresAt:   'crm_erp.auth.expires_at',
  companyId:   'crm_erp.active_company_id',
} as const;

export const apiClient = axios.create({
  baseURL,
  withCredentials: false,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  // Bumped from 30s → 60s because `php artisan serve` is single-threaded on Windows
  // (PHP_CLI_SERVER_WORKERS isn't supported there) so 5+ parallel requests queue up
  // and individual ones can take 20-30s under cold-cache load.
  timeout: 60_000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken);
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const companyId = localStorage.getItem(STORAGE_KEYS.companyId);
  if (companyId) config.headers['X-Company-Id'] = companyId;

  return config;
});

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

const flushQueue = (token: string | null) => {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
};

/**
 * Globally surface "the user can't fix this by retyping" errors with a notification.
 * Local catch blocks still show their own inline messages for 4xx; we only toast the loud
 * ones (network down, 500 server error) — and we de-dupe rapid bursts so a flapping server
 * doesn't spam 50 toasts in 5 seconds. Caller can opt out by setting `config._suppressGlobalToast = true`.
 */
let lastGlobalToastAt = 0;
const surfaceLoudly = async (error: AxiosError) => {
  const now = Date.now();
  if (now - lastGlobalToastAt < 2500) return; // throttle bursts
  lastGlobalToastAt = now;

  const { notification } = await import('antd');
  const { apiErrorMessage, apiErrorHint } = await import('../../common/apiError');
  const msg = apiErrorMessage(error);
  const hint = apiErrorHint(error);

  notification.error({
    message: 'Something went wrong',
    description: hint ? `${msg}\n\nWhat to do: ${hint}` : msg,
    placement: 'topRight',
    duration: 8,
    style: { whiteSpace: 'pre-wrap' },
  });
};

apiClient.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean; _suppressGlobalToast?: boolean };
    const status = error.response?.status;

    // Loud cases: no response (server unreachable) OR 5xx (server bug). User can't fix
    // these by editing the form — show a sticky notification with a recovery hint.
    const isLoud = !error.response || (status !== undefined && status >= 500);
    if (isLoud && !original?._suppressGlobalToast) {
      void surfaceLoudly(error);
    }

    if (status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
          resolve(apiClient(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const resp = await apiClient.post<{ data: { access_token: string; expires_at: string } }>('/auth/refresh');
      const { access_token, expires_at } = resp.data.data;
      localStorage.setItem(STORAGE_KEYS.accessToken, access_token);
      localStorage.setItem(STORAGE_KEYS.expiresAt, expires_at);
      flushQueue(access_token);

      original.headers = { ...original.headers, Authorization: `Bearer ${access_token}` };
      return apiClient(original);
    } catch (refreshErr) {
      flushQueue(null);
      localStorage.removeItem(STORAGE_KEYS.accessToken);
      localStorage.removeItem(STORAGE_KEYS.expiresAt);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

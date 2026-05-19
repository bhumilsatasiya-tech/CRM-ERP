import { apiClient } from '../../01-auth/api/axiosInstance';

export type ModuleKey = 'project_costing' | 'production' | 'export_bank';

export const MODULE_LABEL: Record<ModuleKey, string> = {
  project_costing: 'Project Costing',
  production:      'Production',
  export_bank:     'Export & Bank',
};

export interface ModuleLock {
  module_key: ModuleKey;
  is_enabled: boolean;
  unlock_minutes: number;
  notes?: string | null;
  updated_at?: string | null;
}

export interface PinStatus {
  has_pin: boolean;
  failed_attempts: number;
  locked_until?: string | null;
  last_unlock_at?: string | null;
  is_locked_out: boolean;
}

export interface UnlockStatus {
  module_key: ModuleKey;
  is_unlocked: boolean;
  unlocked_until?: string | null;
  requires_pin?: boolean;
  is_locked?: boolean;
}

export const securityApi = {
  /* Master ON/OFF (per-company) */
  master: () =>
    apiClient.get<{ data: { is_enabled: boolean; can_manage: boolean } }>('/security/master').then((r) => r.data.data),
  setMaster: (enabled: boolean) =>
    apiClient.put<{ data: { is_enabled: boolean } }>('/security/master', { is_enabled: enabled }).then((r) => r.data.data),

  /* Locks (admin) */
  locks: () =>
    apiClient.get<{ data: ModuleLock[] }>('/security/module-locks').then((r) => r.data.data),
  setLock: (key: ModuleKey, payload: { is_enabled: boolean; unlock_minutes?: number }) =>
    apiClient.put<{ data: ModuleLock }>(`/security/module-locks/${key}`, payload).then((r) => r.data.data),

  /* PIN */
  pinStatus: () =>
    apiClient.get<{ data: PinStatus }>('/security/pin/status').then((r) => r.data.data),
  setPin: (pin: string, currentPin?: string) =>
    apiClient.post<{ data: { message: string } }>('/security/pin', { pin, current_pin: currentPin }).then((r) => r.data.data),
  removePin: (currentPin: string) =>
    apiClient.delete<{ data: { message: string } }>('/security/pin', { data: { current_pin: currentPin } }).then((r) => r.data.data),

  /* Unlock */
  unlock: (key: ModuleKey, pin: string) =>
    apiClient.post<{ data: UnlockStatus }>(`/security/unlock/${key}`, { pin }).then((r) => r.data.data),
  unlockStatus: (key: ModuleKey) =>
    apiClient.get<{ data: UnlockStatus }>(`/security/unlock-status/${key}`).then((r) => r.data.data),
  lock: (key: ModuleKey) =>
    apiClient.post<{ data: { message: string } }>(`/security/lock/${key}`).then((r) => r.data.data),
};

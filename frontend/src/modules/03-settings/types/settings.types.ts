export type SettingScope = 'global' | 'company' | 'user';
export type SettingType = 'string' | 'int' | 'bool' | 'json' | 'select' | 'text';

export interface Setting {
  id: number;
  scope: SettingScope;
  scope_id: number | null;
  group: string;
  key: string;
  value: unknown;
  type: SettingType;
  label?: string | null;
  description?: string | null;
  options?: Array<{ value: string; label: string }> | null;
  is_public: boolean;
  is_system: boolean;
  updated_at?: string;
}

export type SequenceResetPeriod = 'never' | 'yearly' | 'monthly';

export interface Sequence {
  id: number;
  company_id: number;
  doc_type: string;
  name: string;
  prefix: string;
  suffix: string;
  current_number: number;
  padding: number;
  format: string;
  reset_period: SequenceResetPeriod;
  last_reset_at?: string | null;
  is_active: boolean;
  next_preview?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSequencePayload {
  company_id: number;
  doc_type: string;
  name: string;
  prefix?: string;
  suffix?: string;
  current_number?: number;
  padding?: number;
  format: string;
  reset_period: SequenceResetPeriod;
  is_active?: boolean;
}
export type UpdateSequencePayload = Partial<Omit<CreateSequencePayload, 'company_id' | 'doc_type'>>;

export interface AuditLog {
  id: number;
  log_name?: string | null;
  description?: string | null;
  event?: string | null;
  subject_type?: string | null;
  subject_id?: number | null;
  causer_type?: string | null;
  causer_id?: number | null;
  causer?: { id: number; name: string; email: string } | null;
  properties?: Record<string, unknown> | null;
  batch_uuid?: string | null;
  created_at?: string;
}

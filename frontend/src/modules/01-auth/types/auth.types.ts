export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar_path?: string | null;
  locale: string;
  timezone: string;
  default_company_id?: number | null;
  is_active: boolean;
  two_factor_enabled: boolean;
  must_change_password: boolean;
  last_login_at?: string | null;
  email_verified_at?: string | null;
  roles?: string[];
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  description?: string | null;
  is_system: boolean;
  permissions?: string[];
  users_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
  module?: string | null;
  description?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
  device_name?: string;
  remember?: boolean;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  token_type: 'Bearer';
  expires_at: string;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface PaginatedEnvelope<T> {
  data: T[];
  links: { first: string; last: string; prev: string | null; next: string | null };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface UserListFilters {
  search?: string;
  role?: string;
  is_active?: boolean;
  sort?: string;
  page?: number;
  per_page?: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  is_active?: boolean;
  default_company_id?: number | null;
  locale?: string;
  timezone?: string;
  roles?: string[];
  must_change_password?: boolean;
}

export interface UpdateUserPayload extends Partial<Omit<CreateUserPayload, 'password' | 'password_confirmation'>> {}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRolePayload extends Partial<CreateRolePayload> {}

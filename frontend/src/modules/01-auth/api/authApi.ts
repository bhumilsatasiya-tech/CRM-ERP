import { apiClient } from './axiosInstance';
import type {
  ApiEnvelope,
  LoginRequest,
  LoginResponse,
  User,
} from '../types/auth.types';

export const authApi = {
  login: (payload: LoginRequest) =>
    apiClient.post<ApiEnvelope<LoginResponse>>('/auth/login', payload).then((r) => r.data.data),

  logout: () =>
    apiClient.post<ApiEnvelope<{ message: string }>>('/auth/logout').then((r) => r.data.data),

  logoutAll: () =>
    apiClient.post<ApiEnvelope<{ message: string }>>('/auth/logout-all').then((r) => r.data.data),

  me: () =>
    apiClient.get<ApiEnvelope<User>>('/auth/me').then((r) => r.data.data),

  refresh: () =>
    apiClient
      .post<ApiEnvelope<{ access_token: string; token_type: string; expires_at: string }>>('/auth/refresh')
      .then((r) => r.data.data),

  forgotPassword: (email: string) =>
    apiClient
      .post<ApiEnvelope<{ status: string; message: string }>>('/auth/forgot-password', { email })
      .then((r) => r.data.data),

  resetPassword: (payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) =>
    apiClient
      .post<ApiEnvelope<{ status: string; message: string }>>('/auth/reset-password', payload)
      .then((r) => r.data.data),
};

export { default as authReducer } from './store/authSlice';
export {
  loginThunk, logoutThunk, fetchMeThunk, clearAuthError, setUser,
  type AuthState,
} from './store/authSlice';

export { authApi } from './api/authApi';
export { userApi } from './api/userApi';
export { roleApi } from './api/roleApi';
export { apiClient, STORAGE_KEYS } from './api/axiosInstance';

export { default as RequireAuth } from './components/RequireAuth';
export { default as PermissionMatrix } from './components/PermissionMatrix';

export { authPublicRoutes, authPrivateRoutes } from './routes';

export type {
  User, Role, Permission, LoginRequest, LoginResponse,
  CreateUserPayload, UpdateUserPayload,
  CreateRolePayload, UpdateRolePayload,
  ApiEnvelope, PaginatedEnvelope, UserListFilters,
} from './types/auth.types';

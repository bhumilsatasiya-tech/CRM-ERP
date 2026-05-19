import { useEffect, type ReactNode } from 'react';
import { Spin } from 'antd';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchMeThunk } from '../store/authSlice';

interface Props {
  children: ReactNode;
  permission?: string;
}

export default function RequireAuth({ children, permission }: Props) {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { user, accessToken, status } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (accessToken && !user && status !== 'loading') {
      void dispatch(fetchMeThunk());
    }
  }, [accessToken, user, status, dispatch]);

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (permission && !(user.permissions ?? []).includes(permission) && !(user.roles ?? []).includes('super-admin')) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

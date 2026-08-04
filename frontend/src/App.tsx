import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import './App.css'
import NotFoundPage from "@/pages/404";
import OAuthCallback from '@/pages/OAuthCallback';
import { ToastContainer } from 'react-toastify';
import Home from '@/pages/home/Home';
import Campaigns from '@/pages/campaigns/Campaigns';
import About from '@/pages/about/About';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAppDispatch, useAppSelector } from '@/app/hook';
import { getUserProfile } from '@/features/user/userApi';
import { setUserProfile, setProfileChecked } from '@/features/auth/authSlice';
import AdminPage from '@/pages/admin/AdminPage';

function HomeRedirect() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/campaigns" replace />
  }

  return <Home />
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, profileChecked } = useAppSelector((state) => state.auth);
  const role = user?.role;

  // Wait for the profile fetch to resolve before deciding whether to redirect,
  // otherwise a real admin gets bounced on first render (role is undefined
  // until getUserProfile() resolves).
  if (isAuthenticated && !profileChecked) {
    return <div>Loading...</div>
  }

  if (role !== 'admin') {
    return <Navigate to="/campaigns" replace />
  }

  return <>{children}</>
}

function App() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, profileChecked } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && !user?.role && !profileChecked) {
      dispatch(getUserProfile())
        .unwrap()
        .then((data) => dispatch(setUserProfile(data)))
        .catch(() => {})
        .finally(() => dispatch(setProfileChecked(true)));
    }
  }, [isAuthenticated, user?.role, profileChecked, dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route
          path="/campaigns"
          element={
            <ProtectedRoute>
              <MainLayout><Campaigns /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:id"
          element={
            <ProtectedRoute>
              <Campaigns />
            </ProtectedRoute>
          }
        />
        <Route
          path="/about"
          element={
            <ProtectedRoute>
              <MainLayout><About /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <MainLayout><AdminPage /></MainLayout>
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/*" element={<NotFoundPage />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App

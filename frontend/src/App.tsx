import { useEffect } from 'react';
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
import { setUserProfile } from '@/features/auth/authSlice';

function HomeRedirect() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/campaigns" replace />
  }

  return <Home />
}

function App() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && !user?.role) {
      dispatch(getUserProfile())
        .unwrap()
        .then((data) => dispatch(setUserProfile(data)))
        .catch(() => {});
    }
  }, [isAuthenticated, user?.role, dispatch]);

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
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/*" element={<NotFoundPage />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App

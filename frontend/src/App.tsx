import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import './App.css'
import NotFoundPage from "@/pages/404";
import OAuthCallback from '@/pages/OAuthCallback';
import { ToastContainer } from 'react-toastify';
import Login from '@/pages/login/Login';
import Home from '@/pages/home/Home';
import Campaigns from '@/pages/campaigns/Campaigns';
import Signatures from '@/pages/signatures/Signatures';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAppSelector } from '@/app/hook';

function HomeRedirect() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/campaigns" replace />
  }

  return <Home />
}

function App() {
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
          path="/history"
          element={
            <ProtectedRoute>
              <MainLayout><div>History Page</div></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/signatures"
          element={
            <ProtectedRoute>
              <MainLayout><Signatures /></MainLayout>
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

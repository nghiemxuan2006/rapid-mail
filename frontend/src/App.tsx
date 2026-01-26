import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css'
import NotFoundPage from "@/pages/404";
import { ToastContainer } from 'react-toastify';
import Login from '@/pages/login/Login';
import Campaigns from '@/pages/campaigns/Campaigns';
import Signatures from '@/pages/signatures/Signatures';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/campaigns" />
            </ProtectedRoute>
          }
        />
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
        <Route path="/*" element={<NotFoundPage />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css'
import NotFoundPage from "@/pages/404";
import { ToastContainer } from 'react-toastify';
import Login from '@/pages/login/Login';
import Home from '@/pages/home/Home';
import EmailTemplate from '@/pages/email-template/EmailTemplate';
import Campaigns from '@/pages/campaigns/Campaigns';
import MainLayout from '@/components/layout/MainLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/campaigns" />} />
        <Route path="/email-template" element={<MainLayout><EmailTemplate /></MainLayout>} />
        <Route path="/campaigns" element={<MainLayout><Campaigns /></MainLayout>} />
        <Route path="/history" element={<MainLayout><div>History Page</div></MainLayout>} />
        <Route path="/*" element={<NotFoundPage />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App

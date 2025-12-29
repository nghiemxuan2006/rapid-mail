import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css'
import NotFoundPage from "@/pages/404";
import { ToastContainer } from 'react-toastify';
import Login from '@/pages/login/Login';
import Home from '@/pages/home/Home';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        {/* <Route element={<PrivateRoute />}>
                    <Route path="/sendCV" element={<ApplyCv />} />
                </Route> */}
        <Route path="/*" element={<NotFoundPage />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App

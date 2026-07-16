import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Landing from './pages/Landing.jsx';
import Register from './pages/Register.jsx';
import VerifyOtp from './pages/VerifyOtp.jsx';
import Login from './pages/Login.jsx';
import Marketplace from './pages/Marketplace.jsx';
import DAO from './pages/DAO.jsx';

import FarmMap from './pages/farmer/FarmMap.jsx';
import Documents from './pages/farmer/Documents.jsx';
import Dashboard from './pages/farmer/Dashboard.jsx';
import Passport from './pages/farmer/Passport.jsx';
import Analytics from './pages/farmer/Analytics.jsx';

import CompanyDashboard from './pages/company/CompanyDashboard.jsx';
import AdminPanel from './pages/admin/AdminPanel.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/login" element={<Login />} />

        <Route path="/farmer/map" element={<ProtectedRoute role="farmer"><FarmMap /></ProtectedRoute>} />
        <Route path="/farmer/documents" element={<ProtectedRoute role="farmer"><Documents /></ProtectedRoute>} />
        <Route path="/farmer/dashboard" element={<ProtectedRoute role="farmer"><Dashboard /></ProtectedRoute>} />
        <Route path="/farmer/passport" element={<ProtectedRoute role="farmer"><Passport /></ProtectedRoute>} />
        <Route path="/farmer/analytics" element={<ProtectedRoute role="farmer"><Analytics /></ProtectedRoute>} />

        <Route path="/company/dashboard" element={<ProtectedRoute role="company"><CompanyDashboard /></ProtectedRoute>} />

        <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
        <Route path="/dao" element={<ProtectedRoute><DAO /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>} />

        <Route path="*" element={<Landing />} />
      </Routes>
    </>
  );
}

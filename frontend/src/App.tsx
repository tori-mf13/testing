import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SaaSManagement from './pages/SaaSManagement';
import Identity from './pages/Identity';
import Assets from './pages/Assets';
import Security from './pages/Security';
import Infrastructure from './pages/Infrastructure';
import NetworkManagement from './pages/NetworkManagement';
import Procurement from './pages/Procurement';
import PasswordManagement from './pages/PasswordManagement';
import DataRetention from './pages/DataRetention';
import HelpDesk from './pages/HelpDesk';
import Workflows from './pages/Workflows';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="saas" element={<SaaSManagement />} />
          <Route path="identity" element={<Identity />} />
          <Route path="assets" element={<Assets />} />
          <Route path="security" element={<Security />} />
          <Route path="infrastructure" element={<Infrastructure />} />
          <Route path="network" element={<NetworkManagement />} />
          <Route path="procurement" element={<Procurement />} />
          <Route path="passwords" element={<PasswordManagement />} />
          <Route path="retention" element={<DataRetention />} />
          <Route path="tickets" element={<HelpDesk />} />
          <Route path="workflows" element={<Workflows />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

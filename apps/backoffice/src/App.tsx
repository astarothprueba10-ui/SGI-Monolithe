import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { PermissionRoute } from './components/auth/PermissionRoute';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { LotMap } from './pages/LotMap';
import { Crm } from './pages/Crm';
import { Marketing } from './pages/Marketing';
import { Sales } from './pages/Sales';
import { Financing } from './pages/Financing';
import { Finance } from './pages/Finance';
import { Advisors } from './pages/Advisors';
import { Workers } from './pages/Workers';
import { UsersAndRoles } from './pages/UsersAndRoles';
import { Audit } from './pages/Audit';
import { Unauthorized } from './pages/Unauthorized';

type Role = 'Administrador' | 'Asesor' | 'Finanzas' | 'Marketing' | 'RRHH';

export function App({
  role = 'Administrador',
  sidebarCollapsed = false



}: {role?: Role;sidebarCollapsed?: boolean;}) {
  return (
    <AuthProvider role={role}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell initialCollapsed={sidebarCollapsed} />}>
            <Route
              index
              element={
              <PermissionRoute permission="dashboard.view">
                  <Dashboard />
                </PermissionRoute>
              } />
            
            <Route
              path="/proyectos"
              element={
              <PermissionRoute permission="projects.view">
                  <Projects />
                </PermissionRoute>
              } />
            
            <Route
              path="/plano"
              element={
              <PermissionRoute permission="lots.view">
                  <LotMap />
                </PermissionRoute>
              } />
            
            <Route
              path="/crm"
              element={
              <PermissionRoute permission="crm.view">
                  <Crm />
                </PermissionRoute>
              } />
            
            <Route
              path="/marketing"
              element={
              <PermissionRoute permission="marketing.view">
                  <Marketing />
                </PermissionRoute>
              } />
            
            <Route
              path="/ventas"
              element={
              <PermissionRoute permission="sales.view">
                  <Sales />
                </PermissionRoute>
              } />
            
            <Route
              path="/financiamiento"
              element={
              <PermissionRoute permission="financing.view">
                  <Financing />
                </PermissionRoute>
              } />
            
            <Route
              path="/finanzas"
              element={
              <PermissionRoute permission="finance.view">
                  <Finance />
                </PermissionRoute>
              } />
            
            <Route
              path="/asesores"
              element={
              <PermissionRoute permission="advisors.view">
                  <Advisors />
                </PermissionRoute>
              } />
            
            <Route
              path="/trabajadores"
              element={
              <PermissionRoute permission="hr.view">
                  <Workers />
                </PermissionRoute>
              } />
            
            <Route
              path="/usuarios"
              element={
              <PermissionRoute permission="users.view">
                  <UsersAndRoles />
                </PermissionRoute>
              } />
            
            <Route
              path="/auditoria"
              element={
              <PermissionRoute permission="audit.view">
                  <Audit />
                </PermissionRoute>
              } />
            
            <Route path="/no-autorizado" element={<Unauthorized />} />
            <Route path="*" element={<Navigate to="/no-autorizado" replace />} />
          </Route>
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              borderRadius: '8px',
              border: '1px solid #E5EDF5',
              fontSize: '13px',
              color: '#152B45'
            }
          }} />
        
      </BrowserRouter>
    </AuthProvider>);

}
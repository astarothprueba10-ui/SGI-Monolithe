import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PortalLayout } from './components/portal/PortalLayout';
import { PortalFeaturePending } from './components/portal/PortalFeaturePending';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Inicio } from './pages/portal/Inicio';
import { MiLote } from './pages/portal/MiLote';
import { Cronograma } from './pages/portal/Cronograma';
import { Pagos } from './pages/portal/Pagos';
import { Documentos } from './pages/portal/Documentos';
import { NotFound } from './pages/NotFound';
import { ChangePassword } from './pages/ChangePassword';
import { getPortalAuthState } from './lib/portalSession';

function rutaInicialPortal() {
  const estado = getPortalAuthState();
  return estado === 'password-change-required'
    ? '/cambiar-contrasena'
    : estado === 'authenticated' ? '/portal' : '/login';
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const estado = getPortalAuthState();
  if (estado === 'unauthenticated') return <Navigate to="/login" replace />;
  if (estado === 'password-change-required') {
    return <Navigate to="/cambiar-contrasena" replace />;
  }
  return children;
}

function RequirePasswordChange({ children }: { children: React.ReactElement }) {
  const estado = getPortalAuthState();
  if (estado === 'unauthenticated') return <Navigate to="/login" replace />;
  if (estado === 'authenticated') return <Navigate to="/portal" replace />;
  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={rutaInicialPortal()} replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/recuperar-contrasena"
          element={<ForgotPassword />}
        />

        <Route
          path="/restablecer-contrasena"
          element={<ResetPassword />}
        />
        <Route
          path="/cambiar-contrasena"
          element={<RequirePasswordChange><ChangePassword /></RequirePasswordChange>}
        />
        <Route
          path="/portal"
          element={
            <RequireAuth>
              <PortalLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Inicio />} />
          <Route path="lote" element={<MiLote />} />
          <Route path="cronograma" element={<Cronograma />} />
          <Route path="pagos" element={<Pagos />} />
          <Route path="documentos" element={<Documentos />} />
          <Route path="asesor" element={<PortalFeaturePending titulo="Mi asesor" />} />
          <Route path="soporte" element={<PortalFeaturePending titulo="Soporte" />} />
          <Route path="perfil" element={<PortalFeaturePending titulo="Mi perfil" />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

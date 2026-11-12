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


function tieneSesion() {
  const token = localStorage.getItem('monolithe_access_token')
    ?? sessionStorage.getItem('monolithe_access_token');
  const raw = localStorage.getItem('monolithe_user')
    ?? sessionStorage.getItem('monolithe_user');
  if (!token || !raw) return false;
  try {
    const user: unknown = JSON.parse(raw);
    return typeof user === 'object' && user !== null
      && 'autoridades' in user && Array.isArray(user.autoridades)
      && user.autoridades.includes('ROLE_CLIENTE');
  } catch { return false; }
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  return tieneSesion() ? children : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={tieneSesion() ? '/portal' : '/login'} replace />} />
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

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PortalLayout } from './components/portal/PortalLayout';
import { Login } from './pages/Login';
import { Cronograma } from './pages/portal/Cronograma';
import { Documentos } from './pages/portal/Documentos';
import { Inicio } from './pages/portal/Inicio';
import { MiAsesor } from './pages/portal/MiAsesor';
import { MiLote } from './pages/portal/MiLote';
import { Pagos } from './pages/portal/Pagos';
import { Perfil } from './pages/portal/Perfil';
import { Soporte } from './pages/portal/Soporte';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/portal" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<Inicio />} />
          <Route path="lote" element={<MiLote />} />
          <Route path="cronograma" element={<Cronograma />} />
          <Route path="pagos" element={<Pagos />} />
          <Route path="documentos" element={<Documentos />} />
          <Route path="asesor" element={<MiAsesor />} />
          <Route path="soporte" element={<Soporte />} />
          <Route path="perfil" element={<Perfil />} />
        </Route>
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </BrowserRouter>);

}
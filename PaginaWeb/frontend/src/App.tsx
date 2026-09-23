import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Benefits } from './pages/Benefits';
import { Contact } from './pages/Contact';
import { Login } from './pages/auth/Login';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Welcome } from './pages/auth/Welcome';
import { CmsLayout } from './pages/cms/CmsLayout';
import { CmsDashboard } from './pages/cms/CmsDashboard';
import { CmsContentEditor } from './pages/cms/CmsContentEditor';
import { CmsProjects } from './pages/cms/CmsProjects';
import { CmsMedia } from './pages/cms/CmsMedia';
import { CmsPublications } from './pages/cms/CmsPublications';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/nosotros" element={<About />} />
          <Route path="/proyectos" element={<Projects />} />
          <Route path="/proyectos/:slug" element={<ProjectDetail />} />
          <Route path="/beneficios" element={<Benefits />} />
          <Route path="/contacto" element={<Contact />} />
        </Route>

        <Route path="/mi-cuenta" element={<Login />} />
        <Route path="/mi-cuenta/recuperar" element={<ForgotPassword />} />
        <Route path="/mi-cuenta/nueva-contrasena" element={<ResetPassword />} />
        <Route path="/mi-cuenta/bienvenida" element={<Welcome />} />

        <Route path="/cms" element={<CmsLayout />}>
          <Route index element={<CmsDashboard />} />
          <Route path="contenido/:section" element={<CmsContentEditor />} />
          <Route path="proyectos" element={<CmsProjects />} />
          <Route path="imagenes" element={<CmsMedia />} />
          <Route path="publicaciones" element={<CmsPublications />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>);

}
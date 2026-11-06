import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { NotFound } from './pages/NotFound';
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

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>);

}
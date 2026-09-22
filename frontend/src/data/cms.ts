import type { ChangeLogEntry } from '../types/content';
import { IMAGES } from './projects';

export const cmsNav = [
{ label: 'Dashboard', to: '/cms', icon: 'LayoutDashboard', end: true },
{ label: 'Página de Inicio', to: '/cms/contenido/inicio', icon: 'Home' },
{ label: 'Proyectos', to: '/cms/proyectos', icon: 'Building2' },
{ label: 'Beneficios y Servicios', to: '/cms/contenido/beneficios', icon: 'Sparkles' },
{ label: 'Información institucional', to: '/cms/contenido/institucional', icon: 'BookText' },
{ label: 'Contacto', to: '/cms/contenido/contacto', icon: 'PhoneCall' },
{ label: 'Imágenes', to: '/cms/imagenes', icon: 'Images' },
{ label: 'Publicaciones / cambios', to: '/cms/publicaciones', icon: 'History' }];


export const changeLog: ChangeLogEntry[] = [
{ id: 'CH-241', section: 'Inicio · Hero', user: 'Lucía Vásquez', date: '12 sep 2026 · 16:40', state: 'Publicado' },
{ id: 'CH-240', section: 'Proyectos · Los Cocos', user: 'Lucía Vásquez', date: '12 sep 2026 · 11:05', state: 'Borrador' },
{ id: 'CH-239', section: 'Beneficios · Áreas recreativas', user: 'Diego Ramos', date: '10 sep 2026 · 09:22', state: 'En revisión' },
{ id: 'CH-238', section: 'Contacto · Horarios', user: 'Diego Ramos', date: '08 sep 2026 · 17:58', state: 'Publicado' },
{ id: 'CH-237', section: 'Institucional · Misión', user: 'Lucía Vásquez', date: '05 sep 2026 · 12:14', state: 'Publicado' }];


export const mediaLibrary = [
{ id: 'img-01', name: 'hero-aereo-los-cocos.jpg', src: IMAGES.heroAerial, size: '1.8 MB', usedIn: 'Inicio · Hero' },
{ id: 'img-02', name: 'masterplan-los-cocos.jpg', src: IMAGES.masterplan, size: '2.4 MB', usedIn: 'Proyecto · Los Cocos' },
{ id: 'img-03', name: 'alameda-central.jpg', src: IMAGES.heroAvenue, size: '1.5 MB', usedIn: 'Inicio · Hero' },
{ id: 'img-04', name: 'vivienda-modelo.jpg', src: IMAGES.heroHouse, size: '1.9 MB', usedIn: 'Contacto · Hero' },
{ id: 'img-05', name: 'parque-interior.jpg', src: IMAGES.parque, size: '1.2 MB', usedIn: 'Beneficios · Áreas recreativas' },
{ id: 'img-06', name: 'zona-parrillas.jpg', src: IMAGES.parrillas, size: '1.4 MB', usedIn: 'Beneficios · Comodidad' },
{ id: 'img-07', name: 'cancha-deportiva.jpg', src: IMAGES.cancha, size: '1.1 MB', usedIn: 'Galería · Los Cocos' },
{ id: 'img-08', name: 'portico-ingreso.jpg', src: IMAGES.portico, size: '1.6 MB', usedIn: 'Beneficios · Seguridad' },
{ id: 'img-09', name: 'equipo-asesores.jpg', src: IMAGES.team, size: '980 KB', usedIn: 'Nosotros · Quiénes somos' }];


export interface EditableSection {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  active: boolean;
}

export const contentSections: Record<
  string,
  {label: string;route: string;sections: EditableSection[];}> =
{
  inicio: {
    label: 'Página de Inicio',
    route: '/',
    sections: [
    {
      id: 'hero',
      name: 'Hero principal',
      title: 'Invierte hoy en el lugar donde construirás tu futuro',
      subtitle: 'Terrenos pensados para vivir, invertir y crecer.',
      description: 'Carrusel de 3 diapositivas con CTA a proyectos y a contacto.',
      image: IMAGES.heroAerial,
      active: true
    },
    {
      id: 'destacado',
      name: 'Proyecto destacado',
      title: 'Conoce nuestro proyecto',
      subtitle: 'Condominio Campestre Los Cocos · Picsi, Chiclayo',
      description:
      'Bloque con imagen del masterplan, características principales y precio de preventa.',
      image: IMAGES.masterplan,
      active: true
    },
    {
      id: 'inversion',
      name: 'Sección de inversión',
      title: 'Una inversión pensada para tu futuro',
      subtitle: 'Desde S/ 25,900',
      description: 'Tarjeta de precio con inicial, plazo y entidad financiera.',
      image: IMAGES.heroAerial,
      active: true
    },
    {
      id: 'contacto-rapido',
      name: 'Contacto rápido',
      title: 'Déjanos tus datos y te enviamos la información completa',
      subtitle: 'Formulario corto + acceso a WhatsApp',
      description: 'Formulario de captación de prospectos con 4 campos.',
      image: IMAGES.heroHouse,
      active: true
    }]

  },
  beneficios: {
    label: 'Beneficios y Servicios',
    route: '/beneficios',
    sections: [
    {
      id: 'servicios-basicos',
      name: 'Servicios básicos',
      title: 'Servicios básicos',
      subtitle: 'Agua, biodigestor y alumbrado solar',
      description: 'Bloque alternado con imagen y listado de 3 servicios.',
      image: IMAGES.heroAvenue,
      active: true
    },
    {
      id: 'areas-recreativas',
      name: 'Áreas recreativas',
      title: 'Áreas recreativas',
      subtitle: 'Parques, canchas, parrillas y juegos',
      description: 'Bloque alternado con imagen y listado de 4 áreas.',
      image: IMAGES.parque,
      active: true
    },
    {
      id: 'seguridad',
      name: 'Seguridad y acceso',
      title: 'Seguridad y acceso',
      subtitle: 'Pórtico y cerco vivo',
      description: 'Bloque alternado con imagen del pórtico.',
      image: IMAGES.portico,
      active: false
    }]

  },
  institucional: {
    label: 'Información institucional',
    route: '/nosotros',
    sections: [
    {
      id: 'quienes',
      name: 'Quiénes somos',
      title: 'Una inmobiliaria del norte, con estándares de ciudad',
      subtitle: 'Nosotros',
      description: 'Texto institucional, foto del equipo e indicadores.',
      image: IMAGES.team,
      active: true
    },
    {
      id: 'mision',
      name: 'Misión y visión',
      title: 'Misión y visión',
      subtitle: 'Propósito y horizonte al 2030',
      description: 'Dos tarjetas sobre fondo azul noche.',
      image: IMAGES.heroAvenue,
      active: true
    }]

  },
  contacto: {
    label: 'Contacto',
    route: '/contacto',
    sections: [
    {
      id: 'hero-contacto',
      name: 'Hero de contacto',
      title: 'Conversemos sobre tu próxima inversión',
      subtitle: 'Atención comercial de lunes a sábado',
      description: 'Encabezado con imagen de fondo y breadcrumbs.',
      image: IMAGES.heroHouse,
      active: true
    },
    {
      id: 'canales',
      name: 'Canales de atención',
      title: 'Canales de atención',
      subtitle: 'WhatsApp, teléfono, correo, oficina y horario',
      description: 'Tarjeta azul noche con datos de contacto y redes sociales.',
      image: IMAGES.portico,
      active: true
    }]

  }
};
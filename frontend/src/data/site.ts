import type { BenefitCategory } from '../types/content';
import { IMAGES } from './projects';

export const contactInfo = {
  phone: '+51 950 220 118',
  whatsapp: '+51 950 220 118',
  whatsappUrl: 'https://wa.me/51950220118',
  email: 'informes@monolithe.pe',
  address: 'Av. Balta 1050, Of. 302 · Chiclayo, Lambayeque',
  schedule: 'Lunes a viernes 9:00 – 18:30 · Sábados 9:00 – 13:00'
};

export const navLinks = [
{ label: 'Inicio', to: '/' },
{ label: 'Nosotros', to: '/nosotros' },
{ label: 'Proyectos', to: '/proyectos' },
{ label: 'Beneficios y Servicios', to: '/beneficios' },
{ label: 'Contacto', to: '/contacto' }];


export const pillars = [
{
  icon: 'ShieldCheck',
  title: 'Seguridad jurídica',
  text: 'Cada lote se entrega con independización y escritura pública inscrita en Registros Públicos.'
},
{
  icon: 'Wallet',
  title: 'Financiamiento accesible',
  text: 'Inicial desde S/ 8,000 y saldo financiado directamente por MONOLITHE hasta en 36 meses.'
},
{
  icon: 'MapPin',
  title: 'Ubicaciones con potencial',
  text: 'Zonas de expansión en Lambayeque con vías asfaltadas y plusvalía sostenida.'
},
{
  icon: 'HeartHandshake',
  title: 'Atención personalizada',
  text: 'Un asesor te acompaña desde la primera visita hasta la entrega de tu escritura.'
}];


export const homeBenefits = [
{ icon: 'Droplets', title: 'Agua mediante pozo', text: 'Abastecimiento propio para todo el condominio.' },
{ icon: 'Recycle', title: 'Biodigestor', text: 'Tratamiento sanitario ecológico por lote.' },
{ icon: 'Sun', title: 'Alumbrado solar', text: 'Iluminación de vías y áreas comunes con energía solar.' },
{ icon: 'Trees', title: 'Parques y áreas verdes', text: 'Más del 20% del terreno destinado a áreas comunes.' },
{ icon: 'FileCheck2', title: 'Escritura pública', text: 'Tu propiedad saneada y registrada a tu nombre.' },
{ icon: 'Fence', title: 'Pórtico y cerco vivo', text: 'Ingreso controlado y perímetro arborizado.' }];


export const benefitCategories: BenefitCategory[] = [
{
  id: 'servicios-basicos',
  title: 'Servicios básicos',
  intro:
  'Infraestructura lista para que puedas construir y habitar sin depender de terceros.',
  image: IMAGES.heroAvenue,
  items: [
  { name: 'Agua mediante pozo', description: 'Pozo tubular propio con red de distribución interna hacia cada lote.', icon: 'Droplets' },
  { name: 'Biodigestor', description: 'Sistema de tratamiento de aguas residuales ecológico, sin desagüe convencional.', icon: 'Recycle' },
  { name: 'Alumbrado solar', description: 'Postes solares en vías internas, parques y zonas de circulación.', icon: 'Sun' }]

},
{
  id: 'areas-recreativas',
  title: 'Áreas recreativas',
  intro: 'Espacios comunes diseñados para la vida en familia y el encuentro entre vecinos.',
  image: IMAGES.parque,
  items: [
  { name: 'Parques', description: 'Parques interiores distribuidos en todo el condominio.', icon: 'Trees' },
  { name: 'Canchas deportivas', description: 'Losa multideportiva para fulbito, vóley y básquet.', icon: 'Volleyball' },
  { name: 'Parrillas', description: 'Zona de parrillas techada para reuniones familiares.', icon: 'Flame' },
  { name: 'Juegos recreativos', description: 'Área de juegos infantiles con piso seguro.', icon: 'ToyBrick' }]

},
{
  id: 'seguridad-acceso',
  title: 'Seguridad y acceso',
  intro: 'Un solo ingreso controlado y un perímetro definido que protege a las familias.',
  image: IMAGES.portico,
  items: [
  { name: 'Pórtico de ingreso', description: 'Acceso único con caseta de control y vigilancia.', icon: 'DoorOpen' },
  { name: 'Cerco vivo', description: 'Perímetro arborizado que delimita y protege el condominio.', icon: 'Fence' }]

},
{
  id: 'comodidad',
  title: 'Comodidad',
  intro: 'Detalles que hacen la diferencia en el día a día dentro del condominio.',
  image: IMAGES.parrillas,
  items: [
  { name: 'Estacionamientos', description: 'Estacionamientos de visita junto a las áreas comunes.', icon: 'CarFront' },
  { name: 'Vías internas', description: 'Vías afirmadas y señalizadas con amplio radio de giro.', icon: 'Route' }]

},
{
  id: 'seguridad-inversion',
  title: 'Seguridad de inversión',
  intro: 'Toda la documentación en regla para que tu compra sea una inversión tranquila.',
  image: IMAGES.masterplan,
  items: [
  { name: 'Escritura pública', description: 'Firma ante notario e inscripción en Registros Públicos.', icon: 'FileCheck2' },
  { name: 'Documentación del lote', description: 'Partida registral, plano perimétrico y memoria descriptiva.', icon: 'FileText' },
  { name: 'Contrato claro', description: 'Cronograma de pagos, penalidades y entregables por escrito.', icon: 'ScrollText' }]

}];


export const values = [
{ title: 'Transparencia', text: 'Precios, cronogramas y documentos claros desde la primera conversación.' },
{ title: 'Compromiso', text: 'Cumplimos los plazos de habilitación y de entrega de escrituras.' },
{ title: 'Cercanía', text: 'Acompañamos a cada familia con un asesor asignado.' },
{ title: 'Respeto por el entorno', text: 'Diseñamos condominios con más áreas verdes que las exigidas.' }];


export const milestones = [
{ year: '2018', title: 'Nace MONOLITHE', text: 'Iniciamos con la gestión y saneamiento de terrenos en Lambayeque.' },
{ year: '2021', title: 'Primer banco de tierras', text: 'Consolidamos más de 40 hectáreas para desarrollo campestre.' },
{ year: '2024', title: 'Los Cocos', text: 'Lanzamos el Condominio Campestre Los Cocos en Picsi.' },
{ year: '2026', title: 'Expansión', text: 'Nuevos proyectos en Lambayeque y Pimentel en desarrollo.' }];
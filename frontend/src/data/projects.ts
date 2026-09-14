import type { Project } from '../types/content';

export const IMAGES = {
  heroAerial: "/8ef558bc-a786-446d-b292-c0f4b22520d4.jpg",

  heroHouse: "/cf8044ac-2bcb-4026-87a0-709880558bb1.jpg",

  heroAvenue: "/8496469f-0e4d-4822-96d0-8d230cab90ac.jpg",

  masterplan: "/ef0dc28b-65e9-4d0a-a718-271288be8aeb.jpg",

  parque: "/cd13e25c-e7a6-4963-a2c9-23ede519ac80.jpg",

  parrillas: "/099ad36b-1ded-4e2d-a4f4-49a1ddc6b3af.jpg",

  cancha: "/5b63744c-4d9d-43ec-b17f-de3a87e7f78f.jpg",

  portico: "/a309c0e8-417f-4bae-9c2a-6464569d2139.jpg",

  team: "/2d6a4f8f-95dd-475d-9f49-8edb8c80c9c6.jpg",
  authSide: "/33c207e1-424f-4c20-8aa7-f0ef71d5cf9b.jpg"

};

export const projects: Project[] = [
{
  slug: 'condominio-campestre-los-cocos',
  name: 'Condominio Campestre Los Cocos',
  location: 'Picsi, Chiclayo · Lambayeque',
  status: 'Preventa',
  type: 'Lotes campestres',
  priceFrom: 'S/ 25,900',
  areaFrom: '450 m²',
  shortDescription:
  'Lotes campestres desde 450 m² a 30 minutos de Chiclayo, con áreas comunes, servicios y escritura pública.',
  description:
  'Condominio Campestre Los Cocos es el primer proyecto de MONOLITHE en Lambayeque: un condominio cerrado de lotes amplios rodeado de áreas verdes, pensado para construir tu casa de campo o asegurar una inversión con alta proyección de plusvalía. Está ubicado en Picsi, a solo 30 minutos del centro de Chiclayo por vía asfaltada, e incluye servicios básicos, áreas recreativas y seguridad perimetral.',
  cover: IMAGES.masterplan,
  gallery: [
  { src: IMAGES.masterplan, caption: 'Render del masterplan general' },
  { src: IMAGES.heroAerial, caption: 'Vista aérea del terreno' },
  { src: IMAGES.parque, caption: 'Parques y áreas verdes' },
  { src: IMAGES.parrillas, caption: 'Zona de parrillas' },
  { src: IMAGES.cancha, caption: 'Cancha deportiva' },
  { src: IMAGES.portico, caption: 'Pórtico de ingreso' }],

  financing: {
    cash: 'S/ 25,900',
    downPayment: 'S/ 8,000',
    months: 'Hasta 36 meses',
    note: 'Saldo financiable directamente con MONOLITHE, sin banco y sin intereses ocultos.'
  },
  highlights: [
  'Lotes desde 450 m²',
  'A 30 minutos de Chiclayo',
  'Escritura pública incluida',
  'Financiamiento directo'],

  published: true,
  updatedAt: '2026-09-02'
},
{
  slug: 'bosque-real-lambayeque',
  name: 'Bosque Real',
  location: 'Lambayeque · Lambayeque',
  status: 'Próximamente',
  type: 'Lotes campestres',
  priceFrom: 'S/ 31,500',
  areaFrom: '500 m²',
  shortDescription:
  'Segunda etapa campestre con bosque interior, ciclovía y club house. Lanzamiento previsto para 2027.',
  description:
  'Bosque Real será el segundo condominio campestre de MONOLITHE, con un corredor arbolado central, ciclovía interna y club house. Actualmente en etapa de habilitación y documentación.',
  cover: IMAGES.heroAvenue,
  gallery: [{ src: IMAGES.heroAvenue, caption: 'Alameda central' }],
  financing: {
    cash: 'S/ 31,500',
    downPayment: 'S/ 9,500',
    months: 'Hasta 36 meses',
    note: 'Condiciones preliminares sujetas al lanzamiento comercial.'
  },
  highlights: ['Lotes desde 500 m²', 'Club house', 'Ciclovía interna'],
  published: true,
  updatedAt: '2026-08-21'
},
{
  slug: 'mirador-de-pimentel',
  name: 'Mirador de Pimentel',
  location: 'Pimentel, Chiclayo · Lambayeque',
  status: 'En venta',
  type: 'Lotes urbanos',
  priceFrom: 'S/ 44,900',
  areaFrom: '160 m²',
  shortDescription:
  'Lotes urbanos habilitados a 10 minutos de la playa de Pimentel, listos para construir.',
  description:
  'Mirador de Pimentel reúne lotes urbanos habilitados con pistas, veredas y redes de servicios, a pocos minutos del balneario de Pimentel. Ideal para vivienda o para desarrollo de alquiler turístico.',
  cover: IMAGES.heroHouse,
  gallery: [{ src: IMAGES.heroHouse, caption: 'Vivienda modelo' }],
  financing: {
    cash: 'S/ 44,900',
    downPayment: 'S/ 12,000',
    months: 'Hasta 24 meses',
    note: 'Financiamiento directo y crédito hipotecario disponible.'
  },
  highlights: ['Lotes desde 160 m²', 'Servicios habilitados', 'Cerca a la playa'],
  published: true,
  updatedAt: '2026-07-30'
}];


export const featuredProject = projects[0];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
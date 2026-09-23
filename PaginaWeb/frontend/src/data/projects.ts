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
      'Lotes campestres desde 450 m² en Picsi, a aproximadamente 30 minutos de Chiclayo, con financiamiento disponible y espacios pensados para disfrutar de un entorno campestre.',

    description:
      'Condominio Campestre Los Cocos es un proyecto de lotes campestres ubicado en Picsi, a aproximadamente 30 minutos de Chiclayo. Cuenta con lotes desde 450 m² y contempla servicios y espacios comunes como pozo de agua, biodigestor, alumbrado solar, parques, zonas de parrillas, canchas deportivas, pórtico de ingreso, estacionamientos, juegos recreativos y cerco vivo.',

    cover: IMAGES.masterplan,

    gallery: [
      {
        src: IMAGES.masterplan,
        caption: 'Plano general del proyecto'
      },
      {
        src: IMAGES.heroAerial,
        caption: 'Vista del proyecto'
      },
      {
        src: IMAGES.parque,
        caption: 'Parques y áreas verdes'
      },
      {
        src: IMAGES.parrillas,
        caption: 'Zona de parrillas'
      },
      {
        src: IMAGES.cancha,
        caption: 'Cancha deportiva'
      },
      {
        src: IMAGES.portico,
        caption: 'Pórtico de ingreso'
      }
    ],

    financing: {
      cash: 'S/ 25,900',
      downPayment: 'S/ 8,000',
      months: 'Hasta 36 meses',
      note:
        'Financiamiento disponible. Las condiciones finales se determinan según el plan de pago seleccionado.'
    },

    highlights: [
      'Lotes desde 450 m²',
      'Lotes independizados con partida registral propia',
      'Inscritos en el Registro de Predios de SUNARP',
      'A aproximadamente 35 minutos de Chiclayo',
      'Escritura pública',
      'Financiamiento directo'
    ],

    published: true,
    updatedAt: '2026-09-13'
  }
];


export const featuredProject = projects[0];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
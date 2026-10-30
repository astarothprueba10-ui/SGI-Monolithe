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
    status: 'Estado por confirmar',
    type: 'Lotes campestres',
    priceFrom: 'Consultar precio',
    areaFrom: 'Consultar área',

    shortDescription:
      'Proyecto inmobiliario ubicado en Picsi. Consulta con un asesor las áreas de los lotes, disponibilidad y condiciones comerciales vigentes.',

    description:
      'Condominio Campestre Los Cocos es un proyecto inmobiliario ubicado en Picsi. Consulta con un asesor la información oficial de lotes, servicios, espacios comunes y condiciones de adquisición.',

    cover: IMAGES.masterplan,

    gallery: [
      {
        src: IMAGES.masterplan,
        caption: 'Imagen referencial del proyecto'
      },
      {
        src: IMAGES.heroAerial,
        caption: 'Imagen referencial del proyecto'
      },
      {
        src: IMAGES.parque,
        caption: 'Imagen referencial de áreas verdes'
      },
      {
        src: IMAGES.parrillas,
        caption: 'Imagen referencial de área recreativa'
      },
      {
        src: IMAGES.cancha,
        caption: 'Imagen referencial de área deportiva'
      },
      {
        src: IMAGES.portico,
        caption: 'Imagen referencial de ingreso'
      }
    ],

    financing: {
      cash: 'Consultar precio',
      downPayment: 'Consultar con un asesor',
      months: 'Consultar con un asesor',
      note:
        'Consulta con un asesor las condiciones comerciales y alternativas de pago vigentes.'
    },

    highlights: [],

    published: true,
    updatedAt: '2026-09-13'
  }
];


export const featuredProject = projects[0];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
import type { BenefitCategory } from '../types/content';
import { IMAGES } from './projects';

/*
 * Datos empresariales pendientes de confirmación.
 * Se reemplazarán cuando MONOLITHE proporcione la información oficial.
 */
export const contactInfo = {
  phone: '+51 976 514 477',
  whatsapp: '+51 976 514 477',
  whatsappUrl: '/contacto',
  email: 'info@monolithe.com',
  address: 'Chiclayo, Lambayeque',
  schedule: 'Lunes a Viernes de 9:00 am a 6:00 pm y sábados de 9:00 am a 1:00 pm'
};

export const navLinks = [
  { label: 'Inicio', to: '/' },
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Proyectos', to: '/proyectos' },
  { label: 'Beneficios y Servicios', to: '/beneficios' },
  { label: 'Contacto', to: '/contacto' }
];

export const pillars = [
  {
    icon: 'ShieldCheck',
    title: 'Información clara',
    text:
      'Brindamos información transparente sobre el proyecto, las condiciones comerciales y la documentación asociada a cada compra.'
  },
  {
    icon: 'Wallet',
    title: 'Financiamiento flexible',
    text:
      'Los Cocos cuenta con alternativas de pago que permiten adquirir un lote con una inicial desde S/ 8,000 y financiamiento de hasta 36 meses.'
  },
  {
    icon: 'MapPin',
    title: 'Proyecto campestre',
    text:
      'Los Cocos se desarrolla en Picsi, en un entorno pensado para combinar espacios amplios, naturaleza y áreas de uso común.'
  },
  {
    icon: 'HeartHandshake',
    title: 'Atención personalizada',
    text:
      'Nuestros asesores acompañan al cliente durante el proceso de información, visita, elección del lote y compra.'
  }
];

export const homeBenefits = [
  {
    icon: 'Droplets',
    title: 'Agua mediante pozo',
    text: 'El proyecto contempla abastecimiento de agua mediante pozo.'
  },
  {
    icon: 'Recycle',
    title: 'Biodigestor',
    text: 'Sistema previsto para el tratamiento de aguas residuales.'
  },
  {
    icon: 'Sun',
    title: 'Alumbrado solar',
    text: 'Iluminación mediante soluciones de energía solar.'
  },
  {
    icon: 'Trees',
    title: 'Parques y áreas verdes',
    text: 'Espacios destinados al descanso y la convivencia.'
  },
  {
    icon: 'FileCheck2',
    title: 'Escritura pública',
    text: 'La propuesta comercial contempla escritura pública.'
  },
  {
    icon: 'Fence',
    title: 'Pórtico y cerco vivo',
    text: 'Ingreso definido y delimitación mediante cerco vivo.'
  }
];

export const benefitCategories: BenefitCategory[] = [
  {
    id: 'servicios-basicos',
    title: 'Servicios básicos',
    intro:
      'El proyecto contempla soluciones orientadas al abastecimiento y funcionamiento de los lotes.',
    image: IMAGES.heroAvenue,
    items: [
      {
        name: 'Agua mediante pozo',
        description:
          'Abastecimiento de agua mediante pozo para el proyecto.',
        icon: 'Droplets'
      },
      {
        name: 'Biodigestor',
        description:
          'Sistema de tratamiento de aguas residuales contemplado dentro del proyecto.',
        icon: 'Recycle'
      },
      {
        name: 'Alumbrado solar',
        description:
          'Iluminación de espacios mediante soluciones de energía solar.',
        icon: 'Sun'
      }
    ]
  },
  {
    id: 'areas-recreativas',
    title: 'Áreas recreativas',
    intro:
      'Espacios proyectados para favorecer la convivencia, recreación y vida al aire libre.',
    image: IMAGES.parque,
    items: [
      {
        name: 'Parques',
        description:
          'Áreas destinadas al descanso y convivencia.',
        icon: 'Trees'
      },
      {
        name: 'Canchas deportivas',
        description:
          'Espacios destinados a actividades deportivas.',
        icon: 'Volleyball'
      },
      {
        name: 'Parrillas',
        description:
          'Zonas de parrillas para reuniones y actividades familiares.',
        icon: 'Flame'
      },
      {
        name: 'Juegos recreativos',
        description:
          'Espacios recreativos contemplados para los residentes.',
        icon: 'ToyBrick'
      }
    ]
  },
  {
    id: 'seguridad-acceso',
    title: 'Acceso y delimitación',
    intro:
      'Elementos pensados para organizar el ingreso y delimitar el proyecto.',
    image: IMAGES.portico,
    items: [
      {
        name: 'Pórtico de ingreso',
        description:
          'Ingreso principal definido para el proyecto.',
        icon: 'DoorOpen'
      },
      {
        name: 'Cerco vivo',
        description:
          'Delimitación del proyecto mediante elementos naturales.',
        icon: 'Fence'
      }
    ]
  },
  {
    id: 'comodidad',
    title: 'Comodidad',
    intro:
      'Espacios complementarios que contribuyen a una mejor experiencia dentro del proyecto.',
    image: IMAGES.parrillas,
    items: [
      {
        name: 'Estacionamientos',
        description:
          'Espacios destinados al estacionamiento dentro del proyecto.',
        icon: 'CarFront'
      },
      {
        name: 'Áreas comunes',
        description:
          'Espacios planificados para circulación, recreación y convivencia.',
        icon: 'Route'
      }
    ]
  },
  {
    id: 'seguridad-inversion',
    title: 'Documentación',
    intro:
      'La compra contempla documentación que permite formalizar correctamente la adquisición del lote.',
    image: IMAGES.masterplan,
    items: [
      {
        name: 'Escritura pública',
        description:
          'Formalización de la compraventa mediante escritura pública.',
        icon: 'FileCheck2'
      },
      {
        name: 'Lotes independizados',
        description:
          'Cada lote se encuentra independizado e inscrito en el Registro de Predios de la SUNARP, con su propia partida registral electrónica.',
        icon: 'FileText'
      },
      {
        name: 'Contrato y cronograma',
        description:
          'Las condiciones de compra y el cronograma de pagos se entregan documentados.',
        icon: 'ScrollText'
      }
    ]
  }
];

/*
 * Primera propuesta de valores institucionales.
 * Podrán ser administrados posteriormente desde el CMS.
 */
export const values = [
  {
    title: 'Transparencia',
    text:
      'Comunicamos de manera clara las condiciones comerciales, características y documentación de nuestros proyectos.'
  },
  {
    title: 'Compromiso',
    text:
      'Trabajamos para brindar una experiencia responsable durante cada etapa del proceso de compra.'
  },
  {
    title: 'Cercanía',
    text:
      'Acompañamos al cliente mediante una atención personalizada y accesible.'
  },
  {
    title: 'Mejora continua',
    text:
      'Buscamos fortalecer nuestros procesos, servicios y herramientas para ofrecer una mejor experiencia a nuestros clientes.'
  }
];


export const milestones = [
  {
    year: 'Origen',
    title: 'Nace MONOLITHE',
    text:
      'MONOLITHE surge con el propósito de desarrollar y comercializar alternativas inmobiliarias orientadas a familias e inversionistas.'
  },
  {
    year: 'Proyecto actual',
    title: 'Condominio Campestre Los Cocos',
    text:
      'La empresa desarrolla actualmente Los Cocos en Picsi, con lotes campestres desde 450 m² y alternativas de financiamiento.'
  },
  {
    year: 'Actualidad',
    title: 'Fortalecimiento de la gestión',
    text:
      'MONOLITHE viene modernizando sus procesos comerciales y de atención para ofrecer mayor trazabilidad e información a sus clientes.'
  },
  {
    year: 'Proyección',
    title: 'Crecimiento responsable',
    text:
      'La empresa busca consolidar su propuesta inmobiliaria y continuar desarrollando proyectos con procesos cada vez más eficientes.'
  }
];
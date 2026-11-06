import type { ContenidoPreview } from './cmsPreview';

export interface HeroVisual {
  titulo: string;
  subtitulo: string;
  descripcion: string;
  imagenOriginal: string;
  imagenPrivada: string | null;
}

interface HeroBase {
  imagenOriginal: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
}

/**
 * Contenido original tomado del carrusel público.
 * Los títulos y descripciones de los slides 2 y 3
 * permanecen protegidos frente a las modificaciones de Marketing.
 */
const BASES_HERO: Record<string, HeroBase> = {
  HERO_PRINCIPAL: {
    imagenOriginal: '/8ef558bc-a786-446d-b292-c0f4b22520d4.jpg',
    titulo: 'Invierte hoy en el lugar donde construirás tu futuro',
    subtitulo: 'Proyectos inmobiliarios · Chiclayo',
    descripcion:
      'Conoce nuestras propuestas inmobiliarias y solicita información comercial vigente.'
  },

  HERO_SLIDE_2_PROMO: {
    imagenOriginal: '/8496469f-0e4d-4822-96d0-8d230cab90ac.jpg',
    titulo: 'Conoce nuestra propuesta inmobiliaria en Picsi',
    subtitulo: 'Condominio Campestre Los Cocos',
    descripcion:
      'Consulta con un asesor las características, servicios y disponibilidad del proyecto.'
  },

  HERO_SLIDE_3_PROMO: {
    imagenOriginal: '/cf8044ac-2bcb-4026-87a0-709880558bb1.jpg',
    titulo: 'Consulta las opciones de adquisición del proyecto',
    subtitulo: 'Información comercial',
    descripcion:
      'Solicita los precios y las condiciones de pago vigentes a un asesor.'
  }
};

const BASE_DESCONOCIDA: HeroBase = {
  imagenOriginal: '/cms-preview-hero-aerial.jpg',
  titulo: 'Vista previa no disponible',
  subtitulo: '',
  descripcion: ''
};

function textoConRespaldo(valor: string, respaldo: string): string {
  return valor.trim().length > 0 ? valor : respaldo;
}

/**
 * Construye la representación visual de una diapositiva.
 *
 * Slide 1:
 * - Título editable.
 * - Subtítulo editable.
 * - Descripción editable.
 *
 * Slides 2 y 3:
 * - Título original protegido.
 * - Subtítulo editable.
 * - Descripción original protegida.
 *
 * Las imágenes privadas únicamente se muestran en el borrador.
 */
export function proyectarHeroVisual(
  datos: ContenidoPreview,
  esBorrador: boolean,
  codigoSeccion: string,
  imagenLocal: string | null = null,
  imagenGuardada: string | null = null
): HeroVisual {
  const base = BASES_HERO[codigoSeccion] ?? BASE_DESCONOCIDA;
  const lado = esBorrador ? 'borrador' : 'actual';

  const esPrincipal = codigoSeccion === 'HERO_PRINCIPAL';

  const candidata = esBorrador
    ? [imagenLocal, imagenGuardada].find(
      (url): url is string => Boolean(url?.startsWith('blob:'))
    ) ?? null
    : null;

  return {
    titulo: esPrincipal
      ? textoConRespaldo(datos.titulo[lado], base.titulo)
      : base.titulo,

    subtitulo: textoConRespaldo(
      datos.subtitulo[lado],
      base.subtitulo
    ),

    descripcion: esPrincipal
      ? textoConRespaldo(datos.contenido[lado], base.descripcion)
      : base.descripcion,

    imagenOriginal: base.imagenOriginal,
    imagenPrivada: candidata
  };
}
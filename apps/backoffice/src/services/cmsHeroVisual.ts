import type { ContenidoPreview } from './cmsPreview';

/** Construye un slide visual privado sin consultar ni alterar el contenido publicado. */
export interface HeroVisual {
  titulo: string;
  subtitulo: string;
  descripcion: string;
  imagenPrivada: string | null;
}

export function proyectarHeroVisual(
  datos: ContenidoPreview,
  esBorrador: boolean,
  imagenLocal: string | null = null,
  imagenGuardada: string | null = null
): HeroVisual {
  const lado = esBorrador ? 'borrador' : 'actual';
  const candidata = esBorrador ? imagenLocal ?? imagenGuardada : null;
  const imagenPrivada = candidata?.startsWith('blob:') ? candidata : null;
  return {
    titulo: datos.titulo[lado],
    subtitulo: datos.subtitulo[lado],
    descripcion: datos.contenido[lado],
    imagenPrivada
  };
}

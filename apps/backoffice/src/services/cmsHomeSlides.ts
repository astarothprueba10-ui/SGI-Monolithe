/** Inventario explícito de las diapositivas existentes; los datos oficiales no son editables. */
export type EstadoSlideInicio = 'EDITOR_CMS' | 'PENDIENTE_MODELO';

export interface SlideInicioInventario {
  numero: 1 | 2 | 3;
  clave: 'principal' | 'proyecto' | 'financiamiento';
  nombre: string;
  estado: EstadoSlideInicio;
  descripcion: string;
  idSeccionCms: number | null;
}

export interface SeccionInicioInventario {
  codigo: string;
  idSeccion: number;
  activo: boolean;
  visible?: boolean;
}

const definiciones = [
  { numero: 1, clave: 'principal', codigo: 'HERO_PRINCIPAL', nombre: 'Presentación principal' },
  { numero: 2, clave: 'proyecto', codigo: 'HERO_SLIDE_2_PROMO', nombre: 'Presentación del proyecto' },
  { numero: 3, clave: 'financiamiento', codigo: 'HERO_SLIDE_3_PROMO', nombre: 'Presentación de financiamiento' }
] as const;

/** Los slides promocionales se editan antes y después de su primera publicación.
 * Requerimos visibilidad booleana explícita para evitar aceptar un inventario incompleto.
 */
export function inventariarSlidesInicio(
  secciones: readonly SeccionInicioInventario[] | null
): SlideInicioInventario[] {
  return definiciones.map((definicion) => {
    const encontrada = secciones?.find((s) =>
      s.codigo === definicion.codigo && s.activo &&
      Number.isSafeInteger(s.idSeccion) && s.idSeccion > 0 &&
      (definicion.numero === 1 || typeof s.visible === 'boolean')
    );
    const descripcion = definicion.numero === 1
      ? 'Textos e imagen de la sección principal, siempre mediante borrador privado.'
      : 'Solo textos e imagen promocionales; características y condiciones oficiales siguen fuera del editor.';
    return {
      numero: definicion.numero,
      clave: definicion.clave,
      nombre: definicion.nombre,
      estado: encontrada ? 'EDITOR_CMS' as const : 'PENDIENTE_MODELO' as const,
      descripcion,
      idSeccionCms: encontrada?.idSeccion ?? null
    };
  });
}

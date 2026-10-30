/** Datos del hero ya publicados; nunca se consultan tablas de borradores. */
export function heroPublicadoHabilitado(valor: unknown): boolean {
  return valor === 'true';
}

export interface HeroPublicado {
  titulo?: string;
  subtitulo?: string;
  contenido?: string;
  imagen?: string;
}

export interface HeroSlide {
  image: string;
  eyebrow: string;
  title: string;
  text: string;
}

function objeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function texto(valor: unknown): string | undefined {
  if (typeof valor !== 'string') return undefined;
  const resultado = valor.trim();
  return resultado.length > 0 ? resultado : undefined;
}

function imagenPublica(valor: unknown): string | undefined {
  const cadena = texto(valor);
  if (!cadena) return undefined;
  try {
    const url = new URL(cadena);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    if (decodeURIComponent(url.pathname).toLowerCase().includes('cms-drafts-private')) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/** Interpreta exclusivamente el endpoint de contenido publicado de la página INICIO. */
export function extraerHeroPublicado(datos: unknown): HeroPublicado | null {
  if (!objeto(datos) || datos.codigo !== 'INICIO' || !Array.isArray(datos.secciones)) return null;
  const seccion = datos.secciones.find((s: unknown) => objeto(s) && s.codigo === 'HERO_PRINCIPAL');
  if (!objeto(seccion)) return null;

  const media = Array.isArray(seccion.multimedia) ? seccion.multimedia : [];
  const fondos = media.filter((m: unknown) => objeto(m) && m.usoMultimediaCodigo === 'FONDO');
  const candidatos = fondos.length > 0 ? fondos : media;
  const imagen = candidatos.map((m: unknown) => objeto(m) ? imagenPublica(m.urlPublica) : undefined)
    .find((valor: string | undefined) => Boolean(valor));
  const hero = {
    titulo: texto(seccion.titulo),
    subtitulo: texto(seccion.subtitulo),
    contenido: texto(seccion.contenido),
    imagen
  };
  return Object.values(hero).some(Boolean) ? hero : null;
}

/** Mantiene los slides existentes si falta un campo o la sección publicada. */
export function aplicarHeroPublicado(originales: readonly HeroSlide[], hero: HeroPublicado | null): HeroSlide[] {
  if (!originales.length) return [];
  if (!hero) return [...originales];
  const primero = originales[0];
  return [{
    ...primero,
    image: hero.imagen ?? primero.image,
    eyebrow: hero.subtitulo ?? primero.eyebrow,
    title: hero.titulo ?? primero.title,
    text: hero.contenido ?? primero.text
  }, ...originales.slice(1)];
}

/** Si el proyecto fue ocultado, el CMS no debe volver a exponer su promoción. */
export function resolverSlidesVisibles(
  originales: readonly HeroSlide[], hero: HeroPublicado | null,
  proyectoPublicado: boolean, alternativo: HeroSlide
): HeroSlide[] {
  return proyectoPublicado ? aplicarHeroPublicado(originales, hero) : [alternativo];
}

export async function obtenerHeroPublicado(
  apiBase: string,
  signal?: AbortSignal,
  cliente: typeof fetch = fetch
): Promise<HeroPublicado | null> {
  const url = `${apiBase.replace(/\/+$/, '')}/api/public/paginas/contenido/codigo/INICIO`;
  const respuesta = await cliente(url, { headers: { Accept: 'application/json' }, cache: 'no-store', signal });
  if (!respuesta.ok) throw new Error('No se pudo recuperar el contenido CMS publicado');
  return extraerHeroPublicado(await respuesta.json() as unknown);
}

/** CMS 3D.3D: solo secciones recibidas por la API de contenido publicado. */
export interface SlidesCmsPublicados {
  principal: HeroPublicado | null;
  proyecto: PromocionPublicada | null;
  financiamiento: PromocionPublicada | null;
}

export function promocionesCmsHabilitadas(hero: unknown, promos: unknown): boolean {
  return heroPublicadoHabilitado(hero) && heroPublicadoHabilitado(promos);
}

export interface PromocionPublicada {
  subtitulo?: string;
  imagen?: string;
}

function buscarSeccionPublica(datos: Record<string, unknown>, codigo: string): Record<string, unknown> | null {
  const secciones = datos.secciones;
  if (!Array.isArray(secciones)) return null;
  const seccion = secciones.find((s: unknown) => objeto(s) && s.codigo === codigo &&
    s.visible !== false && s.activo !== false);
  return objeto(seccion) ? seccion : null;
}

function extraerImagenPublicada(seccion: Record<string, unknown>): string | undefined {
  const media = Array.isArray(seccion.multimedia) ? seccion.multimedia : [];
  const fondos = media.filter((m: unknown) => objeto(m) && m.usoMultimediaCodigo === 'FONDO');
  const candidatos = fondos.length > 0 ? fondos : media;
  return candidatos.map((m: unknown) => objeto(m) ? imagenPublica(m.urlPublica) : undefined)
    .find((url: string | undefined) => Boolean(url));
}

function extraerPromocionPublicada(seccion: Record<string, unknown> | null): PromocionPublicada | null {
  if (!seccion) return null;
  const promo = { subtitulo: texto(seccion.subtitulo), imagen: extraerImagenPublicada(seccion) };
  return Object.values(promo).some(Boolean) ? promo : null;
}

/** Ignora códigos desconocidos, secciones explícitamente ocultas y cualquier borrador. */
export function extraerSlidesCmsPublicados(datos: unknown): SlidesCmsPublicados | null {
  if (!objeto(datos) || datos.codigo !== 'INICIO' || !Array.isArray(datos.secciones)) return null;
  const principal = buscarSeccionPublica(datos, 'HERO_PRINCIPAL');
  const proyecto = buscarSeccionPublica(datos, 'HERO_SLIDE_2_PROMO');
  const financiamiento = buscarSeccionPublica(datos, 'HERO_SLIDE_3_PROMO');
  return {
    principal: principal ? extraerHeroPublicado({ codigo: 'INICIO', secciones: [principal] }) : null,
    proyecto: extraerPromocionPublicada(proyecto),
    financiamiento: extraerPromocionPublicada(financiamiento)
  };
}

/** Mantiene títulos, metrajes, precios, plazos y descripción comercial fuera del CMS promocional. */
export function aplicarSlidesCmsPublicados(
  originales: readonly HeroSlide[], cms: SlidesCmsPublicados | null, promosHabilitadas: boolean
): HeroSlide[] {
  const resultado = aplicarHeroPublicado(originales, cms?.principal ?? null);
  if (!promosHabilitadas) return resultado;
  for (const [index, promo] of [[1, cms?.proyecto], [2, cms?.financiamiento]] as const) {
    if (!resultado[index] || !promo) continue;
    resultado[index] = { ...resultado[index],
      image: promo.imagen ?? resultado[index].image,
      eyebrow: promo.subtitulo ?? resultado[index].eyebrow };
  }
  return resultado;
}

/** La ocultación del proyecto prevalece sobre cualquier contenido recibido del CMS. */
export function resolverSlidesCmsVisibles(
  originales: readonly HeroSlide[], cms: SlidesCmsPublicados | null, proyectoPublicado: boolean,
  alternativo: HeroSlide, promosHabilitadas: boolean
): HeroSlide[] {
  return proyectoPublicado ? aplicarSlidesCmsPublicados(originales, cms, promosHabilitadas) : [alternativo];
}

/** Una sola lectura pública sin JWT; no consulta borradores ni Storage privado. */
export async function obtenerSlidesCmsPublicados(
  apiBase: string, signal?: AbortSignal, cliente: typeof fetch = fetch
): Promise<SlidesCmsPublicados | null> {
  const url = `${apiBase.replace(/\/+$/, '')}/api/public/paginas/contenido/codigo/INICIO`;
  const respuesta = await cliente(url, { headers: { Accept: 'application/json' }, cache: 'no-store', signal });
  if (!respuesta.ok) throw new Error('No se pudo recuperar el contenido público de Inicio');
  return extraerSlidesCmsPublicados(await respuesta.json() as unknown);
}

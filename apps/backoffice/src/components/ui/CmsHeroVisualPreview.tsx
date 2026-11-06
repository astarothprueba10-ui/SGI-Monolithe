import { ChevronLeft, ChevronRight } from 'lucide-react';
import { proyectarHeroVisual } from '../../services/cmsHeroVisual';
import type { ContenidoPreview } from '../../services/cmsPreview';
import './CmsHeroVisualPreview.css';

interface Props {
  datos: ContenidoPreview;
  codigoSeccion: string;
  esBorrador: boolean;
  movil: boolean;
  imagenLocal?: string | null;
  imagenGuardada?: string | null;
  onErrorImagen?: () => void;
}

/**
 * Representación visual privada de cualquiera de los tres slides.
 * No navega, no publica y no modifica contenido.
 */
export function CmsHeroVisualPreview({
  datos,
  codigoSeccion,
  esBorrador,
  movil,
  imagenLocal,
  imagenGuardada,
  onErrorImagen
}: Props) {
  const hero = proyectarHeroVisual(
    datos,
    esBorrador,
    codigoSeccion,
    imagenLocal,
    imagenGuardada
  );

  const imagenMostrar =
    hero.imagenPrivada ?? hero.imagenOriginal;

  return (
    <div
      className={`cms-hero-visual ${movil ? 'cms-hero-visual--mobile' : ''
        }`}
      aria-label={
        esBorrador
          ? `Previsualización privada de ${codigoSeccion}`
          : `Contenido actual de ${codigoSeccion}`
      }
    >
      <img
        src={imagenMostrar}
        alt=""
        aria-hidden="true"
        className="cms-hero-visual__image"
        onError={
          hero.imagenPrivada ? onErrorImagen : undefined
        }
      />

      <div
        className="cms-hero-visual__shade"
        aria-hidden="true"
      />

      <div className="cms-hero-visual__layout">
        <div className="cms-hero-visual__content">

          {hero.subtitulo && (
            <p className="cms-hero-visual__eyebrow">
              {hero.subtitulo}
            </p>
          )}

          <h4 className="cms-hero-visual__title">
            {hero.titulo}
          </h4>

          {hero.descripcion && (
            <p className="cms-hero-visual__description">
              {hero.descripcion}
            </p>
          )}

          <div
            className="cms-hero-visual__actions"
            aria-label="Botones decorativos de la página pública"
          >
            <span className="cms-hero-visual__cta">
              Conoce nuestros proyectos
            </span>

            <span className="cms-hero-visual__cta cms-hero-visual__cta--secondary">
              Solicitar información
            </span>
          </div>
        </div>

        <div
          className="cms-hero-visual__navigation"
          aria-hidden="true"
        >
          <div className="cms-hero-visual__dots">
            <i />
            <i />
            <i />
          </div>

          <span className="cms-hero-visual__arrow">
            <ChevronLeft size={16} />
          </span>

          <span className="cms-hero-visual__arrow">
            <ChevronRight size={16} />
          </span>
        </div>
      </div>

      {esBorrador && hero.imagenPrivada && (
        <span className="cms-hero-visual__label">
          Imagen privada · solo previsualización
        </span>
      )}
    </div>
  );
}
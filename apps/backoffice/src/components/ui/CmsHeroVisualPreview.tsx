import { ChevronLeft, ChevronRight } from 'lucide-react';
import { proyectarHeroVisual } from '../../services/cmsHeroVisual';
import type { ContenidoPreview } from '../../services/cmsPreview';
import './CmsHeroVisualPreview.css';

interface Props {
  datos: ContenidoPreview;
  esBorrador: boolean;
  movil: boolean;
  fondoPrincipal?: boolean;
  imagenLocal?: string | null;
  imagenGuardada?: string | null;
  onErrorImagen?: () => void;
}

/** Representación aislada del primer slide público; nunca navega ni publica. */
export function CmsHeroVisualPreview({ datos, esBorrador, movil, fondoPrincipal = true, imagenLocal,
  imagenGuardada, onErrorImagen }: Props) {
  const hero = proyectarHeroVisual(datos, esBorrador, imagenLocal, imagenGuardada);
  return (
    <div className={`cms-hero-visual ${movil ? 'cms-hero-visual--mobile' : ''} ${!fondoPrincipal ? 'cms-hero-visual--sin-referencia' : ''}`}
      aria-label={esBorrador ? 'Diseño del hero con cambios privados' : 'Diseño del hero con textos del CMS actual'}>
      {hero.imagenPrivada && <img src={hero.imagenPrivada} alt="" aria-hidden="true"
        onError={onErrorImagen} className="cms-hero-visual__image" />}
      <div className="cms-hero-visual__shade" aria-hidden="true" />
      <div className="cms-hero-visual__layout">
        <div className="cms-hero-visual__content">
          {hero.subtitulo && <p className="cms-hero-visual__eyebrow">{hero.subtitulo}</p>}
          <h4 className="cms-hero-visual__title">{hero.titulo || 'Sin título'}</h4>
          {hero.descripcion && <p className="cms-hero-visual__description">{hero.descripcion}</p>}
          <div className="cms-hero-visual__actions" aria-label="Botones decorativos de la página pública">
            <span className="cms-hero-visual__cta">Conoce nuestros proyectos</span>
            <span className="cms-hero-visual__cta cms-hero-visual__cta--secondary">Solicitar información</span>
          </div>
        </div>
        <div className="cms-hero-visual__navigation" aria-hidden="true">
          <div className="cms-hero-visual__dots"><i /><i /><i /></div>
          <span className="cms-hero-visual__arrow"><ChevronLeft size={16} /></span>
          <span className="cms-hero-visual__arrow"><ChevronRight size={16} /></span>
        </div>
      </div>
      {esBorrador && hero.imagenPrivada && <span className="cms-hero-visual__label">
        Imagen privada · solo previsualización
      </span>}
    </div>
  );
}

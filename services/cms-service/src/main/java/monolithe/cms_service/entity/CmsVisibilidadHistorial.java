package monolithe.cms_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.time.OffsetDateTime;

/** Registro append-only independiente del historial de páginas (migración 36). */
@Entity
@Immutable
@Table(name = "cms_visibilidad_historial")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CmsVisibilidadHistorial {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_historial", updatable = false)
    private Long idHistorial;

    @Column(name = "id_borrador", nullable = false, updatable = false)
    private Long idBorrador;

    @Column(name = "id_proyecto", nullable = false, updatable = false)
    private Long idProyecto;

    @Column(name = "id_usuario_publicacion", nullable = false, updatable = false)
    private Long idUsuarioPublicacion;

    @Column(name = "revision_anterior", nullable = false, updatable = false)
    private Long revisionAnterior;

    @Column(name = "revision_nueva", nullable = false, updatable = false)
    private Long revisionNueva;

    @Column(name = "visible_anterior", nullable = false, updatable = false)
    private Boolean visibleAnterior;

    @Column(name = "visible_nuevo", nullable = false, updatable = false)
    private Boolean visibleNuevo;

    @Column(name = "fecha_publicacion", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime fechaPublicacion;

    public static CmsVisibilidadHistorial nueva(Long idBorrador, Long idProyecto, Long idUsuario,
             long revisionAnterior, boolean visibleAnterior, boolean visibleNuevo) {
        if (idBorrador == null || idBorrador <= 0 || idProyecto == null || idProyecto <= 0
                || idUsuario == null || idUsuario <= 0 || revisionAnterior < 0
                || revisionAnterior == Long.MAX_VALUE || visibleAnterior == visibleNuevo) {
            throw new IllegalArgumentException("Publicación de visibilidad inválida");
        }
        CmsVisibilidadHistorial historia = new CmsVisibilidadHistorial();
        historia.idBorrador = idBorrador;
        historia.idProyecto = idProyecto;
        historia.idUsuarioPublicacion = idUsuario;
        historia.revisionAnterior = revisionAnterior;
        historia.revisionNueva = revisionAnterior + 1;
        historia.visibleAnterior = visibleAnterior;
        historia.visibleNuevo = visibleNuevo;
        return historia;
    }
}

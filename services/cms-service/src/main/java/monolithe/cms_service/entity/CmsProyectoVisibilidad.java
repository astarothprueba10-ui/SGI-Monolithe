package monolithe.cms_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/** Estado de publicación; jamás sustituye a los datos oficiales de inm_proyectos. */
@Entity
@Table(name = "cms_proyectos_visibilidad")
@Getter
@Setter
@NoArgsConstructor
public class CmsProyectoVisibilidad {
    @Id
    @Column(name = "id_proyecto")
    private Long idProyecto;

    @Column(name = "visible_publico", nullable = false)
    private Boolean visiblePublico = false;

    @Column(name = "fecha_creacion", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private OffsetDateTime fechaActualizacion = OffsetDateTime.now(ZoneOffset.UTC);

    @PreUpdate
    void actualizarFecha() {
        fechaActualizacion = OffsetDateTime.now(ZoneOffset.UTC);
    }
}

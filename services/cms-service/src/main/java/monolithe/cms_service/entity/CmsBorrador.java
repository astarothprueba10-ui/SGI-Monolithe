package monolithe.cms_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "cms_borradores")
@Getter
@Setter
@NoArgsConstructor
public class CmsBorrador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_borrador")
    private Long idBorrador;

    @Column(name = "id_grupo_edicion", nullable = false)
    private UUID idGrupoEdicion = UUID.randomUUID();

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_objetivo", nullable = false, length = 30)
    private TipoObjetivoBorrador tipoObjetivo;

    @Column(name = "id_pagina")
    private Long idPagina;

    @Column(name = "id_proyecto")
    private Long idProyecto;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "contenido_pendiente", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> contenidoPendiente = new LinkedHashMap<>();

    @Column(name = "revision_base", nullable = false)
    private Long revisionBase = 0L;

    // Revisión editorial: se incrementará desde el servicio al actualizar un borrador.
    @Column(name = "revision_edicion", nullable = false)
    private Long revisionEdicion = 1L;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoBorrador estado = EstadoBorrador.EN_EDICION;

    @Column(name = "id_usuario_registro", nullable = false)
    private Long idUsuarioRegistro;

    @Column(name = "id_usuario_publicacion")
    private Long idUsuarioPublicacion;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private OffsetDateTime fechaActualizacion;

    @Column(name = "fecha_publicacion")
    private OffsetDateTime fechaPublicacion;

    @PrePersist
    void antesDeCrear() {
        OffsetDateTime ahora = OffsetDateTime.now(ZoneOffset.UTC);
        if (fechaCreacion == null) {
            fechaCreacion = ahora;
        }
        if (fechaActualizacion == null) {
            fechaActualizacion = ahora;
        }
    }

    @PreUpdate
    void antesDeActualizar() {
        fechaActualizacion = OffsetDateTime.now(ZoneOffset.UTC);
    }
}

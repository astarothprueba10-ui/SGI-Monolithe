package monolithe.cms_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "cms_multimedia_asignaciones")
@Getter
@Setter
@NoArgsConstructor
public class MultimediaAsignacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_multimedia_asignacion")
    private Long idMultimediaAsignacion;

    @Column(name = "id_multimedia", nullable = false)
    private Long idMultimedia;

    @Column(name = "id_uso_multimedia", nullable = false)
    private Integer idUsoMultimedia;

    @Column(name = "id_pagina")
    private Long idPagina;

    @Column(name = "id_seccion")
    private Long idSeccion;

    @Column(name = "id_seccion_item")
    private Long idSeccionItem;

    @Column(name = "orden", nullable = false)
    private Integer orden = 0;

    @Column(name = "visible", nullable = false)
    private Boolean visible = true;

    @Column(name = "fecha_desde")
    private OffsetDateTime fechaDesde;

    @Column(name = "fecha_hasta")
    private OffsetDateTime fechaHasta;

    @Column(name = "id_usuario_registro")
    private Long idUsuarioRegistro;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(
            name = "fecha_creacion",
            insertable = false,
            updatable = false
    )
    private OffsetDateTime fechaCreacion;

    @Column(
            name = "fecha_actualizacion",
            insertable = false,
            updatable = false
    )
    private OffsetDateTime fechaActualizacion;
}
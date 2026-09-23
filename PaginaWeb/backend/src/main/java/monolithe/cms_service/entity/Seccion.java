package monolithe.cms_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "cms_secciones")
@Getter
@Setter
@NoArgsConstructor
public class Seccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_seccion")
    private Long idSeccion;

    @Column(name = "id_pagina", nullable = false)
    private Long idPagina;

    @Column(name = "id_tipo_seccion", nullable = false)
    private Integer idTipoSeccion;

    @Column(name = "codigo", nullable = false, length = 50)
    private String codigo;

    @Column(name = "titulo", length = 180)
    private String titulo;

    @Column(name = "subtitulo", length = 255)
    private String subtitulo;

    @Column(name = "contenido", columnDefinition = "TEXT")
    private String contenido;

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

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", insertable = false, updatable = false)
    private OffsetDateTime fechaActualizacion;
}

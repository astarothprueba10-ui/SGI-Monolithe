package monolithe.cms_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "pagina")
@Getter
@Setter
@NoArgsConstructor
public class Pagina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pagina")
    private Long idPagina;

    @Column(name = "id_estado", nullable = false)
    private Short idEstado;

    @Column(name = "id_usuario_registra")
    private Long idUsuarioRegistra;

    @Column(name = "id_usuario_publica")
    private Long idUsuarioPublica;

    @Column(name = "codigo", nullable = false, length = 40)
    private String codigo;

    @Column(name = "ruta", nullable = false, length = 150)
    private String ruta;

    @Column(name = "titulo", nullable = false, length = 180)
    private String titulo;

    @Column(name = "descripcion", length = 500)
    private String descripcion;

    @Column(name = "titulo_seo", length = 180)
    private String tituloSeo;

    @Column(name = "descripcion_seo", length = 320)
    private String descripcionSeo;

    @Column(name = "orden", nullable = false)
    private Short orden = 0;

    @Column(name = "mostrar_menu", nullable = false)
    private Boolean mostrarMenu = true;

    @Column(name = "fecha_publicacion")
    private LocalDateTime fechaPublicacion;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(
            name = "fecha_creacion",
            insertable = false,
            updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(
            name = "fecha_actualizacion",
            insertable = false,
            updatable = false)
    private LocalDateTime fechaActualizacion;
}
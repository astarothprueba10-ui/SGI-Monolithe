package monolithe.cms_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "cms_paginas")
@Getter
@Setter
@NoArgsConstructor
public class Pagina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pagina")
    private Long idPagina;

    @Column(name = "id_estado_publicacion", nullable = false)
    private Integer idEstadoPublicacion;

    @Column(name = "codigo", nullable = false, length = 40, unique = true)
    private String codigo;

    @Column(name = "slug", nullable = false, length = 150, unique = true)
    private String slug;

    @Column(name = "titulo", nullable = false, length = 180)
    private String titulo;

    @Column(name = "descripcion", length = 500)
    private String descripcion;

    @Column(name = "titulo_seo", length = 180)
    private String tituloSeo;

    @Column(name = "descripcion_seo", length = 320)
    private String descripcionSeo;

    @Column(name = "orden", nullable = false)
    private Integer orden = 0;

    @Column(name = "mostrar_menu", nullable = false)
    private Boolean mostrarMenu = true;

    @Column(name = "fecha_publicacion")
    private OffsetDateTime fechaPublicacion;

    @Column(name = "id_usuario_registro")
    private Long idUsuarioRegistro;

    @Column(name = "id_usuario_publicacion")
    private Long idUsuarioPublicacion;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", insertable = false, updatable = false)
    private OffsetDateTime fechaActualizacion;
}
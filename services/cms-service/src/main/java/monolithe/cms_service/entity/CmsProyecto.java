package monolithe.cms_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cms_proyectos")
@Getter
@Setter
@NoArgsConstructor
public class CmsProyecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cms_proyecto")
    private Long idCmsProyecto;

    @Column(name = "id_proyecto", nullable = false)
    private Long idProyecto;

    @Column(name = "id_pagina", nullable = false)
    private Long idPagina;

    @Column(name = "nombre_comercial", length = 180)
    private String nombreComercial;

    @Column(name = "resumen_comercial", length = 500)
    private String resumenComercial;

    @Column(name = "descripcion_comercial", columnDefinition = "TEXT")
    private String descripcionComercial;

    @Column(name = "destacado", nullable = false)
    private Boolean destacado = false;

    @Column(name = "orden", nullable = false)
    private Integer orden = 0;

    @Column(name = "texto_cta", length = 120)
    private String textoCta;

    @Column(name = "url_cta", length = 500)
    private String urlCta;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}
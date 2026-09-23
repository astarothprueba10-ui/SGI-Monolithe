package monolithe.cms_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "cms_consultas_web")
@Getter
@Setter
@NoArgsConstructor
public class ConsultaWeb {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_consulta_web")
    private Long idConsultaWeb;

    @Column(name = "id_estado_consulta_web", nullable = false)
    private Integer idEstadoConsultaWeb;

    @Column(name = "id_pagina")
    private Long idPagina;

    @Column(name = "id_proyecto")
    private Long idProyecto;

    @Column(name = "id_prospecto")
    private Long idProspecto;

    @Column(name = "codigo", nullable = false, length = 40, unique = true)
    private String codigo;

    @Column(name = "nombres", nullable = false, length = 150)
    private String nombres;

    @Column(name = "correo", length = 180)
    private String correo;

    @Column(name = "telefono", length = 40)
    private String telefono;

    @Column(name = "asunto", length = 150)
    private String asunto;

    @Column(name = "mensaje", columnDefinition = "TEXT")
    private String mensaje;

    @Column(name = "acepta_privacidad", nullable = false)
    private Boolean aceptaPrivacidad = false;

    @Column(name = "utm_source", length = 100)
    private String utmSource;

    @Column(name = "utm_medium", length = 100)
    private String utmMedium;

    @Column(name = "utm_campaign", length = 150)
    private String utmCampaign;

    @Column(name = "fecha_recepcion", nullable = false)
    private OffsetDateTime fechaRecepcion = OffsetDateTime.now();

    @Column(name = "id_usuario_atencion")
    private Long idUsuarioAtencion;

    @Column(name = "fecha_atencion")
    private OffsetDateTime fechaAtencion;

    @Column(name = "fecha_cierre")
    private OffsetDateTime fechaCierre;

    @Column(name = "motivo_cierre", length = 255)
    private String motivoCierre;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", insertable = false, updatable = false)
    private OffsetDateTime fechaActualizacion;
}

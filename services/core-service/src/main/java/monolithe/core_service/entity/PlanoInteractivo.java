package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inm_planos_interactivos")
@Getter
@Setter
@NoArgsConstructor
public class PlanoInteractivo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_plano_interactivo")
    private Long idPlanoInteractivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_proyecto", nullable = false)
    private Proyecto proyecto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_etapa")
    private Etapa etapa;

    @Column(name = "codigo", nullable = false, length = 40)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "descripcion", length = 500)
    private String descripcion;

    @Column(name = "numero_version", nullable = false)
    private Integer numeroVersion = 1;

    @Column(
            name = "id_etapa_version",
            insertable = false,
            updatable = false
    )
    private Long idEtapaVersion;

    @Column(name = "clave_archivo", nullable = false, length = 500)
    private String claveArchivo;

    @Column(name = "nombre_archivo_original", length = 255)
    private String nombreArchivoOriginal;

    @Column(name = "tipo_mime", length = 120)
    private String tipoMime;

    @Column(name = "hash_archivo", length = 128)
    private String hashArchivo;

    @Column(
            name = "ancho_referencia",
            nullable = false,
            precision = 12,
            scale = 4
    )
    private BigDecimal anchoReferencia;

    @Column(
            name = "alto_referencia",
            nullable = false,
            precision = 12,
            scale = 4
    )
    private BigDecimal altoReferencia;

    @Column(name = "vigente", nullable = false)
    private Boolean vigente = true;

    @Column(name = "fecha_desde", nullable = false)
    private OffsetDateTime fechaDesde;

    @Column(name = "fecha_hasta")
    private OffsetDateTime fechaHasta;

    @Column(name = "observaciones", length = 500)
    private String observaciones;

    @Column(name = "id_usuario_registro")
    private Long idUsuarioRegistro;

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

    @Column(
            name = "id_proyecto_vigente",
            insertable = false,
            updatable = false
    )
    private Long idProyectoVigente;

    @Column(
            name = "clave_etapa_vigente",
            length = 100,
            insertable = false,
            updatable = false
    )
    private String claveEtapaVigente;
}
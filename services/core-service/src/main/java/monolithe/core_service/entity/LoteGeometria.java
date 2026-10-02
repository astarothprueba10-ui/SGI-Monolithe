package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tools.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inm_lotes_geometrias")
@Getter
@Setter
@NoArgsConstructor
public class LoteGeometria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_lote_geometria")
    private Long idLoteGeometria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_proyecto", nullable = false)
    private Proyecto proyecto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_plano_interactivo", nullable = false)
    private PlanoInteractivo planoInteractivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_lote", nullable = false)
    private Lote lote;

    /*
     * Polígono del lote.
     *
     * La BD exige:
     * - JSON tipo array
     * - mínimo 3 elementos
     *
     * Ejemplo esperado:
     * [
     * {"x": 100.0, "y": 120.0},
     * {"x": 180.0, "y": 120.0},
     * {"x": 180.0, "y": 200.0},
     * {"x": 100.0, "y": 200.0}
     * ]
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "puntos", nullable = false, columnDefinition = "jsonb")
    private JsonNode puntos;

    @Column(name = "etiqueta_x", precision = 12, scale = 4)
    private BigDecimal etiquetaX;

    @Column(name = "etiqueta_y", precision = 12, scale = 4)
    private BigDecimal etiquetaY;

    @Column(name = "rotacion_etiqueta", nullable = false, precision = 8, scale = 3)
    private BigDecimal rotacionEtiqueta = BigDecimal.ZERO;

    @Column(name = "orden_capa", nullable = false)
    private Integer ordenCapa = 0;

    @Column(name = "visible", nullable = false)
    private Boolean visible = true;

    @Column(name = "interactivo", nullable = false)
    private Boolean interactivo = true;

    @Column(name = "observaciones", length = 500)
    private String observaciones;

    /*
     * Se mantiene como ID escalar hasta integrar
     * identidad/autorización en el Bloque 10.
     */
    @Column(name = "id_usuario_registro")
    private Long idUsuarioRegistro;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", insertable = false, updatable = false)
    private OffsetDateTime fechaActualizacion;
}
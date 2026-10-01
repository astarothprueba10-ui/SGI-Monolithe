package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(
    name = "inm_lotes",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"codigo"}),
        @UniqueConstraint(columnNames = {"id_manzana", "numero"}),
        @UniqueConstraint(columnNames = {"id_lote", "id_proyecto"})
    }
)
@Getter
@Setter
@NoArgsConstructor
public class Lote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_lote")
    private Long idLote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_manzana", nullable = false)
    private Manzana manzana;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_zona")
    private Zona zona;

    @Column(name = "id_proyecto", nullable = false)
    private Long idProyecto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tipo_lote")
    private TipoLote tipoLote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_estado_lote", nullable = false)
    private EstadoLote estadoLote;

    @Column(name = "codigo", nullable = false, length = 40)
    private String codigo;

    @Column(name = "numero", nullable = false, length = 20)
    private String numero;

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;

    @Column(name = "area_m2", nullable = false, precision = 12, scale = 2)
    private BigDecimal areaM2;

    @Column(name = "frente_m", precision = 10, scale = 2)
    private BigDecimal frenteM;

    @Column(name = "fondo_m", precision = 10, scale = 2)
    private BigDecimal fondoM;

    @Column(name = "lateral_derecho_m", precision = 10, scale = 2)
    private BigDecimal lateralDerechoM;

    @Column(name = "lateral_izquierdo_m", precision = 10, scale = 2)
    private BigDecimal lateralIzquierdoM;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}

package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inm_ajustes_tipo_lote")
@Getter
@Setter
@NoArgsConstructor
public class AjusteTipoLote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ajuste_tipo_lote")
    private Long idAjusteTipoLote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_proyecto", nullable = false)
    private Proyecto proyecto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tipo_lote", nullable = false)
    private TipoLote tipoLote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tipo_ajuste_precio", nullable = false)
    private TipoAjustePrecio tipoAjustePrecio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_moneda")
    private Moneda moneda;

    @Column(name = "valor", nullable = false, precision = 14, scale = 4)
    private BigDecimal valor = BigDecimal.ZERO;

    @Column(name = "fecha_desde", nullable = false)
    private OffsetDateTime fechaDesde;

    @Column(name = "fecha_hasta")
    private OffsetDateTime fechaHasta;

    @Column(name = "observaciones", length = 255)
    private String observaciones;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}

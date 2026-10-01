package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inm_lotes_precios")
@Getter
@Setter
@NoArgsConstructor
public class LotePrecio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_lote_precio")
    private Long idLotePrecio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_lote", nullable = false)
    private Lote lote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_moneda", nullable = false)
    private Moneda moneda;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tarifa")
    private TarifaZonaEtapa tarifa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_ajuste_tipo_lote")
    private AjusteTipoLote ajusteTipoLote;

    @Column(name = "area_m2_aplicada", precision = 12, scale = 2)
    private BigDecimal areaM2Aplicada;

    @Column(name = "valor_tarifa_aplicado", precision = 14, scale = 4)
    private BigDecimal valorTarifaAplicado;

    @Column(name = "precio_base", precision = 14, scale = 2)
    private BigDecimal precioBase;

    @Column(name = "valor_ajuste_aplicado", precision = 14, scale = 4)
    private BigDecimal valorAjusteAplicado;

    @Column(name = "monto_ajuste", nullable = false, precision = 14, scale = 2)
    private BigDecimal montoAjuste = BigDecimal.ZERO;

    @Column(name = "precio", nullable = false, precision = 14, scale = 2)
    private BigDecimal precio;

    @Column(name = "fecha_desde", nullable = false)
    private OffsetDateTime fechaDesde;

    @Column(name = "fecha_hasta")
    private OffsetDateTime fechaHasta;

    @Column(name = "observaciones", length = 255)
    private String observaciones;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}

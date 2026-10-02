package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inm_tarifas_zona_etapa")
@Getter
@Setter
@NoArgsConstructor
public class TarifaZonaEtapa {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        @Column(name = "id_tarifa")
        private Long idTarifa;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "id_proyecto", nullable = false)
        private Proyecto proyecto;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "id_zona", nullable = false)
        private Zona zona;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "id_etapa_comercial", nullable = false)
        private EtapaComercial etapaComercial;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "id_moneda", nullable = false)
        private Moneda moneda;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "id_tipo_tarifa", nullable = false)
        private TipoTarifa tipoTarifa;

        @Column(name = "valor", nullable = false, precision = 14, scale = 4)
        private BigDecimal valor;

        @Column(name = "fecha_desde", nullable = false)
        private OffsetDateTime fechaDesde;

        @Column(name = "fecha_hasta")
        private OffsetDateTime fechaHasta;

        @Column(name = "observaciones", length = 255)
        private String observaciones;

        @Column(name = "activo", nullable = false)
        private Boolean activo = true;
}

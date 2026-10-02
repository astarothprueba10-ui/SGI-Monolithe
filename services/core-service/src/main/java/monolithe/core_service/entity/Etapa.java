package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(
    name = "inm_etapas",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"id_proyecto", "codigo"}),
        @UniqueConstraint(columnNames = {"id_etapa", "id_proyecto"})
    }
)
@Getter
@Setter
@NoArgsConstructor
public class Etapa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_etapa")
    private Long idEtapa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_proyecto", nullable = false)
    private Proyecto proyecto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_estado_etapa", nullable = false)
    private EstadoEtapa estadoEtapa;

    @Column(name = "codigo", nullable = false, length = 30)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "numero_orden", nullable = false)
    private Integer numeroOrden = 1;

    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin_estimada")
    private LocalDate fechaFinEstimada;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}

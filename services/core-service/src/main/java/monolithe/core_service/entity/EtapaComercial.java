package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(
        name = "inm_etapas_comerciales",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"id_etapa_comercial", "id_proyecto"}),
                @UniqueConstraint(columnNames = {"id_proyecto", "codigo"})
        }
)
@Getter
@Setter
@NoArgsConstructor
public class EtapaComercial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_etapa_comercial")
    private Long idEtapaComercial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_proyecto", nullable = false)
    private Proyecto proyecto;

    @Column(name = "codigo", nullable = false, length = 30)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "descripcion", length = 255)
    private String descripcion;

    @Column(name = "numero_orden", nullable = false)
    private Integer numeroOrden = 1;

    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}

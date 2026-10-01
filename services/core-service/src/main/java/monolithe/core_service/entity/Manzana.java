package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "inm_manzanas",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"id_etapa", "codigo"}),
        @UniqueConstraint(columnNames = {"id_manzana", "id_proyecto"})
    }
)
@Getter
@Setter
@NoArgsConstructor
public class Manzana {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_manzana")
    private Long idManzana;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
        @JoinColumn(
            name = "id_etapa",
            referencedColumnName = "id_etapa",
            nullable = false
        ),
        @JoinColumn(
            name = "id_proyecto",
            referencedColumnName = "id_proyecto",
            nullable = false
        )
    })
    private Etapa etapa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_estado_manzana", nullable = false)
    private EstadoManzana estadoManzana;

    @Column(name = "codigo", nullable = false, length = 30)
    private String codigo;

    @Column(name = "nombre", length = 100)
    private String nombre;

    @Column(name = "descripcion", length = 255)
    private String descripcion;

    @Column(name = "numero_orden", nullable = false)
    private Integer numeroOrden = 1;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}

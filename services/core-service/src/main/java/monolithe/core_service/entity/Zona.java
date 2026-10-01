package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "inm_zonas",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"id_proyecto", "codigo"}),
        @UniqueConstraint(columnNames = {"id_zona", "id_proyecto"})
    }
)
@Getter
@Setter
@NoArgsConstructor
public class Zona {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_zona")
    private Long idZona;

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

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}

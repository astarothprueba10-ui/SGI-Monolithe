package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "inm_lotes_historial_estado")
@Getter
@Setter
@NoArgsConstructor
public class LoteHistorialEstado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_historial")
    private Long idHistorial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_lote", nullable = false)
    private Lote lote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_estado_anterior")
    private EstadoLote estadoAnterior;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_estado_nuevo", nullable = false)
    private EstadoLote estadoNuevo;

    @Column(name = "motivo", length = 255)
    private String motivo;

    @Column(
            name = "fecha_cambio",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private OffsetDateTime fechaCambio;

    @Column(name = "id_usuario")
    private Long idUsuario;
}
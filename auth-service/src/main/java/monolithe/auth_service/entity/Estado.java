package monolithe.auth_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "estado")
public class Estado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "id_estado")
    private Integer idEstado;

    @Column(name = "entidad", nullable = false, length = 40)
    private String entidad;

    @Column(name = "codigo", nullable = false, length = 30)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 80)
    private String nombre;

    @Column(name = "descripcion", length = 255)
    private String descripcion;

    @Column(name = "permite_acceso")
    private Boolean permiteAcceso;

    @Column(name = "activo", nullable = false)
    private Boolean activo;

    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "orden", nullable = false)
    private Integer orden;

    @Column(name = "fecha_creacion", nullable = false, insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false, insertable = false, updatable = false)
    private LocalDateTime fechaActualizacion;
}

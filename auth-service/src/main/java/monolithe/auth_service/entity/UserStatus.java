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
@Table(name = "cfg_estados_usuario")
public class UserStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "id_estado_usuario")
    private Integer idEstadoUsuario;

    @Column(name = "codigo", nullable = false, unique = true, length = 30)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 80)
    private String nombre;

    @Column(name = "descripcion", length = 255)
    private String descripcion;

    @Column(name = "permite_acceso", nullable = false)
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
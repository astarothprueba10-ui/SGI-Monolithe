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
@Table(name = "seg_roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "id_rol")
    private Integer idRol;

    @Column(name = "codigo", nullable = false, unique = true, length = 40)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "descripcion", length = 255)
    private String descripcion;

    @Column(name = "es_sistema", nullable = false)
    private Boolean esSistema;

    @Column(name = "activo", nullable = false)
    private Boolean activo;

    @Column(name = "fecha_creacion", nullable = false, insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false, insertable = false, updatable = false)
    private LocalDateTime fechaActualizacion;
}
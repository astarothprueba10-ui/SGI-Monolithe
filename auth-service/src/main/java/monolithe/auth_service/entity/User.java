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
@Table(name = "seg_usuarios")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long idUsuario;

    @Column(name = "id_persona", nullable = false, unique = true)
    private Long idPersona;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_estado_usuario", nullable = false)
    private UserStatus estadoUsuario;

    @Column(name = "usuario_login", nullable = false, unique = true, length = 120)
    private String usuarioLogin;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "requiere_cambio_password", nullable = false)
    private Boolean requiereCambioPassword;

    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "intentos_fallidos", nullable = false)
    private Integer intentosFallidos;

    @Column(name = "bloqueado_hasta")
    private LocalDateTime bloqueadoHasta;

    @Column(name = "ultimo_acceso")
    private LocalDateTime ultimoAcceso;

    @Column(name = "password_actualizado_en")
    private LocalDateTime passwordActualizadoEn;

    @Column(name = "fecha_creacion", nullable = false, insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false, insertable = false, updatable = false)
    private LocalDateTime fechaActualizacion;
}
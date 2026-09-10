package monolithe.auth_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "seg_sesiones")
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_sesion")
    private Long idSesion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private User usuario;

    @Column(
        name = "refresh_token_hash",
        nullable = false,
        unique = true,
        length = 64
    )
    private String refreshTokenHash;

    @Column(name = "ip_origen", length = 45)
    private String ipOrigen;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(
        name = "fecha_inicio",
        nullable = false,
        insertable = false,
        updatable = false
    )
    private LocalDateTime fechaInicio;

    @Column(name = "ultima_actividad")
    private LocalDateTime ultimaActividad;

    @Column(name = "fecha_expiracion", nullable = false)
    private LocalDateTime fechaExpiracion;

    @Column(name = "fecha_revocacion")
    private LocalDateTime fechaRevocacion;

    @Column(name = "motivo_revocacion", length = 255)
    private String motivoRevocacion;
}
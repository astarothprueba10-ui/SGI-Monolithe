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
@Table(name = "seg_roles_permisos")
public class RolePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rol_permiso")
    private Long idRolPermiso;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_rol", nullable = false)
    private Role rol;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_permiso", nullable = false)
    private Permission permiso;

    @Column(
        name = "fecha_asignacion",
        nullable = false,
        insertable = false,
        updatable = false
    )
    private LocalDateTime fechaAsignacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asignado_por")
    private User asignadoPor;

    @Column(name = "activo", nullable = false)
    private Boolean activo;
}
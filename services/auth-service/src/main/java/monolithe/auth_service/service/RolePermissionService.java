package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.repository.RolePermissionProcedureRepository;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RolePermissionService {

    private final RolePermissionProcedureRepository repository;

    @Transactional
    public SecurityOperationResult crearRol(
            Long actor,
            String nombre) {

        String nombreTrimmed = nombre != null ? nombre.trim() : null;
        return repository.crearRol(actor, nombreTrimmed);
    }

    /** Actualiza datos descriptivos del rol sin modificar sus permisos. */
    @Transactional
    public SecurityOperationResult actualizarPermisos(
            Long actor,
            String codigoRol,
            List<String> permisos) {

        return repository.actualizarPermisos(
                actor,
                codigoRol,
                permisos == null ? List.of() : permisos
        );
    }

    /** Solicita la desactivación del rol mediante el procedimiento autorizado. */
    @Transactional
    public SecurityOperationResult actualizarRol(
            Long actor,
            String codigoRol,
            String nombre,
            String descripcion) {
        return repository.actualizarRol(
                actor,
                codigoRol,
                nombre == null ? null : nombre.trim(),
                descripcion == null || descripcion.isBlank() ? null : descripcion.trim());
    }

    /** Solicita la reactivación del rol mediante el procedimiento autorizado. */
    @Transactional
    public SecurityOperationResult desactivarRol(Long actor, String codigoRol) {
        return repository.desactivarRol(actor, codigoRol);
    }

    @Transactional
    public SecurityOperationResult reactivarRol(Long actor, String codigoRol) {
        return repository.reactivarRol(actor, codigoRol);
    }
}

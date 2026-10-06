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
}
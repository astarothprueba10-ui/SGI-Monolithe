package monolithe.auth_service.dto;

import java.util.List;

public record UpdateRolePermissionsRequest(
        List<String> permisos
) {}
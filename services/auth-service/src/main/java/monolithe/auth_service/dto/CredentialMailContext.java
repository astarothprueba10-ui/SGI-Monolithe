package monolithe.auth_service.dto;

public record CredentialMailContext(
        String tipoDocumento,
        String numeroDocumento,
        boolean portalAdministrativo,
        boolean portalCliente) {
}

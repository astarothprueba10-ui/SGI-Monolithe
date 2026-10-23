package monolithe.auth_service.service;

import java.util.List;
import java.util.Locale;
import java.util.Set;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.CredentialMailContext;
import monolithe.auth_service.repository.PersonDocumentRepository;
import monolithe.auth_service.repository.UserRepository;
import monolithe.auth_service.repository.UserRoleRepository;
import monolithe.auth_service.repository.projection.OfficialPersonDocument;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CredentialMailContextService {

    private static final String ROLE_CLIENTE = "CLIENTE";
    private static final Set<String> TIPOS_DOCUMENTO_PERMITIDOS = Set.of("DNI", "CE", "PASAPORTE", "RUC");

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PersonDocumentRepository personDocumentRepository;

    /**
     * Resuelve documento principal y roles activos directamente desde los datos del
     * servidor.
     */
    public CredentialMailContext obtener(Long idUsuario) {
        Long idPersona = userRepository.findIdPersonaByIdUsuario(idUsuario)
                .orElseThrow(() -> new IllegalStateException("No se encontró la persona de la cuenta activada."));
        OfficialPersonDocument documento = personDocumentRepository
                .buscarDocumentoPrincipalActivo(idPersona)
                .orElseThrow(() -> new IllegalStateException("No se encontró un documento principal activo."));
        String tipoDocumento = documento.tipoDocumento().toUpperCase(Locale.ROOT);
        validarTipoDocumento(tipoDocumento);
        List<String> roles = obtenerRolesEfectivos(idUsuario);
        boolean portalAdministrativo = roles.stream().anyMatch(rol -> !ROLE_CLIENTE.equals(rol));
        boolean portalCliente = roles.contains(ROLE_CLIENTE);
        validarAccesoPortal(portalAdministrativo, portalCliente);
        return new CredentialMailContext(tipoDocumento, documento.numeroDocumento(), portalAdministrativo,
                portalCliente);
    }

    private List<String> obtenerRolesEfectivos(Long idUsuario) {
        return userRoleRepository
                .findByUsuarioIdUsuarioAndActivoTrue(idUsuario)
                .stream()
                .filter(asignacion -> Boolean.TRUE.equals(asignacion.getActivo()))
                .map(asignacion -> asignacion.getRol())
                .filter(rol -> rol != null && Boolean.TRUE.equals(rol.getActivo()))
                .map(rol -> rol.getCodigo())
                .filter(codigo -> codigo != null && !codigo.isBlank())
                .map(codigo -> codigo.trim().toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    private void validarTipoDocumento(String tipoDocumento) {
        if (!TIPOS_DOCUMENTO_PERMITIDOS.contains(tipoDocumento)) {
            throw new IllegalStateException("El tipo de documento principal no está habilitado para credenciales.");
        }
    }

    private void validarAccesoPortal(boolean portalAdministrativo, boolean portalCliente) {
        if (!portalAdministrativo && !portalCliente) {
            throw new IllegalStateException("La cuenta activada no tiene roles activos para acceder a un portal.");
        }
    }
}

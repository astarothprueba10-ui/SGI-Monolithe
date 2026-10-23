package monolithe.auth_service.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import monolithe.auth_service.entity.Role;
import monolithe.auth_service.entity.UserRole;
import monolithe.auth_service.repository.PersonDocumentRepository;
import monolithe.auth_service.repository.UserRepository;
import monolithe.auth_service.repository.UserRoleRepository;
import monolithe.auth_service.repository.projection.OfficialPersonDocument;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CredentialMailContextServiceTest {

    private static final Long USER_ID = 12L;
    private static final Long PERSON_ID = 45L;

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserRoleRepository userRoleRepository;
    @Mock
    private PersonDocumentRepository personDocumentRepository;
    @InjectMocks
    private CredentialMailContextService service;

    @BeforeEach
    void configurarPersona() {
        when(userRepository.findIdPersonaByIdUsuario(USER_ID)).thenReturn(Optional.of(PERSON_ID));
        when(personDocumentRepository.buscarDocumentoPrincipalActivo(PERSON_ID))
                .thenReturn(Optional.of(documento("DNI")));
    }

    @Test
    void utilizaLosCuatroTiposDocumentalesOficialesSinInferirlosPorLongitud() {
        when(userRoleRepository.findByUsuarioIdUsuarioAndActivoTrue(USER_ID))
                .thenReturn(List.of(asignacion("RRHH", true, true)));
        for (String tipo : List.of("DNI", "CE", "PASAPORTE", "RUC")) {
            when(personDocumentRepository.buscarDocumentoPrincipalActivo(PERSON_ID))
                    .thenReturn(Optional.of(documento(tipo)));
            assertEquals(tipo, service.obtener(USER_ID).tipoDocumento());
        }
    }

    @Test
    void soloIncluyePortalAdministrativoParaRolesInternosActivos() {
        when(userRoleRepository.findByUsuarioIdUsuarioAndActivoTrue(USER_ID))
                .thenReturn(List.of(asignacion("GERENCIA", true, true)));

        var contexto = service.obtener(USER_ID);

        assertTrue(contexto.portalAdministrativo());
        assertFalse(contexto.portalCliente());
    }

    @Test
    void rolClienteExclusivoSoloIncluyePortalCliente() {
        when(userRoleRepository.findByUsuarioIdUsuarioAndActivoTrue(USER_ID))
                .thenReturn(List.of(asignacion("CLIENTE", true, true)));

        var contexto = service.obtener(USER_ID);

        assertFalse(contexto.portalAdministrativo());
        assertTrue(contexto.portalCliente());
    }

    @Test
    void vinculacionDobleIncluyeAmbosPortales() {
        when(userRoleRepository.findByUsuarioIdUsuarioAndActivoTrue(USER_ID))
                .thenReturn(List.of(asignacion("CLIENTE", true, true), asignacion("RRHH", true, true)));

        var contexto = service.obtener(USER_ID);

        assertTrue(contexto.portalAdministrativo());
        assertTrue(contexto.portalCliente());
    }

    @Test
    void ignoraRolesInactivosYRechazaCuentasSinRolEfectivo() {
        when(userRoleRepository.findByUsuarioIdUsuarioAndActivoTrue(USER_ID))
                .thenReturn(List.of(asignacion("ADMINISTRADOR", false, true)));

        assertThrows(IllegalStateException.class, () -> service.obtener(USER_ID));
    }

    private OfficialPersonDocument documento(String tipo) {
        return new OfficialPersonDocument(tipo, "16748595");
    }

    private UserRole asignacion(String codigo, boolean rolActivo, boolean asignacionActiva) {
        Role role = new Role();
        role.setCodigo(codigo);
        role.setActivo(rolActivo);
        UserRole assignment = new UserRole();
        assignment.setActivo(asignacionActiva);
        assignment.setRol(role);
        return assignment;
    }
}

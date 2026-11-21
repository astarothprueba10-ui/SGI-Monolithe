package monolithe.auth_service.service;

import monolithe.auth_service.dto.MfaResetRequest;
import monolithe.auth_service.repository.MfaInvitationRepository;
import monolithe.auth_service.repository.UserEmailRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MfaAdminResetServiceTest {
    private final JdbcClient jdbc = mock(JdbcClient.class);
    private final UserEmailRepository permissions = mock(UserEmailRepository.class);
    private final MfaInvitationRepository contacts = mock(MfaInvitationRepository.class);
    private final EmailService email = mock(EmailService.class);
    private final MfaAdminResetService service = new MfaAdminResetService(jdbc, permissions, contacts, email);

    @Test
    void prohíbeRestablecerPropioFactorInclusoConConfirmacion() {
        var req = new MfaResetRequest("12345678", "Extravio de dispositivo", true);
        var error = assertThrows(ResponseStatusException.class, () -> service.restablecer(10, 10, req));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(jdbc, permissions, contacts, email);
    }

    @Test
    void exigeValidacionExternaDelTitularYMotivo() {
        var req = new MfaResetRequest("12345678", "sin motivo", false);
        var error = assertThrows(ResponseStatusException.class, () -> service.restablecer(1, 2, req));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(jdbc, permissions, contacts, email);
    }

    @Test
    void rechazaCuentasFueraDelAlcanceAdministrativo() {
        var req = new MfaResetRequest("12345678", "Dispositivo perdido y verificado", true);
        when(permissions.puedeEditar(1L, 2L)).thenReturn(false);
        var error = assertThrows(ResponseStatusException.class, () -> service.restablecer(1, 2, req));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verifyNoInteractions(jdbc, contacts, email);
    }
}

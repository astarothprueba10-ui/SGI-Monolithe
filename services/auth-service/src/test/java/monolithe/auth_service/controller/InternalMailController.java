
package monolithe.auth_service.controller;

import monolithe.auth_service.service.EmailService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InternalMailControllerTest {

    private final EmailService emailService =
            mock(EmailService.class);

    private final InternalMailController controller =
            new InternalMailController(emailService);

    @Test
    void debeRechazarSolicitudSinClave() {
        ReflectionTestUtils.setField(
                controller, "internalMailKey", "clave-test");

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> controller.enviarConfirmacionCambioCorreo(
                        null, null));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verifyNoInteractions(emailService);
    }

    @Test
    void debeRechazarClaveIncorrecta() {
        ReflectionTestUtils.setField(
                controller, "internalMailKey", "clave-test");

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> controller.enviarConfirmacionCambioCorreo(
                        "clave-incorrecta", null));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verifyNoInteractions(emailService);
    }

    @Test
    void debeRechazarServicioSinConfiguracion() {
        ReflectionTestUtils.setField(
                controller, "internalMailKey", "");

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> controller.enviarConfirmacionCambioCorreo(
                        "cualquier-clave", null));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verifyNoInteractions(emailService);
    }
}

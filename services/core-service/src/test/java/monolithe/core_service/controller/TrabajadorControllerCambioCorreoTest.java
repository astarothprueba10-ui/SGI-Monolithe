package monolithe.core_service.controller;

import monolithe.core_service.dto.ConfirmacionCambioCorreoResponse;
import monolithe.core_service.dto.ConfirmarCambioCorreoRequest;
import monolithe.core_service.dto.SolicitudCambioCorreoRequest;
import monolithe.core_service.dto.SolicitudCambioCorreoResponse;
import monolithe.core_service.service.TrabajadorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class TrabajadorControllerCambioCorreoTest {

    private TrabajadorService trabajadorService;
    private TrabajadorController controller;

    @BeforeEach
    void setUp() {
        trabajadorService = mock(TrabajadorService.class);
        controller = new TrabajadorController(trabajadorService);
    }

    @Test
    void debeSolicitarCambioCorreoDesdeController() {
        Jwt jwt = new Jwt(
                "token-mock",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("alg", "none"),
                Map.of("sub", "10", "authorities", "hr.edit"));

        SolicitudCambioCorreoResponse respuestaEsperada = new SolicitudCambioCorreoResponse("Enlace enviado", 30L);
        when(trabajadorService.solicitarCambioCorreo(
                10L, 5L, "nuevo@monolithe.pe", "Correccion del correo laboral"))
                .thenReturn(respuestaEsperada);

        SolicitudCambioCorreoRequest request = new SolicitudCambioCorreoRequest(
                "nuevo@monolithe.pe",
                "Correccion del correo laboral");
        ResponseEntity<SolicitudCambioCorreoResponse> response = controller.solicitarCambioCorreo(5L, request, jwt);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Enlace enviado", response.getBody().mensaje());
        verify(trabajadorService).solicitarCambioCorreo(
                10L, 5L, "nuevo@monolithe.pe", "Correccion del correo laboral");
    }

    @Test
    void debeConfirmarCambioCorreoDesdeController() {
        ConfirmacionCambioCorreoResponse respuestaEsperada = new ConfirmacionCambioCorreoResponse("OK",
                "nuevo@monolithe.pe");
        when(trabajadorService.confirmarCambioCorreo("token123"))
                .thenReturn(respuestaEsperada);

        ConfirmarCambioCorreoRequest request = new ConfirmarCambioCorreoRequest("token123");
        ResponseEntity<ConfirmacionCambioCorreoResponse> response = controller.confirmarCambioCorreo(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("nuevo@monolithe.pe", response.getBody().correo());
        verify(trabajadorService).confirmarCambioCorreo("token123");
    }
}

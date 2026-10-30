package monolithe.core_service.service;

import monolithe.core_service.client.EmailNotificationClient;
import monolithe.core_service.dto.ConfirmacionCambioCorreoResponse;
import monolithe.core_service.dto.SolicitudCambioCorreoResponse;
import monolithe.core_service.repository.TrabajadorProcedureRepository;
import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TrabajadorServiceCambioCorreoTest {

        private TrabajadorProcedureRepository repository;
        private EmailNotificationClient emailNotificationClient;
        private TrabajadorService service;
        private JsonMapper jsonMapper;

        @BeforeEach
        void setUp() {
                repository = mock(TrabajadorProcedureRepository.class);
                emailNotificationClient = mock(EmailNotificationClient.class);
                jsonMapper = new JsonMapper();
                service = new TrabajadorService(repository, jsonMapper, emailNotificationClient);
        }

        @Test
        void debeSolicitarCambioCorreoExitosamente() {
                String motivo = "Correccion del correo laboral";

                ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                                jsonMapper.createObjectNode(), "OK", null);

                when(repository.solicitarCambioCorreo(
                                1L, 10L, "nuevo@monolithe.pe", motivo))
                                .thenReturn(respuesta);

                SolicitudCambioCorreoResponse response = service.solicitarCambioCorreo(
                                1L, 10L, "nuevo@monolithe.pe", motivo);

                assertNotNull(response);
                assertEquals(
                                "Solicitud pendiente de aprobacion por Gerencia o Administracion.",
                                response.mensaje());
                assertEquals(0, response.minutosExpiracion());

                verify(repository).solicitarCambioCorreo(
                                1L, 10L, "nuevo@monolithe.pe", motivo);

                verifyNoInteractions(emailNotificationClient);
        }

        @Test
        void debeRechazarCambioPorCorreoDuplicado() {
                String motivo = "Solicitud de cambio de correo laboral";

                ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                                null, "CORREO_DUPLICADO", "El correo ya está en uso");

                when(repository.solicitarCambioCorreo(
                                1L, 10L, "duplicado@monolithe.pe", motivo))
                                .thenReturn(respuesta);

                ResponseStatusException ex = assertThrows(
                                ResponseStatusException.class,
                                () -> service.solicitarCambioCorreo(
                                                1L, 10L, "duplicado@monolithe.pe", motivo));

                assertEquals(409, ex.getStatusCode().value());

                verify(repository).solicitarCambioCorreo(
                                1L, 10L, "duplicado@monolithe.pe", motivo);

                verifyNoInteractions(emailNotificationClient);
        }

        @Test
        void debeRechazarCambioCuandoUsuarioSinPermisos() {
                ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                                null, "DENEGADO", "Sin autorizacion para modificar trabajadores");
                when(repository.solicitarCambioCorreo(anyLong(), anyLong(), anyString(), anyString(), any()))
                                .thenReturn(respuesta);

                ResponseStatusException ex = assertThrows(
                                ResponseStatusException.class,
                                () -> service.solicitarCambioCorreo(99L, 10L, "nuevo@monolithe.pe", "jwt"));

                assertEquals(403, ex.getStatusCode().value());
                verifyNoInteractions(emailNotificationClient);
        }

        @Test
        void debeLanzarBadGatewayCuandoFallaEnvioSmtp() {
                ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                                jsonMapper.createObjectNode(), "OK", null);
                when(repository.solicitarCambioCorreo(anyLong(), anyLong(), anyString(), anyString(), any()))
                                .thenReturn(respuesta);
                doThrow(new RuntimeException("Falla conexion SMTP"))
                                .when(emailNotificationClient)
                                .enviarConfirmacionCambioCorreo(anyString(), anyString(), anyLong(), anyString());

                ResponseStatusException ex = assertThrows(
                                ResponseStatusException.class,
                                () -> service.solicitarCambioCorreo(1L, 10L, "nuevo@monolithe.pe", "jwt"));

                assertEquals(502, ex.getStatusCode().value());
        }

        @Test
        void debeConservarCorreoAnteriorAntesDeConfirmar() {
                ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                                jsonMapper.createObjectNode(), "OK", null);
                when(repository.solicitarCambioCorreo(anyLong(), anyLong(), anyString(), anyString(), any()))
                                .thenReturn(respuesta);

                service.solicitarCambioCorreo(1L, 10L, "nuevo@monolithe.pe", "jwt");

                ArgumentCaptor<String> hashCaptor = ArgumentCaptor.forClass(String.class);
                verify(repository).solicitarCambioCorreo(
                                eq(1L), eq(10L), eq("nuevo@monolithe.pe"), hashCaptor.capture(), any());
                assertTrue(hashCaptor.getValue().matches("[a-f0-9]{64}"));
                verify(repository, never()).actualizarTrabajador(anyLong(), anyLong(), anyString());
                verify(repository, never()).confirmarCambioCorreo(anyString());
        }

        @Test
        void debeConfirmarCambioCorreoExitosamente() {
                JsonNode resultado = jsonMapper.createObjectNode().put("correo", "confirmado@monolithe.pe");
                ResultadoProcedimiento respuesta = new ResultadoProcedimiento(resultado, "OK", null);
                when(repository.confirmarCambioCorreo(anyString()))
                                .thenReturn(respuesta);

                ConfirmacionCambioCorreoResponse response = service.confirmarCambioCorreo("tokenValido123");

                assertNotNull(response);
                assertEquals("confirmado@monolithe.pe", response.correo());
                verify(repository).confirmarCambioCorreo(anyString());
        }

        @Test
        void debeRechazarConfirmacionConTokenVencido() {
                ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                                null, "TOKEN_EXPIRADO", "El enlace de confirmacion ha vencido");
                when(repository.confirmarCambioCorreo(anyString()))
                                .thenReturn(respuesta);

                ResponseStatusException ex = assertThrows(
                                ResponseStatusException.class,
                                () -> service.confirmarCambioCorreo("tokenExpirado123"));

                assertEquals(400, ex.getStatusCode().value());
                assertTrue(ex.getReason().contains("vencido") || ex.getReason().contains("expirado"));
        }

        @Test
        void debeRechazarConfirmacionConTokenReutilizado() {
                ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                                null, "TOKEN_UTILIZADO", "El enlace ya fue utilizado previamente");
                when(repository.confirmarCambioCorreo(anyString()))
                                .thenReturn(respuesta);

                ResponseStatusException ex = assertThrows(
                                ResponseStatusException.class,
                                () -> service.confirmarCambioCorreo("tokenUsado123"));

                assertEquals(400, ex.getStatusCode().value());
        }

        @Test
        void debeRechazarConfirmacionConTokenNuloOVacio() {
                ResponseStatusException ex = assertThrows(
                                ResponseStatusException.class,
                                () -> service.confirmarCambioCorreo("   "));

                assertEquals(400, ex.getStatusCode().value());
                verifyNoInteractions(repository);
        }
}

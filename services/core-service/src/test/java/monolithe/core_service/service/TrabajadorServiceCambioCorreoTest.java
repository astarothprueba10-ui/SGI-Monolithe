package monolithe.core_service.service;

import monolithe.core_service.client.EmailNotificationClient;
import monolithe.core_service.dto.ConfirmacionCambioCorreoResponse;
import monolithe.core_service.dto.SolicitudCambioCorreoResponse;
import monolithe.core_service.repository.TrabajadorProcedureRepository;
import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import monolithe.core_service.dto.ResolverCorreccionRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.OffsetDateTime;

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

                String motivo = "Solicitud de cambio de correo laboral";

                ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                                null, "DENEGADO",
                                "Sin autorizacion para modificar trabajadores");

                when(repository.solicitarCambioCorreo(
                                eq(99L),
                                eq(10L),
                                eq("nuevo@monolithe.pe"),
                                eq(motivo)))
                                .thenReturn(respuesta);

                ResponseStatusException ex = assertThrows(
                                ResponseStatusException.class,
                                () -> service.solicitarCambioCorreo(
                                                99L, 10L, "nuevo@monolithe.pe", motivo));

                assertEquals(403, ex.getStatusCode().value());

                verifyNoInteractions(emailNotificationClient);
        }

        @Test
        void debeLanzarBadGatewayCuandoFallaEnvioSmtp() {

                var resultado = jsonMapper.createObjectNode()
                                .put("tipoDato", "CONTACTO")
                                .put("correoPropuesto", "nuevo@monolithe.pe");

                ResultadoProcedimiento respuesta = new ResultadoProcedimiento(resultado, "OK", null);

                when(repository.resolverCorreccionIdentidad(
                                anyLong(),
                                anyLong(),
                                eq("APROBAR"),
                                isNull(),
                                anyString(),
                                any(OffsetDateTime.class)))
                                .thenReturn(respuesta);

                doThrow(new RuntimeException("Falla conexion SMTP"))
                                .when(emailNotificationClient)
                                .enviarConfirmacionCambioCorreo(
                                                eq("nuevo@monolithe.pe"),
                                                anyString(),
                                                anyLong(),
                                                eq("jwt-test"));

                ResolverCorreccionRequest request = new ResolverCorreccionRequest("APROBAR", null);

                ResponseStatusException ex = assertThrows(
                                ResponseStatusException.class,
                                () -> service.resolverCorreccion(
                                                1L, 3L, request, "jwt-test"));

                assertEquals(502, ex.getStatusCode().value());
        }

        @Test
        void debeConservarCorreoAnteriorAntesDeConfirmar() {

                String motivo = "Correccion del correo laboral";

                ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                                jsonMapper.createObjectNode(), "OK", null);

                when(repository.solicitarCambioCorreo(
                                1L, 10L, "nuevo@monolithe.pe", motivo))
                                .thenReturn(respuesta);

                service.solicitarCambioCorreo(
                                1L, 10L, "nuevo@monolithe.pe", motivo);

                verify(repository).solicitarCambioCorreo(
                                1L, 10L, "nuevo@monolithe.pe", motivo);

                verify(repository, never())
                                .actualizarTrabajador(
                                                anyLong(), anyLong(), anyString());

                verify(repository, never())
                                .confirmarCambioCorreo(anyString());

                verifyNoInteractions(emailNotificationClient);
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

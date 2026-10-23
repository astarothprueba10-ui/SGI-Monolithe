package monolithe.core_service.service;

import monolithe.core_service.dto.ActualizarTrabajadorRequest;
import monolithe.core_service.dto.ActualizarTrabajadorRequest.InformacionLaboral;
import monolithe.core_service.dto.ActualizarTrabajadorRequest.InformacionPersonal;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.repository.TrabajadorProcedureRepository;
import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TrabajadorServiceActualizarTest {

    private TrabajadorProcedureRepository repository;
    private TrabajadorService service;
    private JsonMapper jsonMapper;

    @BeforeEach
    void setUp() {
        repository = mock(TrabajadorProcedureRepository.class);
        jsonMapper = new JsonMapper();
        service = new TrabajadorService(repository, jsonMapper);
    }

    @Test
    void debeActualizarTrabajadorExitosamente() {
        JsonNode resultado = jsonMapper.createObjectNode();
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(resultado, "OK", null);
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        ActualizarTrabajadorRequest solicitud = crearSolicitudValida(null);
        JsonNode retorno = service.actualizarTrabajador(1L, 10L, solicitud);

        assertNotNull(retorno);
        verify(repository).actualizarTrabajador(eq(1L), eq(10L), anyString());
    }

    @Test
    void debePreservarElPayloadParcialEnLaRutaJsonDeActualizacion() throws Exception {
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(new ResultadoProcedimiento(jsonMapper.createObjectNode(), "OK", null));
        JsonNode solicitud = jsonMapper.readTree("""
                {"informacionPersonal":{"telefono":"987654321"}}
                """);

        service.actualizarTrabajador(1L, 10L, solicitud);

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(repository).actualizarTrabajador(eq(1L), eq(10L), captor.capture());
        JsonNode enviado = jsonMapper.readTree(captor.getValue());
        assertEquals("987654321", enviado.get("informacionPersonal").get("telefono").asString());
        assertFalse(enviado.get("informacionPersonal").has("correoElectronico"));
        assertFalse(enviado.get("informacionPersonal").has("numeroDocumento"));
    }

    @Test
    void debeRechazarDocumentoEnPayloadJsonParcial() throws Exception {
        JsonNode solicitud = jsonMapper.readTree("""
                {"informacionPersonal":{"numeroDocumento":"00123456"}}
                """);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, solicitud));

        assertEquals(400, ex.getStatusCode().value());
        verify(repository, never()).actualizarTrabajador(anyLong(), anyLong(), anyString());
    }

    @Test
    void debeRechazarClavesDeDocumentoAunqueLleguenConValorNull() throws Exception {
        JsonNode solicitud = jsonMapper.readTree("""
                {"informacionPersonal":{"numeroDocumento":null}}
                """);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, solicitud));

        assertEquals(400, ex.getStatusCode().value());
        verify(repository, never()).actualizarTrabajador(anyLong(), anyLong(), anyString());
    }

    @Test
    void debeRechazarCambioDirectoDeCorreoEnPayloadJsonParcial() throws Exception {
        JsonNode solicitud = jsonMapper.readTree("""
                {"informacionPersonal":{"correoElectronico":"nuevo@example.test"}}
                """);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, solicitud));

        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("confirmación por enlace"));
        verify(repository, never()).actualizarTrabajador(anyLong(), anyLong(), anyString());
    }

    @Test
    void debeRechazarEstadoEnVerificacionAunqueElIdLlegaComoTexto() throws Exception {
        JsonNode solicitud = jsonMapper.readTree("""
                {"informacionLaboral":{"idEstadoTrabajador":"5"}}
                """);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, solicitud));

        assertEquals(400, ex.getStatusCode().value());
        verify(repository, never()).actualizarTrabajador(anyLong(), anyLong(), anyString());
    }

    @Test
    void debeRechazarSolicitudSinInformacionLaboral() {
        ActualizarTrabajadorRequest solicitud = new ActualizarTrabajadorRequest(null);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, solicitud));

        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void debeLanzarForbiddenCuandoDenegado() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(null, "DENEGADO", "Sin permiso");
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, crearSolicitudValida(null)));

        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void debeLanzarForbiddenCuandoUsuarioProtegido() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "USUARIO_PROTEGIDO", "No se puede modificar este usuario");
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, crearSolicitudValida(null)));

        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void debeLanzarNotFoundCuandoNoEncontrado() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "NO_ENCONTRADO", "Trabajador no existe");
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        assertThrows(
                RecursoNoEncontradoException.class,
                () -> service.actualizarTrabajador(1L, 10L, crearSolicitudValida(null)));
    }

    @Test
    void debeLanzarBadRequestCuandoEstadoInvalido() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "ESTADO_INVALIDO", "Estado no permitido");
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, crearSolicitudValida(3)));

        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void debeLanzarBadRequestCuandoVerificacionDocumentalPendiente() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "VERIFICACION_DOCUMENTAL_PENDIENTE", "Tiene verificacion en curso");
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, crearSolicitudValida(1)));

        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void debeLanzarBadRequestCuandoFechasInvalidas() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "FECHAS_INVALIDAS", "Fechas inconsistentes");
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, crearSolicitudValida(null)));

        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void debeLanzarIllegalStateCuandoEstadoDesconocido() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "ESTADO_RARO_DESCONOCIDO", "Sin mapeo");
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        assertThrows(
                IllegalStateException.class,
                () -> service.actualizarTrabajador(1L, 10L, crearSolicitudValida(null)));
    }

    @Test
    void debeRechazarAsignacionManualDeEstadoEnVerificacion() {
        ActualizarTrabajadorRequest solicitud = crearSolicitudValida(5);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, solicitud));

        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("EN_VERIFICACION"));
        verifyNoInteractions(repository);
    }

    @Test
    void debeSerializarTransicionACesadoConFechasYMotivo() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                jsonMapper.createObjectNode(), "OK", null);
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        LocalDate ingreso = LocalDate.of(2025, 3, 1);
        LocalDate cese = LocalDate.of(2026, 10, 31);
        InformacionLaboral laboral = new InformacionLaboral(
                2L, 3L, 1, ingreso, 4, cese, "Renuncia voluntaria", "Entrega completada");

        service.actualizarTrabajador(1L, 10L, new ActualizarTrabajadorRequest(laboral));

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(repository).actualizarTrabajador(eq(1L), eq(10L), captor.capture());
        JsonNode json = jsonMapper.readTree(captor.getValue()).get("informacionLaboral");

        assertEquals("2025-03-01", json.get("fechaIngreso").asString());
        assertEquals("2026-10-31", json.get("fechaCese").asString());
        assertEquals(4, json.get("idEstadoTrabajador").asInt());
        assertEquals("Renuncia voluntaria", json.get("motivoCambioEstado").asString());
        assertEquals("Entrega completada", json.get("observaciones").asString());
    }

    @Test
    void debeSerializarTransicionAActivoConFechaCeseOpcional() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                jsonMapper.createObjectNode(), "OK", null);
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        LocalDate ingreso = LocalDate.of(2025, 3, 1);
        InformacionLaboral laboral = new InformacionLaboral(
                2L, null, 1, ingreso, 1, null, "Reincorporacion", null);

        service.actualizarTrabajador(1L, 10L, new ActualizarTrabajadorRequest(laboral));

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(repository).actualizarTrabajador(eq(1L), eq(10L), captor.capture());
        JsonNode json = jsonMapper.readTree(captor.getValue()).get("informacionLaboral");

        assertEquals("2025-03-01", json.get("fechaIngreso").asString());
        assertEquals(1, json.get("idEstadoTrabajador").asInt());
        assertEquals("Reincorporacion", json.get("motivoCambioEstado").asString());
        assertTrue(json.get("fechaCese").isNull());
    }

    @Test
    void debeActualizarNombresYApellidos() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                jsonMapper.createObjectNode(), "OK", null);
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        InformacionPersonal personal = new InformacionPersonal(
                100L, null, null, "Carlos", "Perez", "Gomez",
                null, null, null, null, null, null, null, null);

        service.actualizarTrabajador(1L, 10L, new ActualizarTrabajadorRequest(personal, null));

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(repository).actualizarTrabajador(eq(1L), eq(10L), captor.capture());
        JsonNode json = jsonMapper.readTree(captor.getValue()).get("informacionPersonal");

        assertEquals("Carlos", json.get("nombres").asString());
        assertEquals("Perez", json.get("apellidoPaterno").asString());
        assertEquals("Gomez", json.get("apellidoMaterno").asString());
    }

    @Test
    void debeActualizarFechaNacimiento() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                jsonMapper.createObjectNode(), "OK", null);
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        LocalDate nacimiento = LocalDate.of(1992, 5, 14);
        InformacionPersonal personal = new InformacionPersonal(
                100L, null, null, null, null, null,
                nacimiento, null, null, null, null, null, null, null);

        service.actualizarTrabajador(1L, 10L, new ActualizarTrabajadorRequest(personal, null));

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(repository).actualizarTrabajador(eq(1L), eq(10L), captor.capture());
        JsonNode json = jsonMapper.readTree(captor.getValue()).get("informacionPersonal");

        assertEquals("1992-05-14", json.get("fechaNacimiento").asString());
    }

    @Test
    void debeActualizarTelefono() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                jsonMapper.createObjectNode(), "OK", null);
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        InformacionPersonal personal = new InformacionPersonal(
                100L, null, null, null, null, null,
                null, null, "999888777", null, null, null, null, null);

        service.actualizarTrabajador(1L, 10L, new ActualizarTrabajadorRequest(personal, null));

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(repository).actualizarTrabajador(eq(1L), eq(10L), captor.capture());
        JsonNode json = jsonMapper.readTree(captor.getValue()).get("informacionPersonal");

        assertEquals("999888777", json.get("telefono").asString());
    }

    @Test
    void debeActualizarDomicilio() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                jsonMapper.createObjectNode(), "OK", null);
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        InformacionPersonal personal = new InformacionPersonal(
                100L, null, null, null, null, null,
                null, null, null, "Av. Larco 456", "Of. 301", "Lima", "Lima", "Miraflores");

        service.actualizarTrabajador(1L, 10L, new ActualizarTrabajadorRequest(personal, null));

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(repository).actualizarTrabajador(eq(1L), eq(10L), captor.capture());
        JsonNode json = jsonMapper.readTree(captor.getValue()).get("informacionPersonal");

        assertEquals("Av. Larco 456", json.get("direccion").asString());
        assertEquals("Of. 301", json.get("referencia").asString());
        assertEquals("Miraflores", json.get("distrito").asString());
    }

    @Test
    void debeActualizarSimultaneamenteInformacionPersonalYLaboral() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                jsonMapper.createObjectNode(), "OK", null);
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        InformacionPersonal personal = new InformacionPersonal(
                100L, null, null, "Ana", "Ruiz", null,
                null, null, "987654321", null, null, null, null, null);
        InformacionLaboral laboral = new InformacionLaboral(
                1L, 2L, 1, LocalDate.of(2025, 2, 1), 1, null, null, "Todo ok");

        service.actualizarTrabajador(1L, 10L, new ActualizarTrabajadorRequest(personal, laboral));

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(repository).actualizarTrabajador(eq(1L), eq(10L), captor.capture());
        JsonNode json = jsonMapper.readTree(captor.getValue());

        assertEquals("Ana", json.get("informacionPersonal").get("nombres").asString());
        assertEquals(1, json.get("informacionLaboral").get("idEstadoTrabajador").asInt());
    }

    @Test
    void debeRechazarCambioDirectoDeCorreo() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "EMAIL_VERIFICACION_REQUERIDA", "El correo requiere verificacion");
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, crearSolicitudValida(null)));

        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("verificacion"));
    }

    @Test
    void debeRechazarCambioDirectoDeDocumento() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "CORRECCION_DOCUMENTAL_REQUERIDA", "El documento requiere aprobacion");
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, crearSolicitudValida(null)));

        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("aprobacion"));
    }

    @Test
    void debeLanzarConflictCuandoPersonaNoCoincide() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "PERSONA_NO_COINCIDE", "No se permite sustituir la persona");
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, crearSolicitudValida(null)));

        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("persona"));
    }

    @Test
    void debePermitirEdicionExclusivamenteLaboral() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                jsonMapper.createObjectNode(), "OK", null);
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        ActualizarTrabajadorRequest solicitud = crearSolicitudValida(1);
        JsonNode resultado = service.actualizarTrabajador(1L, 10L, solicitud);

        assertNotNull(resultado);
        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(repository).actualizarTrabajador(eq(1L), eq(10L), captor.capture());
        JsonNode json = jsonMapper.readTree(captor.getValue());

        assertTrue(json.has("informacionLaboral"));
        assertNull(solicitud.informacionPersonal());
    }

    @Test
    void debeLanzarBadRequestCuandoDomicilioInvalido() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "DOMICILIO_INVALIDO", "Domicilio invalido");
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, crearSolicitudValida(null)));

        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void debeLanzarConflictCuandoConflictoUnicidad() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "CONFLICTO_UNICIDAD", "Dato unico duplicado");
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, crearSolicitudValida(null)));

        assertEquals(409, ex.getStatusCode().value());
    }

    @Test
    void debeRechazarActualizarDocumentoDirectamente() {
        InformacionPersonal personal = new InformacionPersonal(
                5L, 1, "87654321", null, null, null, null, null, null, null, null, null, null, null);
        ActualizarTrabajadorRequest solicitud = new ActualizarTrabajadorRequest(
                personal, null);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.actualizarTrabajador(1L, 10L, solicitud));

        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("documento de identidad"));
        verifyNoInteractions(repository);
    }

    private ActualizarTrabajadorRequest crearSolicitudValida(Integer idEstado) {
        InformacionLaboral laboral = new InformacionLaboral(
                1L, null, 1, LocalDate.of(2025, 1, 10), idEstado, null, null, "obs");
        return new ActualizarTrabajadorRequest(laboral);
    }
}

package monolithe.core_service.service;

import monolithe.core_service.dto.CesarTrabajadorRequest;
import monolithe.core_service.dto.ProgramarSuspensionRequest;
import monolithe.core_service.dto.ResolverReincorporacionRequest;
import monolithe.core_service.dto.SolicitarReincorporacionRequest;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.repository.TrabajadorProcedureRepository;
import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TrabajadorServiceFase2ATest {

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
    void debeProgramarSuspensionExitosamente() {
        OffsetDateTime inicio = OffsetDateTime.now(ZoneOffset.UTC).plusDays(1);
        OffsetDateTime fin = inicio.plusWeeks(1);
        ProgramarSuspensionRequest request = new ProgramarSuspensionRequest(inicio, fin, "Licencia sin goce de haber");

        ObjectNode data = jsonMapper.createObjectNode().put("idSuspension", 100L);
        ResultadoProcedimiento ok = new ResultadoProcedimiento(data, "OK", "Suspension programada");

        when(repository.programarSuspension(eq(1L), eq(10L), eq(inicio), eq(fin), eq("Licencia sin goce de haber")))
                .thenReturn(ok);

        JsonNode res = service.programarSuspension(1L, 10L, request);
        assertNotNull(res);
        assertEquals(100L, res.get("idSuspension").asLong());
    }

    @Test
    void debeRechazarSuspensionConFechaFinAnteriorAInicio() {
        OffsetDateTime inicio = OffsetDateTime.now(ZoneOffset.UTC).plusDays(5);
        OffsetDateTime fin = inicio.minusDays(1);
        ProgramarSuspensionRequest request = new ProgramarSuspensionRequest(inicio, fin, "Motivo con mas de diez caracteres");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.programarSuspension(1L, 10L, request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(repository, never()).programarSuspension(anyLong(), anyLong(), any(), any(), any());
    }

    @Test
    void debeMapearConflictosEnSuspensionYReincorporacion() {
        OffsetDateTime inicio = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime fin = inicio.plusDays(3);
        ProgramarSuspensionRequest req = new ProgramarSuspensionRequest(inicio, fin, "Suspension concurrente");

        when(repository.programarSuspension(anyLong(), anyLong(), any(), any(), any()))
                .thenReturn(new ResultadoProcedimiento(null, "SUSPENSION_PENDIENTE", "Existe suspension pendiente"));
        ResponseStatusException ex1 = assertThrows(ResponseStatusException.class,
                () -> service.programarSuspension(1L, 10L, req));
        assertEquals(HttpStatus.CONFLICT, ex1.getStatusCode());

        when(repository.programarSuspension(anyLong(), anyLong(), any(), any(), any()))
                .thenReturn(new ResultadoProcedimiento(null, "ESTADO_INVALIDO", "Estado no permite suspension"));
        ResponseStatusException ex2 = assertThrows(ResponseStatusException.class,
                () -> service.programarSuspension(1L, 10L, req));
        assertEquals(HttpStatus.CONFLICT, ex2.getStatusCode());
    }

    @Test
    void debeCesarTrabajadorExitosamente() {
        LocalDate fecha = LocalDate.now();
        CesarTrabajadorRequest request = new CesarTrabajadorRequest(fecha, "Renuncia voluntaria formalizada");

        ObjectNode data = jsonMapper.createObjectNode().put("idTrabajador", 10L);
        ResultadoProcedimiento ok = new ResultadoProcedimiento(data, "OK", "Trabajador cesado");
        when(repository.cesarTrabajador(1L, 10L, fecha, "Renuncia voluntaria formalizada")).thenReturn(ok);

        JsonNode res = service.cesarTrabajador(1L, 10L, request);
        assertNotNull(res);
        assertEquals(10L, res.get("idTrabajador").asLong());
    }

    @Test
    void debeLanzarRecursoNoEncontradoEnNoEncontrada() {
        LocalDate fecha = LocalDate.now();
        CesarTrabajadorRequest request = new CesarTrabajadorRequest(fecha, "Renuncia voluntaria formalizada");

        ResultadoProcedimiento noEnc = new ResultadoProcedimiento(null, "NO_ENCONTRADA", "Solicitud no encontrada");
        when(repository.cesarTrabajador(anyLong(), anyLong(), any(), any())).thenReturn(noEnc);

        assertThrows(RecursoNoEncontradoException.class,
                () -> service.cesarTrabajador(1L, 999L, request));
    }

    @Test
    void debeSolicitarReincorporacionExitosamente() {
        LocalDate fecha = LocalDate.now().plusDays(7);
        SolicitarReincorporacionRequest request = new SolicitarReincorporacionRequest(fecha, "Reingreso por nuevo contrato laboral");

        ObjectNode data = jsonMapper.createObjectNode().put("idSolicitud", 200L);
        ResultadoProcedimiento ok = new ResultadoProcedimiento(data, "OK", "Solicitud creada");
        when(repository.solicitarReincorporacion(1L, 10L, fecha, "Reingreso por nuevo contrato laboral")).thenReturn(ok);

        JsonNode res = service.solicitarReincorporacion(1L, 10L, request);
        assertNotNull(res);
        assertEquals(200L, res.get("idSolicitud").asLong());
    }

    @Test
    void debeMapearConflictosEnSolicitudReincorporacion() {
        LocalDate fecha = LocalDate.now().plusDays(7);
        SolicitarReincorporacionRequest request = new SolicitarReincorporacionRequest(fecha, "Reingreso por nuevo contrato laboral");

        when(repository.solicitarReincorporacion(anyLong(), anyLong(), any(), any()))
                .thenReturn(new ResultadoProcedimiento(null, "SOLICITUD_PENDIENTE", "Ya existe solicitud pendiente"));
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.solicitarReincorporacion(1L, 10L, request));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void debeResolverReincorporacionAprobada() {
        ResolverReincorporacionRequest request = new ResolverReincorporacionRequest("APROBAR", "Aprobado por gerencia", null);

        ObjectNode data = jsonMapper.createObjectNode().put("idSolicitud", 200L).put("estado", "APROBADO");
        ResultadoProcedimiento ok = new ResultadoProcedimiento(data, "OK", "Reincorporacion aprobada");
        when(repository.resolverReincorporacion(1L, 200L, "APROBAR", "Aprobado por gerencia")).thenReturn(ok);

        JsonNode res = service.resolverReincorporacion(1L, 200L, request);
        assertNotNull(res);
        assertEquals("APROBADO", res.get("estado").asString());
    }

    @Test
    void debeExigirMotivoDeDiezCaracteresAlRechazarReincorporacion() {
        ResolverReincorporacionRequest corto = new ResolverReincorporacionRequest("RECHAZAR", "Corto", null);
        ResponseStatusException ex1 = assertThrows(ResponseStatusException.class,
                () -> service.resolverReincorporacion(1L, 200L, corto));
        assertEquals(HttpStatus.BAD_REQUEST, ex1.getStatusCode());

        ResolverReincorporacionRequest vacio = new ResolverReincorporacionRequest("RECHAZAR", null, "");
        ResponseStatusException ex2 = assertThrows(ResponseStatusException.class,
                () -> service.resolverReincorporacion(1L, 200L, vacio));
        assertEquals(HttpStatus.BAD_REQUEST, ex2.getStatusCode());
    }

    @Test
    void debeMapearProhibidoEnAutoaprobacionDenegada() {
        ResolverReincorporacionRequest request = new ResolverReincorporacionRequest("APROBAR", null, "Aprobacion directa de la reincorporacion");

        ResultadoProcedimiento denegado = new ResultadoProcedimiento(null, "AUTOAPROBACION_DENEGADA", "No autoaprobar");
        when(repository.resolverReincorporacion(anyLong(), anyLong(), any(), any())).thenReturn(denegado);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.resolverReincorporacion(1L, 200L, request));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void debeMapearErrorControladoEnSinAdministrador() {
        ResolverReincorporacionRequest request = new ResolverReincorporacionRequest("APROBAR", null, "Aprobacion directa de la reincorporacion");

        ResultadoProcedimiento sinAdmin = new ResultadoProcedimiento(null, "SIN_ADMINISTRADOR", "No hay administrador activo");
        when(repository.resolverReincorporacion(anyLong(), anyLong(), any(), any())).thenReturn(sinAdmin);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.resolverReincorporacion(1L, 200L, request));
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, ex.getStatusCode());
    }

    @Test
    void debeListarReincorporacionesConFiltros() {
        ObjectNode data = jsonMapper.createObjectNode();
        data.putArray("solicitudes");
        data.put("totalMostrado", 0);
        ResultadoProcedimiento ok = new ResultadoProcedimiento(data, "OK", "Listado exitoso");

        when(repository.listarReincorporaciones(1L, "PENDIENTE", 15L)).thenReturn(ok);

        JsonNode res = service.listarReincorporaciones(1L, "pendiente", 15L);

        assertNotNull(res);
        assertEquals(0, res.get("totalMostrado").asInt());
        verify(repository).listarReincorporaciones(1L, "PENDIENTE", 15L);
    }

    @Test
    void debeListarReincorporacionesSinFiltros() {
        ObjectNode data = jsonMapper.createObjectNode();
        data.putArray("solicitudes");
        data.put("totalMostrado", 0);
        ResultadoProcedimiento ok = new ResultadoProcedimiento(data, "OK", "Listado exitoso");

        when(repository.listarReincorporaciones(1L, null, null)).thenReturn(ok);

        JsonNode res = service.listarReincorporaciones(1L, null, null);

        assertNotNull(res);
        verify(repository).listarReincorporaciones(1L, null, null);
    }

    @Test
    void debeRechazarListarConEstadoInvalido() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.listarReincorporaciones(1L, "INEXISTENTE", null));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void debeRechazarListarConIdTrabajadorInvalido() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.listarReincorporaciones(1L, "PENDIENTE", -5L));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void debeMapearDenegadoAlListarReincorporaciones() {
        ResultadoProcedimiento denegado = new ResultadoProcedimiento(null, "DENEGADO", "Sin permisos");
        when(repository.listarReincorporaciones(1L, null, null)).thenReturn(denegado);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.listarReincorporaciones(1L, null, null));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void debeMapearDatosInvalidosAlListarReincorporaciones() {
        ResultadoProcedimiento datosInvalidos = new ResultadoProcedimiento(null, "DATOS_INVALIDOS", "Parametros invalidos");
        when(repository.listarReincorporaciones(1L, null, null)).thenReturn(datosInvalidos);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.listarReincorporaciones(1L, null, null));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void debeListarHistorialLaboralExitosamente() {
        ObjectNode data = jsonMapper.createObjectNode();
        data.putArray("movimientos");
        data.put("total", 1);
        ResultadoProcedimiento ok = new ResultadoProcedimiento(data, "OK", "Historial consultado");

        LocalDate desde = LocalDate.of(2026, 1, 1);
        LocalDate hasta = LocalDate.of(2026, 1, 31);
        when(repository.listarHistorialLaboral(1L, 10L, "INGRESO", desde, hasta)).thenReturn(ok);

        JsonNode res = service.listarHistorialLaboral(1L, 10L, " ingreso ", desde, hasta);
        assertNotNull(res);
        assertEquals(1, res.get("total").asInt());
        verify(repository).listarHistorialLaboral(1L, 10L, "INGRESO", desde, hasta);
    }

    @Test
    void debeRechazarHistorialConRangoFechasInvertido() {
        LocalDate desde = LocalDate.of(2026, 2, 1);
        LocalDate hasta = LocalDate.of(2026, 1, 1);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.listarHistorialLaboral(1L, 10L, null, desde, hasta));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void debeRechazarHistorialConIdTrabajadorInvalido() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.listarHistorialLaboral(1L, -1L, null, null, null));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void debeMapearDenegadoAlListarHistorialLaboral() {
        ResultadoProcedimiento denegado = new ResultadoProcedimiento(null, "DENEGADO", "Sin permisos");
        when(repository.listarHistorialLaboral(1L, null, null, null, null)).thenReturn(denegado);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.listarHistorialLaboral(1L, null, null, null, null));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void debeObtenerMetricasTrabajadoresExitosamente() {
        ObjectNode data = jsonMapper.createObjectNode();
        data.put("nuevosTrabajadores", 8);
        ResultadoProcedimiento ok = new ResultadoProcedimiento(data, "OK", "Metricas consultadas");

        when(repository.obtenerMetricasTrabajadores(1L)).thenReturn(ok);

        JsonNode res = service.obtenerMetricasTrabajadores(1L);
        assertNotNull(res);
        assertEquals(8, res.get("nuevosTrabajadores").asInt());
        verify(repository).obtenerMetricasTrabajadores(1L);
    }

    @Test
    void debeMapearDenegadoAlObtenerMetricasTrabajadores() {
        ResultadoProcedimiento denegado = new ResultadoProcedimiento(null, "DENEGADO", "Acceso denegado");
        when(repository.obtenerMetricasTrabajadores(1L)).thenReturn(denegado);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.obtenerMetricasTrabajadores(1L));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }
}

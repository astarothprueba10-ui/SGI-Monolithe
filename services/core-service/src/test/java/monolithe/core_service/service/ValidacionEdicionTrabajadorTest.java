package monolithe.core_service.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import monolithe.core_service.dto.ActualizarTrabajadorRequest;
import monolithe.core_service.repository.TrabajadorProcedureRepository;
import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class ValidacionEdicionTrabajadorTest {
    private final JsonMapper mapper = new JsonMapper();

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "987654321", "900000000", "999999999", " 987654321 "})
    void admiteTelefonoOpcionalONueveDigitosConPrefijoNueve(String telefono) {
        ObjectNode solicitud = telefono(telefono);
        JsonNode validado = ValidacionEdicionTrabajador.validar(solicitud, null);
        JsonNode valor = validado.at("/informacionPersonal/telefono");
        if (telefono.isBlank()) assertTrue(valor.isNull());
        else assertEquals(telefono.trim(), valor.asString());
        assertEquals(telefono, solicitud.at("/informacionPersonal/telefono").asString());
    }

    @ParameterizedTest
    @ValueSource(strings = {"9", "98765432", "9876543210", "887654321", "012345678",
            "+51987654321", "987 654321", "98765a321", "９８７６５４３２１"})
    void rechazaTelefonoInvalido(String valor) {
        assertTrue(rechaza(telefono(valor), null).getReason().contains("9 dígitos y comenzar con 9"));
    }

    @Test
    void rechazaTelefonoNumericoBooleanoOCompuesto() {
        ObjectNode solicitud = telefono("");
        ObjectNode personal = (ObjectNode) solicitud.path("informacionPersonal");
        personal.put("telefono", 987654321);
        rechaza(solicitud, null);
        personal.put("telefono", true);
        rechaza(solicitud, null);
        personal.putObject("telefono");
        rechaza(solicitud, null);
        personal.putNull("telefono");
        assertDoesNotThrow(() -> ValidacionEdicionTrabajador.validar(solicitud, null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026-10-27", "2026-10-28", "2028-02-29"})
    void admiteElDiaDeRegistroYFechasPosteriores(String valor) {
        assertDoesNotThrow(() -> ValidacionEdicionTrabajador.validar(fecha(valor), actual("2026-10-27")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026-10-26", "2025-01-01"})
    void rechazaIngresoAnteriorAlRegistro(String valor) {
        assertTrue(rechaza(fecha(valor), actual("2026-10-27")).getReason().contains("día de registro"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "2026-02-30", "0000-01-01", "2026-13-01", "27/10/2026"})
    void rechazaFechasIrreales(String valor) {
        assertTrue(rechaza(fecha(valor), actual("2026-10-27")).getReason().contains("válida"));
    }

    @Test
    void conservaFechaHistoricaSinModificar() {
        assertDoesNotThrow(() -> ValidacionEdicionTrabajador.validar(fecha("2026-10-23"), actual("2026-10-27")));
        assertDoesNotThrow(() -> ValidacionEdicionTrabajador.validar(telefono("987654321"), null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026-10-27", "2026-10-27T05:00:00Z", "2026-10-27T00:00:00-05:00", "2026-10-27 09:00:00.123456"})
    void fechaDeRegistroUsaDiaPeruano(String registro) {
        assertDoesNotThrow(() -> ValidacionEdicionTrabajador.validar(fecha("2026-10-27"), actual(registro)));
        rechaza(fecha("2026-10-26"), actual(registro));
    }

    @Test
    void antesDeMedianochePeruanaAunEsElDiaAnterior() {
        assertDoesNotThrow(() -> ValidacionEdicionTrabajador.validar(
                fecha("2026-10-26"), actual("2026-10-27T04:59:59Z")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "texto", "2026-02-30", "2026-10-27xxxx"})
    void exigeRegistroRealParaCambiarFecha(String registro) {
        assertTrue(rechaza(fecha("2026-10-28"), actual(registro)).getReason().contains("registro"));
    }

    @Test
    void impideGuardarTelefonoInvalidoSinConsultarElExpediente() {
        TrabajadorProcedureRepository repository = mock(TrabajadorProcedureRepository.class);
        TrabajadorService service = new TrabajadorService(repository, mapper);
        assertThrows(ResponseStatusException.class, () -> service.actualizarTrabajador(1L, 2L, telefono("887654321")));
        verifyNoInteractions(repository);
    }

    @Test
    void noConfiaEnUnaFechaDeRegistroEnviadaPorElCliente() {
        TrabajadorProcedureRepository repository = repositorioConRegistro();
        ObjectNode solicitud = fecha("2026-10-26");
        solicitud.put("fechaCreacion", "2000-01-01");
        assertThrows(ResponseStatusException.class,
                () -> new TrabajadorService(repository, mapper).actualizarTrabajador(1L, 2L, solicitud));
        verify(repository).obtenerTrabajador(1L, 2L);
        verify(repository, never()).actualizarTrabajador(anyLong(), anyLong(), anyString());
    }

    @Test
    void laRutaTipadaAplicaElMismoLimiteDeRegistro() {
        TrabajadorProcedureRepository repository = repositorioConRegistro();
        var laboral = new ActualizarTrabajadorRequest.InformacionLaboral(
                null, null, null, LocalDate.of(2026, 10, 26), null, null, null, null);
        var solicitud = new ActualizarTrabajadorRequest(laboral);
        assertThrows(ResponseStatusException.class,
                () -> new TrabajadorService(repository, mapper).actualizarTrabajador(1L, 2L, solicitud));
        verify(repository, never()).actualizarTrabajador(anyLong(), anyLong(), anyString());
    }

    @Test
    void propagaElRechazoDeAutorizacionDelProcedimientoSinOmitirlo() {
        TrabajadorProcedureRepository repository = mock(TrabajadorProcedureRepository.class);
        when(repository.actualizarTrabajador(anyLong(), anyLong(), anyString()))
                .thenReturn(new ResultadoProcedimiento(null, "DENEGADO", "Acceso denegado"));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> new TrabajadorService(repository, mapper).actualizarTrabajador(1L, 2L, telefono("987654321")));
        assertEquals(403, error.getStatusCode().value());
    }

    private TrabajadorProcedureRepository repositorioConRegistro() {
        TrabajadorProcedureRepository repository = mock(TrabajadorProcedureRepository.class);
        when(repository.obtenerTrabajador(1L, 2L))
                .thenReturn(new ResultadoProcedimiento(actual("2026-10-27"), "OK", null));
        return repository;
    }

    private ResponseStatusException rechaza(JsonNode solicitud, JsonNode actual) {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> ValidacionEdicionTrabajador.validar(solicitud, actual));
        assertEquals(400, error.getStatusCode().value());
        return error;
    }

    private ObjectNode telefono(String valor) {
        ObjectNode solicitud = mapper.createObjectNode();
        solicitud.putObject("informacionPersonal").put("telefono", valor);
        return solicitud;
    }

    private ObjectNode fecha(String valor) {
        ObjectNode solicitud = mapper.createObjectNode();
        solicitud.putObject("informacionLaboral").put("fechaIngreso", valor);
        return solicitud;
    }

    private ObjectNode actual(String registro) {
        ObjectNode actual = mapper.createObjectNode().put("fechaCreacion", registro);
        actual.putObject("informacionLaboral").put("fechaIngreso", "2026-10-23");
        return actual;
    }
}

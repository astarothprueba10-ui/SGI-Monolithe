package monolithe.core_service.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.ZoneId;
import monolithe.core_service.repository.TrabajadorProcedureRepository;
import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class ValidacionAltaTrabajadorTest {
    private final JsonMapper mapper = new JsonMapper();
    private final LocalDate hoy = LocalDate.of(2026, 10, 25);

    @ParameterizedTest
    @ValueSource(strings = {"2026-10-25", "2026-10-26", "2028-02-29"})
    void aceptaHoyYFechasFuturas(String fecha) {
        assertDoesNotThrow(() -> validar(datos(fecha, 11, "persona@empresa.com.pe")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026-10-24", "2026-02-30", "2026-13-01", "", "0000-01-01", "25/10/2026"})
    void rechazaPasadoYFechasInvalidas(String fecha) {
        rechaza(datos(fecha, 11, "persona@empresa.com.pe"));
    }

    @ParameterizedTest
    @ValueSource(ints = {12, 13, 14, 15})
    void rechazaRucPasaporteYOtrosDocumentos(int tipo) {
        ResponseStatusException error = rechaza(datos("2026-10-25", tipo, "persona@example.com"));
        assertTrue(error.getReason().contains("DNI o carné de extranjería"));
    }

    @ParameterizedTest
    @ValueSource(ints = {11, 16})
    void admiteDniYCarneDeExtranjeria(int tipo) {
        assertDoesNotThrow(() -> validar(datos("2026-10-25", tipo, "persona@example.com")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"DNI", "dni", "01", "1", "CE", "ce", "04", "4"})
    void reconoceCodigosOficialesSinDependerDeIds(String codigo) {
        JsonNode catalogos = catalogos();
        ((ObjectNode) catalogos.at("/tiposDocumento/0")).put("codigo", codigo);
        assertDoesNotThrow(() -> ValidacionAltaTrabajador.validar(
                datos("2026-10-25", 11, "persona@example.com"), catalogos, hoy));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "987654321", "900000000", "999999999", " 987654321 "})
    void admiteTelefonoOpcionalONueveDigitosConPrefijoNueve(String telefono) {
        ObjectNode datos = datos("2026-10-25", 11, "persona@example.com");
        ((ObjectNode) datos.path("informacionPersonal")).put("telefono", telefono);
        assertDoesNotThrow(() -> validar(datos));
    }

    @ParameterizedTest
    @ValueSource(strings = {"9", "98765432", "9876543210", "887654321", "012345678",
            "+51987654321", "987 654321", "98765a321", "９８７６５４３２１"})
    void rechazaTelefonoInvalido(String telefono) {
        ObjectNode datos = datos("2026-10-25", 11, "persona@example.com");
        ((ObjectNode) datos.path("informacionPersonal")).put("telefono", telefono);
        assertTrue(rechaza(datos).getReason().contains("9 dígitos y comenzar con 9"));
    }

    @Test
    void rechazaTelefonoNoTextualYAdmiteNulo() {
        ObjectNode datos = datos("2026-10-25", 11, "persona@example.com");
        ObjectNode personal = (ObjectNode) datos.path("informacionPersonal");
        personal.put("telefono", 987654321);
        rechaza(datos);
        personal.put("telefono", true);
        rechaza(datos);
        personal.putNull("telefono");
        assertDoesNotThrow(() -> validar(datos));
    }

    @Test
    void normalizaTelefonoSinModificarLaSolicitudOriginal() {
        ObjectNode datos = datos("2026-10-25", 11, "persona@example.com");
        ((ObjectNode) datos.path("informacionPersonal")).put("telefono", " 987654321 ");
        assertEquals("987654321", validar(datos).at("/informacionPersonal/telefono").asString());
        assertEquals(" 987654321 ", datos.at("/informacionPersonal/telefono").asString());
    }

    @Test
    void normalizaDominioSinModificarLaSolicitudOriginal() {
        JsonNode original = datos("2026-10-25", 11, " Ana.Ventas@EMPRESA.COM.PE ");
        JsonNode validado = validar(original);
        assertEquals("Ana.Ventas@empresa.com.pe", validado.at("/informacionPersonal/correoElectronico").asString());
        assertEquals(" Ana.Ventas@EMPRESA.COM.PE ", original.at("/informacionPersonal/correoElectronico").asString());
    }

    @Test
    void rechazaTipoAjenoAlCatalogoYSeccionesAusentes() {
        rechaza(datos("2026-10-25", 999, "ana@example.com"));
        assertThrows(ResponseStatusException.class, () -> validar(mapper.createObjectNode()));
        assertThrows(ResponseStatusException.class, () -> validar(null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ana@gmail.com", "ana@outlook.com", "ana@hotmail.com", "ana@yahoo.es",
            "ana@icloud.com", "ana@utp.edu.pe", "ana+ventas@empresa.com.pe", "ana@area.mi-empresa.technology",
            "o'connor@example.com", "ana@españa.es", "ana@proton.me", "ana@empresa.onmicrosoft.com",
            "ana@empresa.co.uk", "ana@empresa.solutions"})
    void admiteDominiosDiversos(String correo) {
        assertDoesNotThrow(() -> validar(datos("2026-10-25", 11, correo)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ana", "ana@@empresa.pe", ".ana@empresa.pe", "ana..v@empresa.pe",
            "ana@-empresa.pe", "ana@empresa..pe", "ana@empresa.pe.", "a@empresa.pe,b@otra.pe",
            "ana@empresa.pe\r\nBcc: otra@empresa.pe"})
    void rechazaCorreoMalFormado(String correo) {
        rechaza(datos("2026-10-25", 11, correo));
    }

    @Test
    void elServicioNoPersisteUnAltaConFechaAnterior() {
        TrabajadorProcedureRepository repository = mock(TrabajadorProcedureRepository.class);
        when(repository.obtenerCatalogos(1L)).thenReturn(new ResultadoProcedimiento(catalogos(), "OK", "OK"));
        TrabajadorService service = new TrabajadorService(repository, mapper);
        String ayer = LocalDate.now(ZoneId.of("America/Lima")).minusDays(1).toString();
        assertThrows(ResponseStatusException.class, () -> service.registrarTrabajador(1L, datos(ayer, 11, "a@example.pe")));
        verify(repository, never()).registrarTrabajador(anyLong(), anyString());
    }

    @Test
    void elServicioNoPersistePasaporteNiTelefonoInvalido() {
        TrabajadorProcedureRepository repository = mock(TrabajadorProcedureRepository.class);
        when(repository.obtenerCatalogos(1L)).thenReturn(new ResultadoProcedimiento(catalogos(), "OK", "OK"));
        TrabajadorService service = new TrabajadorService(repository, mapper);
        String hoy = LocalDate.now(ZoneId.of("America/Lima")).toString();
        ObjectNode pasaporte = datos(hoy, 15, "a@example.pe");
        assertThrows(ResponseStatusException.class, () -> service.registrarTrabajador(1L, pasaporte));
        ObjectNode telefono = datos(hoy, 11, "a@example.pe");
        ((ObjectNode) telefono.path("informacionPersonal")).put("telefono", "887654321");
        assertThrows(ResponseStatusException.class, () -> service.registrarTrabajador(1L, telefono));
        verify(repository, never()).registrarTrabajador(anyLong(), anyString());
    }

    @Test
    void elServicioPersisteSoloDespuesDeValidarYNormalizar() {
        TrabajadorProcedureRepository repository = mock(TrabajadorProcedureRepository.class);
        when(repository.obtenerCatalogos(1L)).thenReturn(new ResultadoProcedimiento(catalogos(), "OK", "OK"));
        when(repository.registrarTrabajador(eq(1L), anyString()))
                .thenReturn(new ResultadoProcedimiento(mapper.createObjectNode(), "OK", "OK"));
        String fecha = LocalDate.now(ZoneId.of("America/Lima")).toString();
        new TrabajadorService(repository, mapper).registrarTrabajador(1L, datos(fecha, 11, "Ana@EMPRESA.PE"));
        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(repository).registrarTrabajador(eq(1L), payload.capture());
        assertTrue(payload.getValue().contains("Ana@empresa.pe"));
    }

    private JsonNode validar(JsonNode datos) {
        return ValidacionAltaTrabajador.validar(datos, catalogos(), hoy);
    }

    private ResponseStatusException rechaza(JsonNode datos) {
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> validar(datos));
        assertEquals(400, error.getStatusCode().value());
        return error;
    }

    private ObjectNode datos(String fecha, int tipo, String correo) {
        ObjectNode datos = mapper.createObjectNode();
        datos.putObject("informacionPersonal").put("idTipoDocumento", tipo).put("correoElectronico", correo);
        datos.putObject("informacionLaboral").put("fechaIngreso", fecha);
        return datos;
    }

    private JsonNode catalogos() {
        ObjectNode catalogos = mapper.createObjectNode();
        var tipos = catalogos.putArray("tiposDocumento");
        tipos.addObject().put("idTipoDocumento", 11).put("codigo", "DNI").put("nombre", "DNI");
        tipos.addObject().put("idTipoDocumento", 12).put("codigo", "RUC").put("nombre", "RUC");
        tipos.addObject().put("idTipoDocumento", 13).put("codigo", "06").put("nombre", "RUC");
        tipos.addObject().put("idTipoDocumento", 14).put("codigo", "OTRO").put("nombre", "Registro Único de Contribuyentes");
        tipos.addObject().put("idTipoDocumento", 15).put("codigo", "PASAPORTE").put("nombre", "Pasaporte");
        tipos.addObject().put("idTipoDocumento", 16).put("codigo", "CE").put("nombre", "Carné de extranjería");
        return catalogos;
    }
}

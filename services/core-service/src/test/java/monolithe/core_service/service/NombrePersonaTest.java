package monolithe.core_service.service;

import monolithe.core_service.validation.NombrePersona;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import tools.jackson.databind.json.JsonMapper;
import java.time.LocalDate;
import java.time.ZoneId;
import monolithe.core_service.repository.TrabajadorProcedureRepository;
import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NombrePersonaTest {
    @ParameterizedTest
    @CsvSource({"CESAR JAVIER ROJAS,Cesar Javier Rojas", "cEsAr jAvIeR,Cesar Javier", "MARÍA ÁNGELA ÑAUPA,María Ángela Ñaupa",
            "JUAN-CARLOS,Juan-Carlos", "de la cruz,De La Cruz", "  LUCÍA   MARÍA  ,Lucía María"})
    void conservaLetrasYTildesConInicialesUniformes(String input, String expected) {
        assertEquals(expected, NombrePersona.normalizar(input));
        assertEquals(expected, NombrePersona.normalizar(expected));
    }

    @Test
    void conservaAusenciaYNumerosParaQueLaValidacionNoSeEvite() {
        assertNull(NombrePersona.normalizar(null));
        assertEquals("", NombrePersona.normalizar("  "));
        assertEquals("Juan123", NombrePersona.normalizar("JUAN123"));
        assertEquals("María", NombrePersona.normalizar("MARI\u0301A"));
    }

    @Test
    void elAltaNormalizaLosNombresAntesDelGuardadoSinCambiarCorreoDocumentoOTelefono() {
        var mapper = new JsonMapper(); var data = mapper.createObjectNode();
        var personal = data.putObject("informacionPersonal").put("idTipoDocumento", 17).put("numeroDocumento", "00000001")
                .put("nombres", "cEsAr jAvIeR").put("apellidoPaterno", "ROJAS").put("apellidoMaterno", "YAIPEN").put("telefono", "987654321");
        data.putObject("informacionLaboral").put("fechaIngreso", "2026-11-10");
        var catalogs = mapper.createObjectNode(); catalogs.putArray("tiposDocumento").addObject().put("idTipoDocumento", 17).put("codigo", "DNI");
        var normalized = ValidacionAltaTrabajador.validar(data, catalogs, LocalDate.of(2026, 11, 10)).path("informacionPersonal");
        assertEquals("Cesar Javier", normalized.path("nombres").asString());
        assertEquals("Rojas", normalized.path("apellidoPaterno").asString());
        assertEquals("Yaipen", normalized.path("apellidoMaterno").asString());
        assertEquals("00000001", normalized.path("numeroDocumento").asString());
        assertEquals("987654321", normalized.path("telefono").asString());
        assertEquals("cEsAr jAvIeR", personal.path("nombres").asString());
    }

    @Test
    void laEdicionParcialNoAgregaCamposPersonalesAusentes() {
        var data = new JsonMapper().createObjectNode();
        data.putObject("informacionPersonal").put("nombres", "MARÍA LUCÍA").put("telefono", "987654321");
        var normalized = ValidacionEdicionTrabajador.validar(data, null).path("informacionPersonal");
        assertEquals("María Lucía", normalized.path("nombres").asString());
        assertFalse(normalized.has("apellidoPaterno"));
        assertFalse(normalized.has("numeroDocumento"));
    }

    @Test
    void elServicioEntregaAlRepositorioNombresNormalizadosSinIdentidadFicticia() {
        var mapper = new JsonMapper(); var repository = mock(TrabajadorProcedureRepository.class);
        var catalogs = mapper.createObjectNode(); catalogs.putArray("tiposDocumento").addObject().put("idTipoDocumento", 17).put("codigo", "DNI");
        when(repository.obtenerCatalogos(1L)).thenReturn(new ResultadoProcedimiento(catalogs, "OK", "OK"));
        when(repository.registrarTrabajador(eq(1L), anyString())).thenReturn(new ResultadoProcedimiento(mapper.createObjectNode(), "OK", "OK"));
        var data = mapper.createObjectNode(); data.putObject("informacionPersonal").put("idTipoDocumento", 17)
                .put("numeroDocumento", "00000001").put("nombres", "MARÍA lucía").put("apellidoPaterno", "muñoz");
        data.putObject("informacionLaboral").put("fechaIngreso", LocalDate.now(ZoneId.of("America/Lima")).toString());
        new TrabajadorService(repository, mapper).registrarTrabajador(1L, data);
        verify(repository).registrarTrabajador(eq(1L), argThat(json -> {
            var personal = mapper.readTree(json).path("informacionPersonal");
            return "María Lucía".equals(personal.path("nombres").asString()) && "Muñoz".equals(personal.path("apellidoPaterno").asString())
                    && "00000001".equals(personal.path("numeroDocumento").asString()) && !personal.has("idPersona");
        }));
    }
}

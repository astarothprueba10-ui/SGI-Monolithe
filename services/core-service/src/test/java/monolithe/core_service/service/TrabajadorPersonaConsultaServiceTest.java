package monolithe.core_service.service;

import monolithe.core_service.client.ConsultaDniClient;
import monolithe.core_service.dto.*;
import monolithe.core_service.exception.*;
import org.junit.jupiter.api.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class TrabajadorPersonaConsultaServiceTest {
    private final TrabajadorService workers = mock(TrabajadorService.class);
    private final ConsultaDniClient dni = mock(ConsultaDniClient.class);
    private final JsonMapper mapper = new JsonMapper();
    private final TrabajadorPersonaConsultaService service = new TrabajadorPersonaConsultaService(workers, dni, mapper);
    private final ConsultaPersonaTrabajadorRequest request = new ConsultaPersonaTrabajadorRequest(17, "00000001");

    @BeforeEach
    void prepare() {
        var catalogs = mapper.createObjectNode(); var types = catalogs.putArray("tiposDocumento");
        types.addObject().put("idTipoDocumento", 17).put("codigo", "DNI");
        types.addObject().put("idTipoDocumento", 19).put("codigo", "CE");
        types.addObject().put("idTipoDocumento", 22).put("codigo", "RUC");
        when(workers.obtenerCatalogos(1L)).thenReturn(catalogs);
        when(workers.identificarPersona(eq(1L), any(JsonNode.class))).thenThrow(new RecursoNoEncontradoException("No registrada"));
    }

    @Test
    void consultaDniNuevoSinAsignarIdPersonaYNormalizaNombres() {
        when(dni.consultar("00000001")).thenReturn(Optional.of(new DatosPersonaCrm("CESAR JAVIER", "ROJAS", "YAIPEN")));
        var response = service.consultar(1L, request);
        assertEquals("ENCONTRADO", response.estado()); assertEquals("DNI", response.fuente());
        assertNull(response.personaRegistrada()); assertEquals("00000001", response.numeroDocumento());
        assertEquals("Cesar Javier", response.persona().nombres()); assertEquals("Rojas", response.persona().apellidoPaterno());
        verify(workers).identificarPersona(eq(1L), argThat(node -> node.path("idTipoDocumento").asInt() == 17));
    }

    @Test
    void conservaPersonaLocalParaConfirmarYNoConsultaProveedor() {
        var person = mapper.createObjectNode().put("idPersona", 77).put("nombres", "MARÍA ÁNGELA").put("apellidoPaterno", "ÑAUPA");
        when(workers.identificarPersona(eq(1L), any(JsonNode.class))).thenReturn(person);
        var response = service.consultar(1L, request);
        assertEquals("MONOLITHE", response.fuente()); assertEquals(77, response.personaRegistrada().path("idPersona").asInt());
        assertEquals("María Ángela", response.personaRegistrada().path("nombres").asString());
        assertEquals("MARÍA ÁNGELA", person.path("nombres").asString()); verifyNoInteractions(dni);
    }

    @Test
    void unCarneDeExtranjeriaUsaSoloLaConsultaLocal() {
        assertEquals("NO_ENCONTRADO", service.consultar(1L, new ConsultaPersonaTrabajadorRequest(19, "000000001")).estado());
        verifyNoInteractions(dni);
    }

    @Test
    void unDniNoEncontradoConservaLaCapturaManual() {
        when(dni.consultar("00000001")).thenReturn(Optional.empty());
        assertEquals("NO_ENCONTRADO", service.consultar(1L, request).estado());
    }

    @Test
    void unaApiNoDisponibleConservaLaCapturaManual() {
        when(dni.consultar("00000001")).thenThrow(new ConsultaIdentidadNoDisponibleException());
        var response = service.consultar(1L, request);
        assertEquals("NO_DISPONIBLE", response.estado()); assertNull(response.persona()); assertNull(response.personaRegistrada());
    }

    @Test
    void rechazaDniIncompletosSinConsultarPersonaOApi() {
        for (String value : new String[] { "1234567", "123456789", "ABCDEFGH", "1234 678", "", null })
            assertThrows(ReglaNegocioException.class, () -> service.consultar(1L, new ConsultaPersonaTrabajadorRequest(17, value)));
        verify(workers, never()).identificarPersona(anyLong(), any()); verifyNoInteractions(dni);
    }

    @Test
    void rechazaDocumentosNoPermitidosODesconocidos() {
        for (int id : new int[] { 22, 0, -1, 99 })
            assertThrows(ResponseStatusException.class, () -> service.consultar(1L, new ConsultaPersonaTrabajadorRequest(id, "00000001")));
        verify(workers, never()).identificarPersona(anyLong(), any()); verifyNoInteractions(dni);
    }

    @Test
    void unErrorDePermisosOConflictoLocalNuncaSeEvadeConLaApi() {
        for (HttpStatus status : new HttpStatus[] { HttpStatus.FORBIDDEN, HttpStatus.CONFLICT }) {
            when(workers.identificarPersona(eq(1L), any(JsonNode.class))).thenThrow(new ResponseStatusException(status, "Bloqueado"));
            assertThrows(ResponseStatusException.class, () -> service.consultar(1L, request));
        }
        verifyNoInteractions(dni);
    }

    @Test
    void rechazaUnActorInvalidoAntesDeConsultarCatalogos() {
        assertThrows(ResponseStatusException.class, () -> service.consultar(null, request));
        assertThrows(ResponseStatusException.class, () -> service.consultar(0L, request));
        verifyNoInteractions(workers, dni);
    }
}

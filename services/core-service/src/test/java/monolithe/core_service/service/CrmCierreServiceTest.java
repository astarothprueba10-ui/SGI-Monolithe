package monolithe.core_service.service;

import monolithe.core_service.dto.ActualizarFichaCrmRequest;
import monolithe.core_service.repository.CrmCierreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CrmCierreServiceTest {
    private CrmCierreRepository repository;
    private CrmCierreService service;

    @BeforeEach
    void iniciar() {
        repository = mock(CrmCierreRepository.class);
        service = new CrmCierreService(repository, new JsonMapper());
    }

    @Test
    void buscaProspectosConPaginacion() {
        when(repository.resolverAlcanceBusqueda(5L)).thenReturn(-1L);
        when(repository.buscar(5L, "Ana", "INTERESADO", null, null, false, "POTENCIAL", 2, 10))
                .thenReturn("{\"items\":[],\"total\":11,\"pagina\":2,\"tamano\":10,\"paginas\":2}");
        var resultado = service.buscar(5L, "Ana", "interesado", null, null, false, "potencial", 2, 10);
        assertEquals(11, resultado.path("total").asInt());
        assertEquals(2, resultado.path("paginas").asInt());
    }

    @Test
    void asesorSoloPuedeBuscarSuPropiaCartera() {
        when(repository.resolverAlcanceBusqueda(5L))
                .thenReturn(12L);

        when(repository.buscar(
                5L, null, null, null, 12L,
                false, "TODOS", 1, 20))
                .thenReturn("""
                        {"items":[{"id_prospecto":15}],
                         "total":1,"pagina":1,"tamano":20,"paginas":1}
                        """);

        var resultado = service.buscar(
                5L, null, null, null, null,
                false, "TODOS", 1, 20);

        assertEquals(1, resultado.path("total").asInt());

        verify(repository).buscar(
                5L, null, null, null, 12L,
                false, "TODOS", 1, 20);
    }

    @Test
    void asesorNoPuedeConsultarCarteraAjena() {
        when(repository.resolverAlcanceBusqueda(5L))
                .thenReturn(12L);

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.buscar(
                        5L, null, null, null, 18L,
                        false, "TODOS", 1, 20));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());

        verify(repository).resolverAlcanceBusqueda(5L);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void asesorNoPuedeBuscarProspectosSinAsignar() {
        when(repository.resolverAlcanceBusqueda(5L))
                .thenReturn(12L);

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.buscar(
                        5L, null, null, null, null,
                        true, "TODOS", 1, 20));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());

        verify(repository).resolverAlcanceBusqueda(5L);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void resumenClasificaEmbudo() {
        when(repository.indicadores(5L))
                .thenReturn("{\"total\":8,\"leads\":3,\"potenciales\":2,\"compradores\":2,\"cerrados\":1}");
        assertEquals(2, service.indicadores(5L).path("compradores").asInt());
    }

    @Test
    void listaCompradoresConContrato() {
        when(repository.compradores(5L, null, 1, 20))
                .thenReturn("{\"items\":[{\"id_cliente\":2,\"codigo_contrato\":\"C-1\"}],\"total\":1}");
        assertEquals(2, service.compradores(5L, null, 1, 20).path("items").get(0).path("id_cliente").asInt());
    }

    @Test
    void actualizaFichaComCamposPermitidos() {
        when(repository.actualizarFicha(5L, 1L, "WEB", "Llamar nuevamente", 3L))
                .thenReturn("{\"id_prospecto\":1,\"sin_cambios\":false}");
        var req = new ActualizarFichaCrmRequest("web", "Llamar nuevamente", 3L);
        assertEquals(1, service.actualizarFicha(5L, 1L, req).path("id_prospecto").asInt());
    }

    @Test
    void exigeAlMenosUnCampoAlEditar() {
        var e = assertThrows(ResponseStatusException.class,
                () -> service.actualizarFicha(5L, 1L, new ActualizarFichaCrmRequest(null, null, null)));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void rechazaPaginacionExcesiva() {
        var e = assertThrows(ResponseStatusException.class,
                () -> service.buscar(5L, null, null, null, null, false, "TODOS", 1, 101));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void rechazaCategoriaInvalida() {
        var e = assertThrows(ResponseStatusException.class,
                () -> service.buscar(5L, null, null, null, null, false, "SECRETO", 1, 20));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
    }

    @Test
    void desactivarExigeMotivo() {
        var e = assertThrows(ResponseStatusException.class, () -> service.desactivar(5L, 1L, "corto"));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void desactivarRechazaVentaExistente() {
        when(repository.desactivar(5L, 1L, "Prueba de desactivacion"))
                .thenThrow(new DataIntegrityViolationException("VENTA_EXISTENTE|Existe venta formal"));
        var e = assertThrows(ResponseStatusException.class,
                () -> service.desactivar(5L, 1L, "Prueba de desactivacion"));
        assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
    }

    @Test
    void baseDeDatosRevocaAcceso() {
        when(repository.indicadores(5L))
                .thenThrow(new DataIntegrityViolationException("DENEGADO|No tiene crm.view"));
        var e = assertThrows(ResponseStatusException.class, () -> service.indicadores(5L));
        assertEquals(HttpStatus.FORBIDDEN, e.getStatusCode());
    }

    @Test
    void noAceptaActorInvalido() {
        var e = assertThrows(ResponseStatusException.class, () -> service.indicadores(0L));
        assertEquals(HttpStatus.UNAUTHORIZED, e.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void exportacionEsCsvUtf8ConBOM() {
        when(repository.exportar(5L, null, null, "TODOS", 5000)).thenReturn("""
                [{"codigo":"L-1","nombre_completo":"Ana; Maria","telefono":"123","email":"a@b.com",
                  "estado_nombre":"Nuevo","categoria":"LEAD","origen_nombre":"Web",
                  "asesor_nombre":"Sin asesor","fecha_registro":"2026-10-26"}]
                """);
        byte[] resultado = service.exportarCsv(5L, null, null, "TODOS", 5000);
        String archivo = new String(resultado, StandardCharsets.UTF_8);
        assertTrue(archivo.startsWith("\uFEFFCodigo;Nombre"));
        assertTrue(archivo.contains("\"Ana; Maria\""));
        assertTrue(archivo.contains("\r\n"));
    }

    @Test
    void exportacionNeutralizaFormulasExcel() {
        when(repository.exportar(5L, null, null, "TODOS", 5000)).thenReturn("""
                [{"codigo":"L-3","nombre_completo":"=1+2",
                  "telefono":"+cmd","email":"-1+2","estado_nombre":"Nuevo",
                  "categoria":"LEAD","origen_nombre":"Web","asesor_nombre":"@SUM(A1)","fecha_registro":""}]
                """);
        String archivo = new String(service.exportarCsv(5L, null, null, "TODOS", 5000), StandardCharsets.UTF_8);
        assertTrue(archivo.contains("'="));
        assertTrue(archivo.contains("'+cmd"));
        assertTrue(archivo.contains("'-1+2"));
        assertTrue(archivo.contains("'@SUM(A1)"));
    }

    @Test
    void exportacionNoAceptaMasDeCincoMil() {
        var e = assertThrows(ResponseStatusException.class,
                () -> service.exportarCsv(5L, null, null, "TODOS", 5001));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void asesorSoloPuedeBuscarSuCarteraPorPeriodo() {
        OffsetDateTime desde = OffsetDateTime.parse("2026-10-01T00:00:00-05:00");
        OffsetDateTime hasta = OffsetDateTime.parse("2026-11-01T00:00:00-05:00");

        when(repository.resolverAlcanceBusqueda(5L))
                .thenReturn(12L);

        when(repository.buscarPeriodo(
                5L, null, null, null, 12L,
                false, "TODOS", 1, 20, null, desde, hasta))
                .thenReturn("""
                        {"items":[{"id_prospecto":15}],
                         "total":1,"pagina":1,"tamano":20,"paginas":1}
                        """);

        var resultado = service.buscarPeriodo(
                5L, null, null, null, null,
                false, "TODOS", 1, 20, null, desde, hasta);

        assertEquals(1, resultado.path("total").asInt());

        verify(repository).buscarPeriodo(
                5L, null, null, null, 12L,
                false, "TODOS", 1, 20, null, desde, hasta);
    }

    @Test
    void asesorNoPuedeBuscarCarteraAjenaPorPeriodo() {
        OffsetDateTime desde = OffsetDateTime.parse("2026-10-01T00:00:00-05:00");
        OffsetDateTime hasta = OffsetDateTime.parse("2026-11-01T00:00:00-05:00");

        when(repository.resolverAlcanceBusqueda(5L))
                .thenReturn(12L);

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.buscarPeriodo(
                        5L, null, null, null, 18L,
                        false, "TODOS", 1, 20, null, desde, hasta));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());

        verify(repository).resolverAlcanceBusqueda(5L);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void asesorNoPuedeBuscarSinAsignarPorPeriodo() {
        OffsetDateTime desde = OffsetDateTime.parse("2026-10-01T00:00:00-05:00");
        OffsetDateTime hasta = OffsetDateTime.parse("2026-11-01T00:00:00-05:00");

        when(repository.resolverAlcanceBusqueda(5L))
                .thenReturn(12L);

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.buscarPeriodo(
                        5L, null, null, null, null,
                        true, "TODOS", 1, 20, null, desde, hasta));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());

        verify(repository).resolverAlcanceBusqueda(5L);
        verifyNoMoreInteractions(repository);
    }

}

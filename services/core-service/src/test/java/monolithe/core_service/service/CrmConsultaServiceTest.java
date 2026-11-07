package monolithe.core_service.service;

import monolithe.core_service.repository.CrmConsultaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

class CrmConsultaServiceTest {

    private CrmConsultaRepository repository;
    private CrmConsultaService service;

    @BeforeEach
    void iniciar() {
        repository = mock(CrmConsultaRepository.class);
        service = new CrmConsultaService(repository, new JsonMapper());
    }

    @Test
    void listaProspectosConAutorizacionVigente() {
        when(repository.tienePermisoVista(5L)).thenReturn(true);
        when(repository.tieneAlcanceProspectos(5L)).thenReturn(true);
        when(repository.listarProspectos(5L)).thenReturn("[{\"id_prospecto\":15,\"estado_codigo\":\"NUEVO\"}]");

        var resultado = service.listarProspectos(5L);

        assertTrue(resultado.isArray());
        assertEquals(1, resultado.size());
        assertEquals(15L, resultado.get(0).path("id_prospecto").asLong());
        verify(repository).tienePermisoVista(5L);
        verify(repository).tieneAlcanceProspectos(5L);
        verify(repository).listarProspectos(5L);
        verify(repository, never()).listarAsesores();
    }

    @Test
    void listaAsesoresSinDatosConArregloVacio() {
        when(repository.tienePermisoVista(5L)).thenReturn(true);
        when(repository.listarAsesores()).thenReturn("[]");

        var resultado = service.listarAsesores(5L);

        assertTrue(resultado.isArray());
        assertEquals(0, resultado.size());
        verify(repository).listarAsesores();
    }

    @Test
    void rrhhConAdvisorsViewPuedeListarAsesoresSinAccesoACrm() {
        when(repository.tienePermisoVista(12L)).thenReturn(false);
        when(repository.tienePermisoVistaAsesores(12L)).thenReturn(true);
        when(repository.listarAsesores()).thenReturn("[{\"id_asesor\":5,\"codigo\":\"ASE-005\"}]");

        var resultado = service.listarAsesores(12L);

        assertEquals(1, resultado.size());
        assertEquals(5L, resultado.get(0).path("id_asesor").asLong());
        verify(repository).tienePermisoVistaAsesores(12L);
        verify(repository).listarAsesores();
        verify(repository, never()).listarProspectos(anyLong());
    }

    @Test
    void usuarioSinNingunPermisoNoPuedeVerAsesores() {
        when(repository.tienePermisoVista(12L)).thenReturn(false);
        when(repository.tienePermisoVistaAsesores(12L)).thenReturn(false);

        var error = assertThrows(ResponseStatusException.class,
                () -> service.listarAsesores(12L));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verify(repository, never()).listarAsesores();
    }

    @Test
    void rrhhNoPuedeConsultarProspectosSinCrmView() {
        when(repository.tienePermisoVista(12L)).thenReturn(false);
        when(repository.tienePermisoVistaAsesores(12L)).thenReturn(true);

        var error = assertThrows(ResponseStatusException.class,
                () -> service.listarProspectos(12L));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verify(repository, never()).tienePermisoVistaAsesores(12L);
        verify(repository, never()).listarProspectos(anyLong());
    }

    @Test
    void niegaAccesoCuandoPermisoNoEstaVigente() {
        when(repository.tienePermisoVista(10L)).thenReturn(false);

        var error = assertThrows(ResponseStatusException.class,
                () -> service.listarProspectos(10L));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verify(repository, never()).listarProspectos(anyLong());
    }

    @Test
    void niegaAccesoCuandoNoTieneAlcanceComercial() {
        when(repository.tienePermisoVista(5L)).thenReturn(true);
        when(repository.tieneAlcanceProspectos(5L)).thenReturn(false);

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.listarProspectos(5L));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());

        verify(repository).tienePermisoVista(5L);
        verify(repository).tieneAlcanceProspectos(5L);
        verify(repository, never()).listarProspectos(anyLong());
    }

    @Test
    void noConsultaSiIdActorEsInvalido() {
        var error = assertThrows(ResponseStatusException.class,
                () -> service.listarProspectos(0L));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void fallaDeFormaControladaAnteErrorDeBaseDeDatos() {
        when(repository.tienePermisoVista(5L)).thenReturn(true);
        when(repository.tieneAlcanceProspectos(5L))
                .thenReturn(true);
        when(repository.listarProspectos(5L))
                .thenThrow(
                        new DataAccessResourceFailureException(
                                "Conexion interrumpida"));

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.listarProspectos(5L));

        assertEquals(
                HttpStatus.SERVICE_UNAVAILABLE,
                error.getStatusCode());
    }

}

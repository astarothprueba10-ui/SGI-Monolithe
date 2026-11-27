package monolithe.core_service.service;

import monolithe.core_service.entity.Proyecto;
import monolithe.core_service.repository.ConfiguracionProyectoRepository;
import monolithe.core_service.repository.ProyectoRepository;
import monolithe.core_service.repository.PublicacionComercialRepository;
import monolithe.core_service.exception.ConflictoNegocioException;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MapaLotesLecturaTest {
    @Test void consultaLigeraRespetaAsignacionesYEtapasVigentesSinCatalogos() {
        var repo = mock(ConfiguracionProyectoRepository.class);
        var proyectos = mock(ProyectoRepository.class);
        when(proyectos.findById(2L)).thenReturn(Optional.of(new Proyecto()));
        when(repo.versionPublicada(2L)).thenReturn(3);
        when(repo.porVersion(2L,3)).thenReturn(Optional.of(
            new ConfiguracionProyectoRepository.Version(3,
                "{\"etapas\":[],\"manzanas\":[],\"lotes\":[]}")));
        when(repo.asignacionesVigentes(2L,3)).thenReturn(Optional.of(
            "{\"manzanas\":[{\"id\":10,\"codigoEtapa\":\"E2\"}],\"lotes\":[{\"id\":71,\"codigoEtapa\":\"E2\"}]}"));
        when(repo.etapasVigentes(2L,3)).thenReturn(Optional.of(
            "[{\"codigo\":\"E2\",\"nombre\":\"Segunda etapa\",\"disponibilidad\":\"REGULAR\",\"tipoDescuento\":\"NINGUNO\",\"descuento\":0}]"));
        var servicio = new ConfiguracionProyectoService(repo,proyectos,JsonMapper.builder().build());
        var resultado = servicio.obtenerParaMapa(2L);
        assertTrue(resultado.publicado());
        assertEquals(3,resultado.version());
        assertEquals("E2",resultado.datos().etapas().get(0).codigo());
        assertEquals("E2",resultado.datos().manzanas().get(0).codigoEtapa());
        assertEquals("E2",resultado.datos().lotes().get(0).codigoEtapa());
        verify(repo,never()).tarifasVigentes(2L,3);
        verify(repo,never()).manzanas(2L);
        verify(repo,never()).lotes(2L);
        verify(repo,never()).zonas(2L);
        verify(repo,never()).monedas();
    }

    @Test void etapasAbiertasProvienenDelEventoVigenteSinReconsultarConfiguracion() {
        var repo = mock(PublicacionComercialRepository.class);
        var config = mock(ConfiguracionProyectoService.class);
        when(repo.puedeVerificarIntegridadPublicacion()).thenReturn(true);
        when(repo.versionPublicada(2L)).thenReturn(3);
        when(repo.ultimoEstado(2L,3)).thenReturn(Optional.of(
            new PublicacionComercialRepository.EventoEstado(9L,
                "{\"etapasHabilitadas\":[\"E2\"],\"tarifas\":[]}")));
        var servicio = new PublicacionComercialService(config,repo,null,null,null,JsonMapper.builder().build());
        assertEquals(List.of("E2"),servicio.etapasHabilitadasParaMapa(2L,3));
        verifyNoInteractions(config);
        verify(repo,never()).etapasHistoricas(2L,3);
        assertThrows(ConflictoNegocioException.class,()->servicio.etapasHabilitadasParaMapa(2L,2));
    }

    @Test void publicacionHistoricaMantieneLaMismaFuenteDeDisponibilidad() {
        var repo = mock(PublicacionComercialRepository.class);
        when(repo.puedeVerificarIntegridadPublicacion()).thenReturn(true);
        when(repo.versionPublicada(2L)).thenReturn(3);
        when(repo.ultimoEstado(2L,3)).thenReturn(Optional.empty());
        when(repo.etapasHistoricas(2L,3)).thenReturn(List.of("E1"));
        var servicio = new PublicacionComercialService(null,repo,null,null,null,JsonMapper.builder().build());
        assertEquals(List.of("E1"),servicio.etapasHabilitadasParaMapa(2L,3));
    }
}

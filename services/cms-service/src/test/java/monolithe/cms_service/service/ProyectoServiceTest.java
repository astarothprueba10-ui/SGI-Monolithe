package monolithe.cms_service.service;

import monolithe.cms_service.entity.Proyecto;
import monolithe.cms_service.repository.CmsProyectoRepository;
import monolithe.cms_service.repository.PaginaRepository;
import monolithe.cms_service.repository.ProyectoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProyectoServiceTest {

    @Mock private ProyectoRepository proyectoRepository;
    @Mock private CmsProyectoRepository cmsProyectoRepository;
    @Mock private PaginaRepository paginaRepository;
    @Mock private EstadoService estadoService;
    @InjectMocks private ProyectoService proyectoService;

    @Test
    void unicamenteListaLosQueAutorizaLaConsultaDeVisibilidad() {
        Proyecto proyecto = proyecto(2L, "PROY-001");
        when(proyectoRepository.listarProyectosPublicos()).thenReturn(List.of(proyecto));
        when(cmsProyectoRepository.findByIdProyectoAndActivoTrue(2L))
                .thenReturn(Optional.empty());

        var resultado = proyectoService.listarProyectosPublicos();

        assertEquals(1, resultado.size());
        assertEquals("PROY-001", resultado.getFirst().getCodigo());
        verify(proyectoRepository).listarProyectosPublicos();
        verifyNoInteractions(paginaRepository, estadoService);
    }

    @Test
    void proyectoOcultoNoEsAccesiblePorIdentificador() {
        when(proyectoRepository.buscarProyectoPublicoPorId(3L))
                .thenReturn(Optional.empty());

        assertTrue(proyectoService.buscarPorId(3L).isEmpty());
        verifyNoInteractions(cmsProyectoRepository);
    }

    @Test
    void proyectoOcultoNoEsAccesiblePorCodigo() {
        when(proyectoRepository.buscarProyectoPublicoPorCodigo("PROY-002"))
                .thenReturn(Optional.empty());

        assertTrue(proyectoService.buscarPorCodigo(" proy-002 ").isEmpty());
        verifyNoInteractions(cmsProyectoRepository);
    }

    @Test
    void codigoBlancoNoConsultaLaBaseDeDatos() {
        assertTrue(proyectoService.buscarPorCodigo(" ").isEmpty());
        verifyNoInteractions(proyectoRepository);
    }

    private static Proyecto proyecto(Long id, String codigo) {
        Proyecto proyecto = new Proyecto();
        proyecto.setIdProyecto(id);
        proyecto.setCodigo(codigo);
        proyecto.setNombre("Proyecto de prueba");
        proyecto.setActivo(true);
        return proyecto;
    }
}

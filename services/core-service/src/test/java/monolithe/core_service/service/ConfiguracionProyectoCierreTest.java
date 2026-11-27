package monolithe.core_service.service;

import monolithe.core_service.exception.ConflictoNegocioException;
import monolithe.core_service.repository.ConfiguracionProyectoRepository;
import monolithe.core_service.repository.ProyectoRepository;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class ConfiguracionProyectoCierreTest {
    @Test
    void proyectoPublicadoNoPuedeGuardarOtroBorrador() {
        var repository = mock(ConfiguracionProyectoRepository.class);
        var proyectos = mock(ProyectoRepository.class);
        var service = new ConfiguracionProyectoService(repository, proyectos, JsonMapper.builder().build());
        when(repository.versionPublicada(3L)).thenReturn(5);
        assertThrows(ConflictoNegocioException.class, () -> service.guardar(3L, 1L, null));
        var orden = inOrder(repository);
        orden.verify(repository).bloquearConfiguracion(3L);
        orden.verify(repository).versionPublicada(3L);
        verifyNoMoreInteractions(repository);
        verifyNoInteractions(proyectos);
    }
}

package monolithe.core_service.service;
import monolithe.core_service.entity.Proyecto;
import monolithe.core_service.exception.ConflictoNegocioException;
import monolithe.core_service.repository.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ImportacionUnicaTest {
    @Test void proyectoPequenoSoloAdmiteUnaImportacion() {
        var repo=mock(ConfiguracionProyectoRepository.class);
        var proyectos=mock(ProyectoRepository.class);
        when(proyectos.findById(8L)).thenReturn(Optional.of(new Proyecto()));
        var service=new ConfiguracionProyectoService(repo,proyectos,JsonMapper.builder().build());
        when(repo.contarLotesRegistrados(8L)).thenReturn(9);
        assertDoesNotThrow(()->service.exigirImportacionInicial(8L));
        when(repo.importacionRealizada(8L)).thenReturn(true);
        assertThrows(ConflictoNegocioException.class,()->service.exigirImportacionInicial(8L));
        when(repo.importacionRealizada(8L)).thenReturn(false);
        when(repo.contarLotesRegistrados(8L)).thenReturn(10);
        assertThrows(ConflictoNegocioException.class,()->service.exigirImportacionInicial(8L));
    }
}

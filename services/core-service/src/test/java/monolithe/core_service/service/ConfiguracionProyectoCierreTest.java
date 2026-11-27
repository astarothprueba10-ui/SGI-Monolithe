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
    void soloCambiosDeEtapaRequierenConfirmacionEnBorrador(){
        var s=new ConfiguracionProyectoService(null,null,JsonMapper.builder().build());
        var a=new monolithe.core_service.dto.ConfiguracionProyectoRequest.Etapa("E1","Etapa 1",monolithe.core_service.dto.ConfiguracionProyectoRequest.Disponibilidad.REGULAR,monolithe.core_service.dto.ConfiguracionProyectoRequest.TipoDescuento.NINGUNO,java.math.BigDecimal.ZERO);
        var b=new monolithe.core_service.dto.ConfiguracionProyectoRequest.Etapa("E1","Etapa 1",monolithe.core_service.dto.ConfiguracionProyectoRequest.Disponibilidad.PROMOCION,monolithe.core_service.dto.ConfiguracionProyectoRequest.TipoDescuento.PORCENTAJE,java.math.BigDecimal.valueOf(5));
        var d=new monolithe.core_service.dto.ConfiguracionProyectoRequest.Datos(java.util.List.of(a),java.util.List.of(),java.util.List.of());
        var asignado=new monolithe.core_service.dto.ConfiguracionProyectoRequest.Datos(java.util.List.of(a),java.util.List.of(new monolithe.core_service.dto.ConfiguracionProyectoRequest.Asignacion(1L,"E1")),java.util.List.of());
        var cambio=new monolithe.core_service.dto.ConfiguracionProyectoRequest.Datos(java.util.List.of(b),java.util.List.of(),java.util.List.of());
        org.junit.jupiter.api.Assertions.assertFalse(s.cambianEtapas(d,asignado));
        org.junit.jupiter.api.Assertions.assertTrue(s.cambianEtapas(d,cambio));
    }
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

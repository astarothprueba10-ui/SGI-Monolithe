package monolithe.core_service.service;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class CondicionPrecioCompatibilidadTest {
    @Test void normalizaAnticipadaSinCambiarDescuentosNiBloqueosHistoricos() {
        var etapas = List.of(
            new Etapa("E1","Promoción",Disponibilidad.PROMOCION,TipoDescuento.PORCENTAJE,BigDecimal.valueOf(5)),
            new Etapa("E2","Antigua anticipada",Disponibilidad.ANTICIPADA,TipoDescuento.NINGUNO,BigDecimal.ZERO),
            new Etapa("E3","Bloqueo histórico",Disponibilidad.BLOQUEADA,TipoDescuento.NINGUNO,BigDecimal.ZERO));
        var asignaciones = List.of(new Asignacion(1L,"E2"));
        var datos = new Datos(etapas,asignaciones,List.of());
        var normalizados = ConfiguracionProyectoService.normalizarCondiciones(datos);
        assertEquals(etapas.get(0),normalizados.etapas().get(0));
        assertEquals(Disponibilidad.REGULAR,normalizados.etapas().get(1).disponibilidad());
        assertEquals(etapas.get(2),normalizados.etapas().get(2));
        assertEquals(asignaciones,normalizados.manzanas());
        assertEquals(Disponibilidad.ANTICIPADA,datos.etapas().get(1).disponibilidad());
    }
}

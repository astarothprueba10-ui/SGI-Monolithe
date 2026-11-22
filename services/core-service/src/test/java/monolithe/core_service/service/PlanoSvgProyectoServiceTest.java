package monolithe.core_service.service;

import monolithe.core_service.dto.PlanoSvgProyectoRequest;
import monolithe.core_service.dto.PlanoSvgProyectoRequest.Elemento;
import monolithe.core_service.exception.ReglaNegocioException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PlanoSvgProyectoServiceTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final PlanoSvgProyectoService servicio = new PlanoSvgProyectoService(jdbc, mock(ObjectMapper.class));
    private PlanoSvgProyectoRequest documento(Map<String,String> atributos,String codigo) {
        return new PlanoSvgProyectoRequest("loteo.svg",List.of(0.0,0.0,1000.0,650.0),
            List.of(new Elemento("path",atributos,null,codigo)));
    }
    private void preparar() {
        when(jdbc.queryForObject(anyString(),eq(Boolean.class),any())).thenReturn(true);
        when(jdbc.queryForList(anyString(),eq(String.class),any())).thenReturn(List.of("ALM-L001","ALM-L002"));
    }
    @Test void aceptaFiguraVectorialYCodigoDelProyecto() {
        preparar();
        assertDoesNotThrow(()->servicio.validar(3L,documento(Map.of("d","M 10 20 L 30 40 Z","fill","#10b981"),"ALM-L001")));
    }
    @Test void rechazaEventosSVGEnlacesYRecursosExternos() {
        preparar();
        for (String key : List.of("onload","href","xlink:href","style","filter")) {
            assertThrows(ReglaNegocioException.class,
                ()->servicio.validar(3L,documento(Map.of("d","M0 0L10 10",key,"javascript:alert(1)"),null)),key);
        }
    }
    @Test void rechazaCodigoAjenoYRepeticion() {
        preparar();
        assertThrows(ReglaNegocioException.class,()->servicio.validar(3L,documento(Map.of("d","M0 0L10 10"),"INVENTADO")));
        var el = new Elemento("path",Map.of("d","M0 0L1 1"),null,"ALM-L001");
        var doc = new PlanoSvgProyectoRequest("plano.svg",List.of(0.0,0.0,500.0,500.0),List.of(el,el));
        assertThrows(ReglaNegocioException.class,()->servicio.validar(3L,doc));
    }
    @Test void rechazaDimensionInfinitaOTipoScript() {
        preparar();
        assertThrows(ReglaNegocioException.class,()->servicio.validar(3L,
            new PlanoSvgProyectoRequest("plano.svg",List.of(0.0,0.0,Double.POSITIVE_INFINITY,500.0),
                List.of(new Elemento("rect",Map.of("x","1"),null,null)))));
        assertThrows(ReglaNegocioException.class,()->servicio.validar(3L,
            new PlanoSvgProyectoRequest("plano.svg",List.of(0.0,0.0,500.0,500.0),
                List.of(new Elemento("script",Map.of(),null,null)))));
    }
}

package monolithe.core_service.service;
import monolithe.core_service.dto.GestionComercialDto.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class CommercialMfaClientTest {
    private final JsonMapper mapper=JsonMapper.builder().findAndAddModules().build();
    private final CommercialMfaClient mfa=new CommercialMfaClient(mapper,"http://localhost:1","test-key");
    @Test void huellaEstableYVinculadaAImportes(){
        var recargos=new LinkedHashMap<String,BigDecimal>();recargos.put("A",new BigDecimal("2000"));recargos.put("B",new BigDecimal("1500"));
        var datos=new CambioMatriz(10L,new BigDecimal("26000"),recargos,LocalDate.of(2026,11,27),null,"ETAPA","E2");
        var normal=mfa.normalizar("MATRIZ",mapper.valueToTree(datos));
        assertEquals(mfa.huella(datos),mfa.huella(normal));
        var inverso=new LinkedHashMap<String,BigDecimal>();inverso.put("B",new BigDecimal("1500"));inverso.put("A",new BigDecimal("2000"));
        assertEquals(mfa.huella(datos),mfa.huella(new CambioMatriz(10L,new BigDecimal("26000"),inverso,datos.vigenteDesde(),null,"ETAPA","E2")));
        assertNotEquals(mfa.huella(datos),mfa.huella(new CambioMatriz(10L,new BigDecimal("27000"),recargos,datos.vigenteDesde(),null,"ETAPA","E2")));
        assertNotEquals(mfa.huella(datos),mfa.huella(new CambioMatriz(10L,new BigDecimal("26000"),recargos,datos.vigenteDesde(),null,"ETAPA","E3")));
    }
    @Test void huellaDeEtapasEnBorradorNoAutorizaOtroContenido(){
        var etapa=new monolithe.core_service.dto.ConfiguracionProyectoRequest.Etapa("E1","Etapa 1",
          monolithe.core_service.dto.ConfiguracionProyectoRequest.Disponibilidad.REGULAR,
          monolithe.core_service.dto.ConfiguracionProyectoRequest.TipoDescuento.NINGUNO,BigDecimal.ZERO);
        var datos=new monolithe.core_service.dto.ConfiguracionProyectoRequest(1,new monolithe.core_service.dto.ConfiguracionProyectoRequest.Datos(List.of(etapa),List.of(),List.of()));
        assertEquals(mfa.huella(datos),mfa.huella(mfa.normalizar("ETAPAS",mapper.valueToTree(datos))));
        assertNotEquals(mfa.huella(datos),mfa.huella(new CambioEtapas(1L,List.of(etapa))));
        assertThrows(ResponseStatusException.class,()->mfa.normalizar("MANZANA",mapper.valueToTree(datos)));
    }
    @Test void sinAprobacionNoLlamaAuth(){
        var e=assertThrows(ResponseStatusException.class,()->mfa.exigir(null,2,"DISPONIBILIDAD",Map.of(),null));
        assertEquals(428,e.getStatusCode().value());
    }
}

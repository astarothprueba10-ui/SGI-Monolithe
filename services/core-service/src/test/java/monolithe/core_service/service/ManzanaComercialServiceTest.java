package monolithe.core_service.service;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class ManzanaComercialServiceTest {
 @Test void estadoDerivadoNoConfundeEtapaCerradaConInactividad(){
  assertEquals("ACTIVA",ManzanaComercialService.estado(true,2,0,true));
  assertEquals("BLOQUEADA_COMERCIALMENTE",ManzanaComercialService.estado(true,2,1,false));
  assertEquals("INACTIVA",ManzanaComercialService.estado(false,0,0,false));
  assertEquals("VENDIDA",ManzanaComercialService.estado(true,2,2,false));
  assertEquals("ACTIVA",ManzanaComercialService.estado(true,0,0,true));
 }
 @Test void secuenciaConservaNomenclaturaYNoReutilizaCodigos(){
  assertEquals("MZ-K",ManzanaComercialService.siguienteCodigo(List.of("MZ-A","MZ-J")));
  assertEquals("MZ-AA",ManzanaComercialService.siguienteCodigo(List.of("MZ-Z")));
  assertEquals("BLOCK-C",ManzanaComercialService.siguienteCodigo(List.of("BLOCK-A","BLOCK-B")));
  assertEquals("MZ-A",ManzanaComercialService.siguienteCodigo(List.of()));
  assertEquals("Manzana K",ManzanaComercialService.nombreSugerido("MZ-K"));
 }
}

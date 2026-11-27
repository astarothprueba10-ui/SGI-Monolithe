package monolithe.core_service.service;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class LoteComercialServiceTest {
 @Test void numeracionPorManzanaConservaCerosYNoRellenaHuecos(){
  assertEquals("01",LoteComercialService.siguienteNumero(List.of()));
  assertEquals("05",LoteComercialService.siguienteNumero(List.of("01","04","02")));
  assertEquals("11",LoteComercialService.siguienteNumero(List.of("09","10")));
  assertEquals("100",LoteComercialService.siguienteNumero(List.of("99")));
  assertEquals("008",LoteComercialService.siguienteNumero(List.of("001","007")));
  assertEquals("06",LoteComercialService.siguienteNumero(List.of("05","A")));
 }
 @Test void disponibilidadDependeDeEtapaPrecioEInventario(){
  assertEquals("NO_DISPONIBLE",LoteComercialService.estado("NO_DISPONIBLE",false,false,false));
  assertEquals("BLOQUEADO_COMERCIALMENTE",LoteComercialService.estado("DISPONIBLE",true,false,true));
  assertEquals("NO_DISPONIBLE",LoteComercialService.estado("DISPONIBLE",true,true,false));
  assertEquals("DISPONIBLE",LoteComercialService.estado("DISPONIBLE",true,true,true));
  assertEquals("BLOQUEADO",LoteComercialService.estado("BLOQUEADO",true,true,true));
  assertEquals("VENDIDO",LoteComercialService.estado("VENDIDO",true,false,false));
  assertEquals("RESERVADO",LoteComercialService.estado("RESERVADO",true,false,false));
 }
}

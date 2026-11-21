package monolithe.core_service.service;

import monolithe.core_service.dto.ConfiguracionProyectoRequest.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class EvaluadorPoliticaComercialTest {
    private final LocalDate hoy = LocalDate.of(2026,11,21);
    private final EvaluadorPoliticaComercial.Parcela lote = new EvaluadorPoliticaComercial.Parcela(10L,3L,"Z-A",new BigDecimal("450"));

    private Etapa etapa(String codigo, Disponibilidad modo) {
        return new Etapa(codigo,codigo,modo,modo == Disponibilidad.PROMOCION ? TipoDescuento.PORCENTAJE : TipoDescuento.NINGUNO,
            modo == Disponibilidad.PROMOCION ? new BigDecimal("10") : BigDecimal.ZERO);
    }
    private Tarifa tarifa(String codigo) {
        return new Tarifa("Z-A",codigo,"PEN",TipoTarifa.POR_M2,new BigDecimal("60"),hoy,null);
    }
    private Datos datos(String comercial, String excepcion) {
        return new Datos(List.of(etapa("E1",Disponibilidad.PROMOCION),etapa("E2",Disponibilidad.ANTICIPADA),etapa("E4",Disponibilidad.BLOQUEADA)),
            List.of(new Asignacion(3L,comercial)), excepcion == null ? List.of() : List.of(new Asignacion(10L,excepcion)),
            List.of(tarifa("E1"),tarifa("E2")));
    }

    @Test
    void aplicaPrimeroAjusteYLuegoDescuento() {
        var r = EvaluadorPoliticaComercial.evaluar(datos("E1",null),lote,"PEN",hoy,
            List.of(new EvaluadorPoliticaComercial.Ajuste("MONTO_FIJO",new BigDecimal("3000"))));
        assertEquals(new BigDecimal("27000.00"),r.base());
        assertEquals(new BigDecimal("3000.00"),r.descuento());
        assertEquals(new BigDecimal("27000.00"),r.total());
    }
    @Test
    void excepcionDeLoteTienePrioridadYSinDescuentoAnticipado() {
        var r = EvaluadorPoliticaComercial.evaluar(datos("E1","E2"),lote,"PEN",hoy,List.of());
        assertEquals("E2",r.codigoEtapa());
        assertEquals(new BigDecimal("0.00"),r.descuento());
        assertEquals(new BigDecimal("27000.00"),r.total());
    }
    @Test
    void bloqueadaNoProducePrecio() {
        var r = EvaluadorPoliticaComercial.evaluar(datos("E1","E4"),lote,"PEN",hoy,List.of());
        assertEquals("BLOQUEADA",r.resultado());
        assertNull(r.total());
    }
    @Test
    void requiereTarifaVigenteYUnSoloAjuste() {
        assertEquals("SIN_TARIFA",EvaluadorPoliticaComercial.evaluar(datos("E1",null),lote,"PEN",hoy.minusDays(1),List.of()).resultado());
        var ajuste = new EvaluadorPoliticaComercial.Ajuste("MONTO_FIJO",BigDecimal.TEN);
        assertEquals("AJUSTE_AMBIGUO",EvaluadorPoliticaComercial.evaluar(datos("E1",null),lote,"PEN",hoy,List.of(ajuste,ajuste)).resultado());
    }
}

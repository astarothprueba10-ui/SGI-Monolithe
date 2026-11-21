package monolithe.core_service.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SimulacionComercialResponse(
        int version, Long idLote, String codigoLote, String estadoInventario,
        String codigoZona, String codigoEtapa, String disponibilidad, String moneda,
        LocalDate fecha, String resultado, String mensaje, BigDecimal precioBase,
        BigDecimal ajusteTipo, BigDecimal descuento, BigDecimal precioSimulado) {}

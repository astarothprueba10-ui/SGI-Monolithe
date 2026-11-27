package monolithe.core_service.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PublicacionComercialResponse(int version, int versionPublicada, String huella,
        boolean publicado, List<Fila> lotes) {
    public record Fila(Long idLote, String codigo, String estadoInventario, String codigoEtapa,
            String situacion, String mensaje, BigDecimal precioActual, BigDecimal base,
            BigDecimal ajuste, BigDecimal descuento, BigDecimal precioFinal,
            LocalDate vigenteHasta, boolean habilitarInventario, boolean bloquearInventario) {
        public Fila(Long idLote, String codigo, String estadoInventario, String codigoEtapa,
                String situacion, String mensaje, BigDecimal precioActual, BigDecimal base,
                BigDecimal ajuste, BigDecimal descuento, BigDecimal precioFinal,
                LocalDate vigenteHasta, boolean habilitarInventario) {
            this(idLote,codigo,estadoInventario,codigoEtapa,situacion,mensaje,precioActual,base,ajuste,descuento,precioFinal,
                vigenteHasta,habilitarInventario,false);
        }
    }
}

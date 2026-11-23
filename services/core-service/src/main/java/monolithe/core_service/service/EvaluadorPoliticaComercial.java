package monolithe.core_service.service;

import monolithe.core_service.dto.ConfiguracionProyectoRequest.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

public final class EvaluadorPoliticaComercial {
    private EvaluadorPoliticaComercial() {}

    public record Parcela(Long id, Long manzana, String zona, BigDecimal area) {}
    public record Ajuste(String tipo, BigDecimal valor) {}
    public record Resultado(String codigoEtapa, Disponibilidad disponibilidad, String resultado,
            String mensaje, BigDecimal base, BigDecimal ajuste, BigDecimal descuento, BigDecimal total) {}

    public static Resultado evaluar(Datos datos, Parcela lote, String moneda, LocalDate fecha, List<Ajuste> ajustes) {
        String codigo = etapaAsignada(datos, lote);
        if (codigo == null) return error(null, null, "SIN_ASIGNACION", "El lote no tiene etapa comercial asignada.");
        Etapa etapa = datos.etapas().stream().filter(e -> e.codigo().equals(codigo)).findFirst().orElse(null);
        if (etapa == null) return error(codigo, null, "SIN_ASIGNACION", "La etapa asignada no existe.");
        if (etapa.disponibilidad() == Disponibilidad.BLOQUEADA)
            return error(codigo, etapa.disponibilidad(), "BLOQUEADA", "La etapa está bloqueada en el borrador.");
        List<Tarifa> tarifas = datos.tarifas().stream().filter(t -> coincide(t, lote, codigo, moneda, fecha)).toList();
        if (tarifas.size() != 1)
            return error(codigo, etapa.disponibilidad(), "SIN_TARIFA", "No existe exactamente una tarifa vigente para lote, etapa y moneda.");
        if (ajustes.size() > 1)
            return error(codigo, etapa.disponibilidad(), "AJUSTE_AMBIGUO", "Hay varios ajustes de tipo aplicables; define uno antes de publicar.");
        return calcular(lote, etapa, tarifas.getFirst(), moneda, ajustes);
    }

    private static String etapaAsignada(Datos datos, Parcela lote) {
        return datos.lotes().stream().filter(a -> a.id().equals(lote.id())).map(Asignacion::codigoEtapa).findFirst()
            .orElseGet(() -> datos.manzanas().stream().filter(a -> a.id().equals(lote.manzana()))
                .map(Asignacion::codigoEtapa).findFirst().orElse(null));
    }

    private static boolean coincide(Tarifa t, Parcela lote, String etapa, String moneda, LocalDate fecha) {
        return Objects.equals(t.codigoZona(), lote.zona()) && t.codigoEtapa().equals(etapa) && t.moneda().equals(moneda)
            && !fecha.isBefore(t.vigenteDesde()) && (t.vigenteHasta() == null || !fecha.isAfter(t.vigenteHasta()));
    }

    private static Resultado calcular(Parcela lote, Etapa etapa, Tarifa tarifa, String moneda, List<Ajuste> ajustes) {
        BigDecimal base = redondear(tarifa.tipoTarifa() == TipoTarifa.POR_M2 ? lote.area().multiply(tarifa.valor()) : tarifa.valor());
        BigDecimal ajuste = ajustes.isEmpty() ? redondear(BigDecimal.ZERO) : montoAjuste(base, ajustes.getFirst());
        BigDecimal subtotal = base.add(ajuste);
        if (etapa.tipoDescuento() == TipoDescuento.MONTO_FIJO && !"PEN".equals(moneda))
            return error(etapa.codigo(), etapa.disponibilidad(), "MONEDA_DESCUENTO", "Los descuentos de monto fijo están expresados en PEN.");
        BigDecimal descuento = descuento(etapa, subtotal);
        BigDecimal total = redondear(subtotal.subtract(descuento));
        if (subtotal.signum() <= 0 || total.signum() <= 0)
            return error(etapa.codigo(), etapa.disponibilidad(), "PRECIO_INVALIDO", "La tarifa, el ajuste y el descuento no producen un precio positivo.");
        return new Resultado(etapa.codigo(), etapa.disponibilidad(), "SIMULADO", "Precio teórico del borrador; no autoriza operaciones.",
            base, ajuste, descuento, total);
    }

    private static BigDecimal montoAjuste(BigDecimal base, Ajuste ajuste) {
        return redondear(switch (ajuste.tipo()) {
            case "PORCENTAJE" -> base.multiply(ajuste.valor().movePointLeft(2));
            case "MONTO_FIJO" -> ajuste.valor();
            default -> throw new IllegalArgumentException("Tipo de ajuste no reconocido.");
        });
    }

    private static BigDecimal descuento(Etapa etapa, BigDecimal subtotal) {
        if (etapa.disponibilidad() != Disponibilidad.PROMOCION) return redondear(BigDecimal.ZERO);
        return redondear(switch (etapa.tipoDescuento()) {
            case NINGUNO -> BigDecimal.ZERO;
            case PORCENTAJE -> subtotal.multiply(etapa.descuento().movePointLeft(2));
            case MONTO_FIJO -> etapa.descuento();
        });
    }

    private static BigDecimal redondear(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    private static Resultado error(String codigo, Disponibilidad disponibilidad, String resultado, String mensaje) {
        return new Resultado(codigo, disponibilidad, resultado, mensaje, null, null, null, null);
    }
}

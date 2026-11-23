package monolithe.core_service.service;

import monolithe.core_service.dto.*;
import monolithe.core_service.dto.ImportacionProyectoRequest.Fila;
import monolithe.core_service.exception.ReglaNegocioException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class ImportacionProyectoFila {
    private static final Map<String, Set<String>> COLUMNAS = Map.of(
        "EtapasFisicas", Set.of("codigo","nombre","codigo_estado","orden","fecha_inicio","fecha_fin_estimada","descripcion"),
        "Zonas", Set.of("codigo","nombre","orden","descripcion"),
        "Manzanas", Set.of("codigo_etapa_fisica","codigo","nombre","codigo_estado","orden","descripcion"),
        "Lotes", Set.of("codigo_etapa_fisica","codigo_manzana","codigo","numero","codigo_zona","codigo_tipo_lote",
            "area_m2","frente_m","fondo_m","lateral_derecho_m","lateral_izquierdo_m","observaciones"),
        "EtapasComerciales", Set.of("codigo","nombre","disponibilidad","tipo_descuento","descuento"),
        "AsignacionManzanas", Set.of("codigo_etapa_fisica","codigo_manzana","codigo_etapa_comercial"),
        "AsignacionLotes", Set.of("codigo_lote","codigo_etapa_comercial"),
        "Tarifas", Set.of("codigo_zona","codigo_etapa_comercial","moneda","tipo_tarifa","valor","vigente_desde","vigente_hasta"));
    private final Fila fila;
    ImportacionProyectoFila(Fila fila) { this.fila = fila; }

    String hoja() { return fila.hoja(); }
    int numero() { return fila.numero(); }
    String texto(String k) { return fila.celdas().getOrDefault(k, "").strip(); }
    String opcional(String k) { return texto(k).isEmpty() ? null : texto(k); }
    String codigo(String k) {
        String valor = texto(k).toUpperCase(Locale.ROOT);
        if (valor.codePoints().anyMatch(Character::isISOControl)) error("El código contiene caracteres de control.");
        return valor;
    }
    String claveManzana() { return codigo("codigo_etapa_fisica") + "\u001f" + codigo(hoja().equals("Manzanas") ? "codigo" : "codigo_manzana"); }
    String claveNumero() { return claveManzana() + "\u001f" + codigo("numero"); }

    void validarColumnas() {
        if (!COLUMNAS.containsKey(hoja())) error("Hoja no admitida.");
        if (!COLUMNAS.get(hoja()).equals(fila.celdas().keySet())) error("Encabezados incompatibles con la plantilla v1.");
    }
    private Integer orden() { return texto("orden").isEmpty() ? 1 : Integer.valueOf(texto("orden")); }
    LocalDate fecha(String k) { return texto(k).isEmpty() ? null : LocalDate.parse(texto(k)); }
    BigDecimal decimal(String k) {
        String valor = texto(k);
        if (valor.isEmpty()) return null;
        if (!valor.matches("[0-9]{1,12}(\\.[0-9]{1,2})?")) error("Número decimal inválido en " + k);
        return new BigDecimal(valor);
    }

    EtapaRequest etapa(Long proyecto) {
        var inicio = fecha("fecha_inicio"); var fin = fecha("fecha_fin_estimada");
        if (inicio != null && fin != null && fin.isBefore(inicio)) error("La fecha fin precede al inicio.");
        return new EtapaRequest(proyecto, codigo("codigo_estado"), codigo("codigo"), texto("nombre"),
                opcional("descripcion"), orden(), inicio, fin, true);
    }
    ZonaRequest zona(Long proyecto) {
        return new ZonaRequest(proyecto, codigo("codigo"), texto("nombre"), opcional("descripcion"), orden(), true);
    }
    ManzanaRequest manzana(Long etapa) {
        return new ManzanaRequest(etapa, codigo("codigo_estado"), codigo("codigo"), texto("nombre"),
                opcional("descripcion"), orden(), true);
    }
    LoteRequest lote(Long manzana, Long zona) {
        return new LoteRequest(manzana, zona, codigo("codigo_tipo_lote"), "NO_DISPONIBLE",
                codigo("codigo"), codigo("numero"), decimal("area_m2"), decimal("frente_m"),
                decimal("fondo_m"), decimal("lateral_derecho_m"), decimal("lateral_izquierdo_m"), opcional("observaciones"), true);
    }
    ConfiguracionProyectoRequest.Etapa comercial() {
        return new ConfiguracionProyectoRequest.Etapa(codigo("codigo"), texto("nombre"),
            ConfiguracionProyectoRequest.Disponibilidad.valueOf(codigo("disponibilidad")),
            ConfiguracionProyectoRequest.TipoDescuento.valueOf(codigo("tipo_descuento")), decimal("descuento"));
    }
    ConfiguracionProyectoRequest.Tarifa tarifa() {
        String valor = texto("valor");
        if (!valor.matches("[0-9]{1,10}(\\.[0-9]{1,4})?")) error("Valor de tarifa inválido.");
        return new ConfiguracionProyectoRequest.Tarifa(codigo("codigo_zona"), codigo("codigo_etapa_comercial"),
            codigo("moneda"), ConfiguracionProyectoRequest.TipoTarifa.valueOf(codigo("tipo_tarifa")),
            new BigDecimal(valor), fecha("vigente_desde"), fecha("vigente_hasta"));
    }
    static void error(String mensaje) { throw new ReglaNegocioException(mensaje); }
}

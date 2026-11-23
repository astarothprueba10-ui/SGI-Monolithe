package monolithe.core_service.service;

import monolithe.core_service.dto.ConfiguracionProyectoRequest.*;
import monolithe.core_service.dto.ConfiguracionProyectoResponse.*;
import monolithe.core_service.exception.ReglaNegocioException;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public final class ConfiguracionProyectoValidator {
    private ConfiguracionProyectoValidator() {}

    public static void validar(Datos datos, List<Manzana> manzanas, List<Lote> lotes) {
        Set<String> etapas = validarEtapas(datos.etapas());
        validarAsignaciones(datos.manzanas(), etapas, manzanas.stream().map(Manzana::id).collect(Collectors.toSet()));
        validarAsignaciones(datos.lotes(), etapas, lotes.stream().map(Lote::id).collect(Collectors.toSet()));
    }

    public static Set<String> validarEtapas(List<Etapa> etapas) {
        Set<String> codigos = new HashSet<>();
        for (Etapa etapa : etapas) {
            if (!codigos.add(etapa.codigo())) error("Código de etapa comercial duplicado.");
            validarDescuento(etapa);
        }
        return codigos;
    }

    public static void validarDescuento(Etapa etapa) {
        boolean promocion = etapa.disponibilidad() == Disponibilidad.PROMOCION;
        boolean tieneDescuento = etapa.tipoDescuento() != TipoDescuento.NINGUNO;
        if (promocion && !tieneDescuento || !promocion && tieneDescuento || tieneDescuento && etapa.descuento().signum() <= 0
                || !tieneDescuento && etapa.descuento().signum() != 0) {
            error("El descuento debe ser coherente con la disponibilidad y el tipo seleccionado.");
        }
        if (etapa.tipoDescuento() == TipoDescuento.PORCENTAJE
                && etapa.descuento().compareTo(BigDecimal.valueOf(100)) >= 0) {
            error("El descuento porcentual debe ser inferior al 100%.");
        }
    }

    private static void validarAsignaciones(List<Asignacion> filas, Set<String> etapas, Set<Long> ids) {
        Set<Long> asignados = new HashSet<>();
        for (Asignacion fila : filas) {
            if (!ids.contains(fila.id())) error("La asignación contiene un registro inactivo o de otro proyecto.");
            if (!etapas.contains(fila.codigoEtapa())) error("La etapa comercial asignada no existe.");
            if (!asignados.add(fila.id())) error("Un registro no puede tener dos asignaciones comerciales.");
        }
    }

    public static String claveTarifa(Tarifa t) {
        return t.codigoZona() + "\u001f" + t.codigoEtapa() + "\u001f" + t.moneda();
    }

    public static void validarTarifas(Datos datos, List<String> zonas, List<String> monedas) {
        Set<String> etapas = datos.etapas().stream().map(Etapa::codigo).collect(Collectors.toSet());
        Set<String> claves = new HashSet<>();
        for (Tarifa tarifa : datos.tarifas()) {
            if (!zonas.contains(tarifa.codigoZona()) || !monedas.contains(tarifa.moneda()) || !etapas.contains(tarifa.codigoEtapa()))
                error("La tarifa tiene una zona, moneda o etapa inválida.");
            if (tarifa.vigenteHasta() != null && tarifa.vigenteHasta().isBefore(tarifa.vigenteDesde()))
                error("La vigencia final de la tarifa precede al inicio.");
            if (!claves.add(claveTarifa(tarifa))) error("Solo se admite una tarifa por zona, etapa y moneda en el borrador.");
        }
    }

    private static void error(String mensaje) {
        throw new ReglaNegocioException(mensaje);
    }
}

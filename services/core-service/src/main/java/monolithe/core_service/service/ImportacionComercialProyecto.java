package monolithe.core_service.service;

import jakarta.validation.Validator;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.*;
import monolithe.core_service.dto.ConfiguracionProyectoResponse;
import monolithe.core_service.exception.ReglaNegocioException;
import java.util.*;

final class ImportacionComercialProyecto {
    private final Map<String, Etapa> etapas = new LinkedHashMap<>();
    private final Map<Long, Asignacion> manzanas = new LinkedHashMap<>();
    private final Map<Long, Asignacion> lotes = new LinkedHashMap<>();
    private final Map<String, Tarifa> tarifas = new LinkedHashMap<>();
    private final Set<String> monedas;
    private final Validator validator;

    ImportacionComercialProyecto(ConfiguracionProyectoResponse base, Validator validator) {
        this.validator = validator;
        monedas = new HashSet<>(base.monedas());
        base.datos().etapas().forEach(e -> etapas.put(e.codigo(), e));
        base.datos().manzanas().forEach(a -> manzanas.put(a.id(), a));
        base.datos().lotes().forEach(a -> lotes.put(a.id(), a));
        base.datos().tarifas().forEach(t -> tarifas.put(ConfiguracionProyectoValidator.claveTarifa(t), t));
    }

    static boolean esComercial(String hoja) {
        return Set.of("EtapasComerciales", "AsignacionManzanas", "AsignacionLotes", "Tarifas").contains(hoja);
    }

    void incorporar(ImportacionProyectoFila f, ImportacionProyectoContexto c) {
        f.validarColumnas();
        switch (f.hoja()) {
            case "EtapasComerciales" -> etapa(f, c);
            case "AsignacionManzanas" -> asignar(f, c, manzanas, c.referencia(c.manzanas, f.claveManzana()).id());
            case "AsignacionLotes" -> asignar(f, c, lotes, c.referencia(c.lotes, f.codigo("codigo_lote")).id());
            case "Tarifas" -> tarifa(f, c);
            default -> throw new ReglaNegocioException("Hoja comercial no admitida.");
        }
    }

    private void etapa(ImportacionProyectoFila f, ImportacionProyectoContexto c) {
        Etapa etapa = f.comercial();
        c.unica(f.hoja(), etapa.codigo());
        validar(etapa);
        ConfiguracionProyectoValidator.validarDescuento(etapa);
        if (!etapas.containsKey(etapa.codigo()) && etapas.size() >= 100)
            ImportacionProyectoFila.error("Máximo 100 etapas comerciales.");
        etapas.put(etapa.codigo(), etapa);
    }

    private void asignar(ImportacionProyectoFila f, ImportacionProyectoContexto c,
            Map<Long, Asignacion> destino, Long id) {
        c.unica(f.hoja(), id.toString());
        String codigo = f.codigo("codigo_etapa_comercial");
        comprobarEtapa(codigo);
        destino.put(id, new Asignacion(id, codigo));
    }

    private void tarifa(ImportacionProyectoFila f, ImportacionProyectoContexto c) {
        Tarifa tarifa = f.tarifa();
        validar(tarifa);
        String clave = ConfiguracionProyectoValidator.claveTarifa(tarifa);
        c.unica(f.hoja(), clave);
        c.referencia(c.zonas, tarifa.codigoZona());
        comprobarEtapa(tarifa.codigoEtapa());
        c.catalogo(monedas, tarifa.moneda());
        if (tarifa.vigenteHasta() != null && tarifa.vigenteHasta().isBefore(tarifa.vigenteDesde()))
            ImportacionProyectoFila.error("La fecha final de la tarifa precede al inicio.");
        tarifas.put(clave, tarifa);
    }

    private void comprobarEtapa(String codigo) {
        if (!etapas.containsKey(codigo)) ImportacionProyectoFila.error("Etapa comercial inexistente en el borrador: " + codigo);
    }

    private void validar(Object dto) {
        var errores = validator.validate(dto);
        if (!errores.isEmpty()) ImportacionProyectoFila.error(errores.stream()
                .map(e -> e.getPropertyPath() + ": " + e.getMessage()).sorted().findFirst().orElse("Datos inválidos."));
    }

    void validarCompleto(ImportacionProyectoContexto c) {
        if (manzanas.size() > 2000 || lotes.size() > 10000 || tarifas.size() > 2000)
            ImportacionProyectoFila.error("El borrador supera el máximo de asignaciones o tarifas.");
        var bloques = c.manzanas.values().stream().filter(r -> r.activo())
            .map(r -> new ConfiguracionProyectoResponse.Manzana(r.id(), r.codigo(), r.codigo())).toList();
        var parcelas = c.lotes.values().stream().filter(r -> r.activo())
            .map(r -> new ConfiguracionProyectoResponse.Lote(r.id(), null, r.codigo())).toList();
        var zonas = c.zonas.values().stream().filter(r -> r.activo()).map(r -> r.codigo()).toList();
        ConfiguracionProyectoValidator.validar(datos(), bloques, parcelas);
        ConfiguracionProyectoValidator.validarTarifas(datos(), zonas, List.copyOf(monedas));
    }

    Datos datos() {
        return new Datos(List.copyOf(etapas.values()), List.copyOf(manzanas.values()),
            List.copyOf(lotes.values()), List.copyOf(tarifas.values()));
    }
}

package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.SimulacionComercialResponse;
import monolithe.core_service.entity.AjusteTipoLote;
import monolithe.core_service.entity.Lote;
import monolithe.core_service.exception.*;
import monolithe.core_service.repository.AjusteTipoLoteRepository;
import monolithe.core_service.repository.LoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class SimulacionComercialService {
    private final ConfiguracionProyectoService configuracion;
    private final LoteRepository lotes;
    private final AjusteTipoLoteRepository ajustes;

    @Transactional(readOnly = true)
    public SimulacionComercialResponse simular(Long proyecto, Long idLote, int version, String moneda) {
        var config = configuracion.obtener(proyecto);
        if (config.version() != version || version < 1)
            throw new ConflictoNegocioException("Guarda el borrador actual o recarga antes de simular.");
        String codigoMoneda = moneda.toUpperCase(Locale.ROOT);
        if (!config.monedas().contains(codigoMoneda)) throw new ReglaNegocioException("Moneda inválida.");
        Lote lote = obtenerLote(proyecto, idLote, config.lotes());
        var ahora = ZonedDateTime.now(ZoneId.of("America/Lima"));
        var parcela = new EvaluadorPoliticaComercial.Parcela(idLote, lote.getManzana().getIdManzana(),
            lote.getZona() == null || !Boolean.TRUE.equals(lote.getZona().getActivo()) ? null : lote.getZona().getCodigo(), lote.getAreaM2());
        var resultado = EvaluadorPoliticaComercial.evaluar(config.datos(), parcela, codigoMoneda,
            ahora.toLocalDate(), ajustesAplicables(proyecto, lote, codigoMoneda, ahora.toOffsetDateTime()));
        return respuesta(version, lote, parcela, codigoMoneda, ahora.toLocalDate(), resultado);
    }

    private Lote obtenerLote(Long proyecto, Long id, List<monolithe.core_service.dto.ConfiguracionProyectoResponse.Lote> activos) {
        Lote lote = lotes.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Lote no encontrado."));
        if (!proyecto.equals(lote.getIdProyecto()) || activos.stream().noneMatch(l -> l.id().equals(id)))
            throw new RecursoNoEncontradoException("Lote inactivo o ajeno al proyecto.");
        return lote;
    }

    private List<EvaluadorPoliticaComercial.Ajuste> ajustesAplicables(Long proyecto, Lote lote, String moneda, OffsetDateTime ahora) {
        if (lote.getTipoLote() == null) return List.of();
        var candidatos = ajustes.findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(proyecto).stream()
            .filter(a -> aplicable(a,lote,moneda,ahora)).toList();
        var especificos = candidatos.stream().filter(a -> a.getMoneda() != null).toList();
        var elegidos = especificos.isEmpty() ? candidatos : candidatos.stream()
            .filter(a -> a.getMoneda() != null || especificos.stream().noneMatch(e ->
                e.getTipoAjustePrecio().getCodigo().equals(a.getTipoAjustePrecio().getCodigo()))).toList();
        return elegidos.stream().map(a -> new EvaluadorPoliticaComercial.Ajuste(a.getTipoAjustePrecio().getCodigo(), a.getValor())).toList();
    }

    private boolean aplicable(AjusteTipoLote a, Lote lote, String moneda, OffsetDateTime ahora) {
        if (!a.getTipoLote().getIdTipoLote().equals(lote.getTipoLote().getIdTipoLote()) || !Boolean.TRUE.equals(a.getTipoAjustePrecio().getActivo())
            || a.getFechaDesde().isAfter(ahora) || (a.getFechaHasta() != null && !a.getFechaHasta().isAfter(ahora))) return false;
        return a.getMoneda() == null ? "PORCENTAJE".equals(a.getTipoAjustePrecio().getCodigo())
            : moneda.equals(a.getMoneda().getCodigo()) && Boolean.TRUE.equals(a.getMoneda().getActivo());
    }

    private SimulacionComercialResponse respuesta(int version, Lote lote, EvaluadorPoliticaComercial.Parcela parcela,
            String moneda, LocalDate fecha, EvaluadorPoliticaComercial.Resultado r) {
        return new SimulacionComercialResponse(version, lote.getIdLote(), lote.getCodigo(), lote.getEstadoLote().getCodigo(),
            parcela.zona(), r.codigoEtapa(), r.disponibilidad() == null ? null : r.disponibilidad().name(), moneda, fecha,
            r.resultado(), r.mensaje(), r.base(), r.ajuste(), r.descuento(), r.total());
    }
}

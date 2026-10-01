package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.LotePrecioRequest;
import monolithe.core_service.dto.LotePrecioResponse;
import monolithe.core_service.entity.*;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LotePrecioService {

    private final LoteRepository loteRepository;
    private final EtapaComercialRepository etapaComercialRepository;
    private final MonedaRepository monedaRepository;
    private final TipoTarifaRepository tipoTarifaRepository;
    private final TipoAjustePrecioRepository tipoAjustePrecioRepository;
    private final TarifaZonaEtapaRepository tarifaZonaEtapaRepository;
    private final AjusteTipoLoteRepository ajusteTipoLoteRepository;
    private final LotePrecioRepository lotePrecioRepository;

    private record ContextoPrecio(
            Lote lote,
            Proyecto proyecto,
            Zona zona,
            EtapaComercial etapaComercial,
            Moneda moneda,
            TipoTarifa tipoTarifa,
            TarifaZonaEtapa tarifa,
            TipoAjustePrecio tipoAjustePrecio,
            AjusteTipoLote ajuste
    ) {
    }

    private record AjusteContexto(
            TipoAjustePrecio tipoAjustePrecio,
            AjusteTipoLote ajuste
    ) {
    }

    private record ResultadoCalculo(
            BigDecimal areaM2Aplicada,
            BigDecimal valorTarifaAplicado,
            BigDecimal precioBase,
            BigDecimal valorAjusteAplicado,
            BigDecimal montoAjuste,
            BigDecimal precioFinal
    ) {
    }

    @Transactional(readOnly = true)
    public List<LotePrecioResponse> listarHistorial(Long idLote) {
        obtenerLote(idLote);
        return lotePrecioRepository.findByLote_IdLoteOrderByFechaDesdeDesc(idLote)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LotePrecioResponse obtenerVigente(Long idLote, String codigoMoneda) {
        obtenerLote(idLote);
        String codigoNormalizado = normalizarCodigo(codigoMoneda);
        Moneda moneda = obtenerMonedaActiva(codigoNormalizado);
        return lotePrecioRepository.buscarVigente(idLote, moneda.getIdMoneda())
                .map(this::toResponse)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe un precio vigente para el lote "
                                + idLote
                                + " en moneda "
                                + codigoNormalizado
                ));
    }

    @Transactional
    public LotePrecioResponse calcularYRegistrar(LotePrecioRequest request) {
        ContextoPrecio ctx = resolverContexto(request);
        ResultadoCalculo resultado = calcular(ctx);
        OffsetDateTime ahora = OffsetDateTime.now(ZoneOffset.UTC);

        cerrarPrecioVigente(ctx.lote().getIdLote(), ctx.moneda().getIdMoneda(), ahora);
        LotePrecio nuevoPrecio = construirPrecio(ctx, resultado, request.observaciones(), ahora);
        LotePrecio guardado = lotePrecioRepository.save(nuevoPrecio);

        return toResponse(guardado);
    }

    private ContextoPrecio resolverContexto(LotePrecioRequest request) {
        Lote lote = obtenerLoteCalculable(request.idLote());
        Proyecto proyecto = lote.getManzana().getEtapa().getProyecto();
        Zona zona = lote.getZona();
        EtapaComercial etapaComercial = obtenerEtapaComercialActiva(request.idEtapaComercial(), lote.getIdProyecto());
        Moneda moneda = obtenerMonedaActiva(normalizarCodigo(request.codigoMoneda()));
        TipoTarifa tipoTarifa = obtenerTipoTarifaActivo(normalizarCodigo(request.codigoTipoTarifa()));
        TarifaZonaEtapa tarifa = buscarTarifaVigente(
                lote.getIdProyecto(), zona.getIdZona(), etapaComercial.getIdEtapaComercial(),
                moneda.getIdMoneda(), tipoTarifa.getIdTipoTarifa()
        );
        AjusteContexto ajusteCtx = resolverAjuste(lote, request.codigoTipoAjustePrecio(), moneda);

        return new ContextoPrecio(
                lote, proyecto, zona, etapaComercial, moneda, tipoTarifa, tarifa,
                ajusteCtx.tipoAjustePrecio(), ajusteCtx.ajuste()
        );
    }

    private Lote obtenerLote(Long idLote) {
        return loteRepository.findById(idLote)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Lote no encontrado con ID: " + idLote
                ));
    }

    private Lote obtenerLoteCalculable(Long idLote) {
        Lote lote = obtenerLote(idLote);
        validarJerarquiaLote(lote);
        return lote;
    }

    private void validarJerarquiaLote(Lote lote) {
        if (!Boolean.TRUE.equals(lote.getActivo())) {
            throw new ReglaNegocioException("El lote no está activo: " + lote.getIdLote());
        }
        if (lote.getManzana() == null || !Boolean.TRUE.equals(lote.getManzana().getActivo())) {
            throw new ReglaNegocioException("La manzana del lote no es válida o no está activa");
        }
        if (lote.getManzana().getEtapa() == null || !Boolean.TRUE.equals(lote.getManzana().getEtapa().getActivo())) {
            throw new ReglaNegocioException("La etapa física del lote no es válida o no está activa");
        }
        Proyecto proyecto = lote.getManzana().getEtapa().getProyecto();
        if (proyecto == null || !Boolean.TRUE.equals(proyecto.getActivo())) {
            throw new ReglaNegocioException("El proyecto del lote no es válido o no está activo");
        }
        if (lote.getZona() == null || !Boolean.TRUE.equals(lote.getZona().getActivo())) {
            throw new ReglaNegocioException("El lote no tiene una zona asociada y no puede calcularse su precio");
        }
        if (lote.getZona().getProyecto() == null || !lote.getZona().getProyecto().getIdProyecto().equals(lote.getIdProyecto())) {
            throw new ReglaNegocioException("La zona del lote no pertenece al proyecto del lote");
        }
    }

    private EtapaComercial obtenerEtapaComercialActiva(Long idEtapaComercial, Long idProyecto) {
        EtapaComercial etapa = etapaComercialRepository.findById(idEtapaComercial)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Etapa comercial no encontrada con ID: " + idEtapaComercial
                ));
        if (!Boolean.TRUE.equals(etapa.getActivo())) {
            throw new ReglaNegocioException("La etapa comercial no está activa: " + idEtapaComercial);
        }
        if (etapa.getProyecto() == null || !etapa.getProyecto().getIdProyecto().equals(idProyecto)) {
            throw new ReglaNegocioException("La etapa comercial no pertenece al proyecto del lote");
        }
        return etapa;
    }

    private Moneda obtenerMonedaActiva(String codigoMoneda) {
        Moneda moneda = monedaRepository.findByCodigo(codigoMoneda)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Moneda no encontrada con código: " + codigoMoneda
                ));
        if (!Boolean.TRUE.equals(moneda.getActivo())) {
            throw new ReglaNegocioException("La moneda no está activa: " + codigoMoneda);
        }
        return moneda;
    }

    private TipoTarifa obtenerTipoTarifaActivo(String codigoTipoTarifa) {
        TipoTarifa tipo = tipoTarifaRepository.findByCodigo(codigoTipoTarifa)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Tipo de tarifa no encontrado con código: " + codigoTipoTarifa
                ));
        if (!Boolean.TRUE.equals(tipo.getActivo())) {
            throw new ReglaNegocioException("El tipo de tarifa no está activo: " + codigoTipoTarifa);
        }
        if (!"POR_M2".equals(tipo.getCodigo()) && !"MONTO_FIJO".equals(tipo.getCodigo())) {
            throw new ReglaNegocioException("Tipo de tarifa no soportado por el motor: " + codigoTipoTarifa);
        }
        return tipo;
    }

    private TarifaZonaEtapa buscarTarifaVigente(
            Long idProyecto, Long idZona, Long idEtapaComercial, Integer idMoneda, Integer idTipoTarifa
    ) {
        return tarifaZonaEtapaRepository.buscarVigente(
                idProyecto, idZona, idEtapaComercial, idMoneda, idTipoTarifa
        ).orElseThrow(() -> new RecursoNoEncontradoException(
                "No existe una tarifa vigente para el lote y configuración seleccionada"
        ));
    }

    private AjusteContexto resolverAjuste(Lote lote, String codigoTipoAjustePrecio, Moneda moneda) {
        String codigoNormalizado = normalizarCodigo(codigoTipoAjustePrecio);
        if (codigoNormalizado == null || codigoNormalizado.isEmpty()) {
            return new AjusteContexto(null, null);
        }
        if (lote.getTipoLote() == null) {
            throw new ReglaNegocioException("El lote no tiene un tipo de lote configurado para aplicar un ajuste");
        }
        TipoAjustePrecio tipoAjuste = obtenerTipoAjusteActivo(codigoNormalizado);
        AjusteTipoLote ajuste = buscarAjusteVigente(
                lote.getIdProyecto(), lote.getTipoLote().getIdTipoLote(), tipoAjuste, moneda.getIdMoneda()
        );
        return new AjusteContexto(tipoAjuste, ajuste);
    }

    private TipoAjustePrecio obtenerTipoAjusteActivo(String codigoTipoAjuste) {
        TipoAjustePrecio tipo = tipoAjustePrecioRepository.findByCodigo(codigoTipoAjuste)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Tipo de ajuste no encontrado con código: " + codigoTipoAjuste
                ));
        if (!Boolean.TRUE.equals(tipo.getActivo())) {
            throw new ReglaNegocioException("El tipo de ajuste no está activo: " + codigoTipoAjuste);
        }
        if (!"PORCENTAJE".equals(tipo.getCodigo()) && !"MONTO_FIJO".equals(tipo.getCodigo())) {
            throw new ReglaNegocioException("Tipo de ajuste no soportado por el motor: " + codigoTipoAjuste);
        }
        return tipo;
    }

    private AjusteTipoLote buscarAjusteVigente(
            Long idProyecto, Integer idTipoLote, TipoAjustePrecio tipoAjuste, Integer idMoneda
    ) {
        Optional<AjusteTipoLote> opt = ajusteTipoLoteRepository.buscarVigente(
                idProyecto, idTipoLote, tipoAjuste.getIdTipoAjustePrecio(), idMoneda
        );
        if (opt.isPresent()) {
            return opt.get();
        }
        if ("PORCENTAJE".equals(tipoAjuste.getCodigo())) {
            return ajusteTipoLoteRepository.buscarVigenteSinMoneda(
                    idProyecto, idTipoLote, tipoAjuste.getIdTipoAjustePrecio()
            ).orElseThrow(() -> new RecursoNoEncontradoException(
                    "No existe un ajuste vigente para el tipo de lote y configuración seleccionada"
            ));
        }
        throw new RecursoNoEncontradoException(
                "No existe un ajuste vigente para el tipo de lote y configuración seleccionada"
        );
    }

    private ResultadoCalculo calcular(ContextoPrecio ctx) {
        BigDecimal precioBase = calcularPrecioBase(ctx.lote(), ctx.tarifa(), ctx.tipoTarifa());
        BigDecimal montoAjuste = calcularMontoAjuste(precioBase, ctx.tipoAjustePrecio(), ctx.ajuste());
        BigDecimal precioFinal = precioBase.add(montoAjuste).setScale(2, RoundingMode.HALF_UP);
        BigDecimal areaM2Aplicada = "POR_M2".equals(ctx.tipoTarifa().getCodigo()) ? ctx.lote().getAreaM2() : null;
        BigDecimal valorTarifaAplicado = ctx.tarifa().getValor();
        BigDecimal valorAjusteAplicado = ctx.ajuste() != null ? ctx.ajuste().getValor() : null;

        return new ResultadoCalculo(
                areaM2Aplicada, valorTarifaAplicado, precioBase,
                valorAjusteAplicado, montoAjuste, precioFinal
        );
    }

    private BigDecimal calcularPrecioBase(Lote lote, TarifaZonaEtapa tarifa, TipoTarifa tipoTarifa) {
        if ("POR_M2".equals(tipoTarifa.getCodigo())) {
            return lote.getAreaM2()
                    .multiply(tarifa.getValor())
                    .setScale(2, RoundingMode.HALF_UP);
        }
        if ("MONTO_FIJO".equals(tipoTarifa.getCodigo())) {
            return tarifa.getValor().setScale(2, RoundingMode.HALF_UP);
        }
        throw new ReglaNegocioException("Tipo de tarifa no soportado: " + tipoTarifa.getCodigo());
    }

    private BigDecimal calcularMontoAjuste(BigDecimal precioBase, TipoAjustePrecio tipo, AjusteTipoLote ajuste) {
        if (ajuste == null || tipo == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if ("PORCENTAJE".equals(tipo.getCodigo())) {
            return precioBase
                    .multiply(ajuste.getValor().movePointLeft(2))
                    .setScale(2, RoundingMode.HALF_UP);
        }
        if ("MONTO_FIJO".equals(tipo.getCodigo())) {
            return ajuste.getValor().setScale(2, RoundingMode.HALF_UP);
        }
        throw new ReglaNegocioException("Tipo de ajuste no soportado: " + tipo.getCodigo());
    }

    private void cerrarPrecioVigente(Long idLote, Integer idMoneda, OffsetDateTime ahora) {
        lotePrecioRepository.buscarVigente(idLote, idMoneda).ifPresent(precioAnterior -> {
            precioAnterior.setFechaHasta(ahora);
            precioAnterior.setActivo(false);
            lotePrecioRepository.save(precioAnterior);
            lotePrecioRepository.flush();
        });
    }

    private LotePrecio construirPrecio(
            ContextoPrecio ctx, ResultadoCalculo resultado, String observaciones, OffsetDateTime ahora
    ) {
        LotePrecio p = new LotePrecio();
        p.setLote(ctx.lote());
        p.setMoneda(ctx.moneda());
        p.setTarifa(ctx.tarifa());
        p.setAjusteTipoLote(ctx.ajuste());
        p.setAreaM2Aplicada(resultado.areaM2Aplicada());
        p.setValorTarifaAplicado(resultado.valorTarifaAplicado());
        p.setPrecioBase(resultado.precioBase());
        p.setValorAjusteAplicado(resultado.valorAjusteAplicado());
        p.setMontoAjuste(resultado.montoAjuste());
        p.setPrecio(resultado.precioFinal());
        p.setFechaDesde(ahora);
        p.setFechaHasta(null);
        p.setObservaciones(normalizarTexto(observaciones));
        p.setActivo(true);
        return p;
    }

    private LotePrecioResponse toResponse(LotePrecio p) {
        Lote lote = p.getLote();
        Moneda moneda = p.getMoneda();
        TarifaZonaEtapa tarifa = p.getTarifa();
        AjusteTipoLote ajuste = p.getAjusteTipoLote();
        Zona zona = tarifa != null
                ? tarifa.getZona()
                : (lote != null ? lote.getZona() : null);
        EtapaComercial etapaComercial = tarifa != null ? tarifa.getEtapaComercial() : null;
        TipoTarifa tipoTarifa = tarifa != null ? tarifa.getTipoTarifa() : null;
        TipoAjustePrecio tipoAjuste = ajuste != null ? ajuste.getTipoAjustePrecio() : null;
        Proyecto proyecto = resolverProyectoResponse(lote, tarifa);

        return new LotePrecioResponse(
                p.getIdLotePrecio(),
                lote != null ? lote.getIdLote() : null,
                lote != null ? lote.getCodigo() : null,
                lote != null ? lote.getNumero() : null,
                proyecto != null ? proyecto.getIdProyecto() : null,
                proyecto != null ? proyecto.getCodigo() : null,
                proyecto != null ? proyecto.getNombre() : null,
                zona != null ? zona.getIdZona() : null,
                zona != null ? zona.getCodigo() : null,
                zona != null ? zona.getNombre() : null,
                etapaComercial != null ? etapaComercial.getIdEtapaComercial() : null,
                etapaComercial != null ? etapaComercial.getCodigo() : null,
                etapaComercial != null ? etapaComercial.getNombre() : null,
                moneda != null ? moneda.getIdMoneda() : null,
                moneda != null ? moneda.getCodigo() : null,
                moneda != null ? moneda.getNombre() : null,
                tarifa != null ? tarifa.getIdTarifa() : null,
                tipoTarifa != null ? tipoTarifa.getIdTipoTarifa() : null,
                tipoTarifa != null ? tipoTarifa.getCodigo() : null,
                tipoTarifa != null ? tipoTarifa.getNombre() : null,
                p.getAreaM2Aplicada(),
                p.getValorTarifaAplicado(),
                p.getPrecioBase(),
                ajuste != null ? ajuste.getIdAjusteTipoLote() : null,
                tipoAjuste != null ? tipoAjuste.getIdTipoAjustePrecio() : null,
                tipoAjuste != null ? tipoAjuste.getCodigo() : null,
                tipoAjuste != null ? tipoAjuste.getNombre() : null,
                p.getValorAjusteAplicado(),
                p.getMontoAjuste(),
                p.getPrecio(),
                p.getFechaDesde(),
                p.getFechaHasta(),
                p.getObservaciones(),
                p.getActivo()
        );
    }

    private Proyecto resolverProyectoResponse(Lote lote, TarifaZonaEtapa tarifa) {
        if (tarifa != null && tarifa.getProyecto() != null) {
            return tarifa.getProyecto();
        }
        if (lote != null && lote.getManzana() != null && lote.getManzana().getEtapa() != null) {
            return lote.getManzana().getEtapa().getProyecto();
        }
        return null;
    }

    private String normalizarCodigo(String valor) {
        return valor != null ? valor.trim().toUpperCase(Locale.ROOT) : null;
    }

    private String normalizarTexto(String valor) {
        return valor != null ? valor.trim() : null;
    }
}

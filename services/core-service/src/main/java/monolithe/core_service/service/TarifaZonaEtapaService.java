package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.TarifaZonaEtapaRequest;
import monolithe.core_service.dto.TarifaZonaEtapaResponse;
import monolithe.core_service.entity.*;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class TarifaZonaEtapaService {

    private final TarifaZonaEtapaRepository tarifaZonaEtapaRepository;
    private final ProyectoRepository proyectoRepository;
    private final ZonaRepository zonaRepository;
    private final EtapaComercialRepository etapaComercialRepository;
    private final MonedaRepository monedaRepository;
    private final TipoTarifaRepository tipoTarifaRepository;

    private record ContextoTarifa(
            Proyecto proyecto,
            Zona zona,
            EtapaComercial etapaComercial,
            Moneda moneda,
            TipoTarifa tipoTarifa
    ) {
    }

    @Transactional(readOnly = true)
    public List<TarifaZonaEtapaResponse> listarPorProyecto(Long idProyecto) {
        obtenerProyecto(idProyecto);
        return tarifaZonaEtapaRepository
                .findByProyecto_IdProyectoOrderByFechaDesdeDesc(idProyecto)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TarifaZonaEtapaResponse> listarActivasPorProyecto(Long idProyecto) {
        obtenerProyecto(idProyecto);
        return tarifaZonaEtapaRepository
                .findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(idProyecto)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TarifaZonaEtapaResponse obtenerPorId(Long idTarifa) {
        return toResponse(obtenerTarifa(idTarifa));
    }

    @Transactional
    public TarifaZonaEtapaResponse registrar(TarifaZonaEtapaRequest request) {
        ContextoTarifa ctx = resolverContexto(request);
        OffsetDateTime ahora = OffsetDateTime.now(ZoneOffset.UTC);

        cerrarTarifaVigente(
                ctx.proyecto().getIdProyecto(),
                ctx.zona().getIdZona(),
                ctx.etapaComercial().getIdEtapaComercial(),
                ctx.moneda().getIdMoneda(),
                ctx.tipoTarifa().getIdTipoTarifa(),
                ahora
        );

        TarifaZonaEtapa nuevaTarifa = construirTarifa(ctx, request, ahora);
        TarifaZonaEtapa guardada = tarifaZonaEtapaRepository.save(nuevaTarifa);

        return toResponse(guardada);
    }

    @Transactional
    public void desactivar(Long idTarifa) {
        TarifaZonaEtapa tarifa = obtenerTarifa(idTarifa);
        if (Boolean.TRUE.equals(tarifa.getActivo())) {
            tarifa.setFechaHasta(OffsetDateTime.now(ZoneOffset.UTC));
            tarifa.setActivo(false);
            tarifaZonaEtapaRepository.save(tarifa);
        }
    }

    private ContextoTarifa resolverContexto(TarifaZonaEtapaRequest request) {
        Proyecto proyecto = obtenerProyectoActivo(request.idProyecto());
        Zona zona = obtenerZonaActiva(request.idZona(), proyecto.getIdProyecto());
        EtapaComercial etapa = obtenerEtapaComercialActiva(request.idEtapaComercial(), proyecto.getIdProyecto());
        Moneda moneda = obtenerMonedaActiva(normalizarCodigo(request.codigoMoneda()));
        TipoTarifa tipoTarifa = obtenerTipoTarifaActivo(normalizarCodigo(request.codigoTipoTarifa()));

        return new ContextoTarifa(proyecto, zona, etapa, moneda, tipoTarifa);
    }

    private TarifaZonaEtapa obtenerTarifa(Long idTarifa) {
        return tarifaZonaEtapaRepository.findById(idTarifa)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Tarifa no encontrada con id: " + idTarifa
                ));
    }

    private Proyecto obtenerProyecto(Long idProyecto) {
        return proyectoRepository.findById(idProyecto)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Proyecto no encontrado con id: " + idProyecto
                ));
    }

    private Proyecto obtenerProyectoActivo(Long idProyecto) {
        Proyecto proyecto = obtenerProyecto(idProyecto);
        if (!Boolean.TRUE.equals(proyecto.getActivo())) {
            throw new ReglaNegocioException("El proyecto no está activo: " + idProyecto);
        }
        return proyecto;
    }

    private Zona obtenerZonaActiva(Long idZona, Long idProyecto) {
        Zona zona = zonaRepository.findById(idZona)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Zona no encontrada con id: " + idZona
                ));
        if (!Boolean.TRUE.equals(zona.getActivo())) {
            throw new ReglaNegocioException("La zona no está activa: " + idZona);
        }
        if (zona.getProyecto() == null || !zona.getProyecto().getIdProyecto().equals(idProyecto)) {
            throw new ReglaNegocioException("La zona no pertenece al proyecto seleccionado");
        }
        return zona;
    }

    private EtapaComercial obtenerEtapaComercialActiva(Long idEtapaComercial, Long idProyecto) {
        EtapaComercial etapa = etapaComercialRepository.findById(idEtapaComercial)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Etapa comercial no encontrada con id: " + idEtapaComercial
                ));
        if (!Boolean.TRUE.equals(etapa.getActivo())) {
            throw new ReglaNegocioException("La etapa comercial no está activa: " + idEtapaComercial);
        }
        if (etapa.getProyecto() == null || !etapa.getProyecto().getIdProyecto().equals(idProyecto)) {
            throw new ReglaNegocioException("La etapa comercial no pertenece al proyecto seleccionado");
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
            throw new ReglaNegocioException("Tipo de tarifa no soportado: " + codigoTipoTarifa);
        }
        return tipo;
    }

    private void cerrarTarifaVigente(
            Long idProyecto, Long idZona, Long idEtapaComercial,
            Integer idMoneda, Integer idTipoTarifa, OffsetDateTime ahora
    ) {
        tarifaZonaEtapaRepository.buscarVigente(
                idProyecto, idZona, idEtapaComercial, idMoneda, idTipoTarifa
        ).ifPresent(tarifaAnterior -> {
            tarifaAnterior.setFechaHasta(ahora);
            tarifaAnterior.setActivo(false);
            tarifaZonaEtapaRepository.save(tarifaAnterior);
            tarifaZonaEtapaRepository.flush();
        });
    }

    private TarifaZonaEtapa construirTarifa(
            ContextoTarifa ctx, TarifaZonaEtapaRequest request, OffsetDateTime ahora
    ) {
        TarifaZonaEtapa t = new TarifaZonaEtapa();
        t.setProyecto(ctx.proyecto());
        t.setZona(ctx.zona());
        t.setEtapaComercial(ctx.etapaComercial());
        t.setMoneda(ctx.moneda());
        t.setTipoTarifa(ctx.tipoTarifa());
        t.setValor(request.valor().setScale(4, RoundingMode.HALF_UP));
        t.setFechaDesde(ahora);
        t.setFechaHasta(null);
        t.setObservaciones(normalizarTexto(request.observaciones()));
        t.setActivo(true);
        return t;
    }

    private TarifaZonaEtapaResponse toResponse(TarifaZonaEtapa tarifa) {
        Proyecto p = tarifa.getProyecto();
        Zona z = tarifa.getZona();
        EtapaComercial ec = tarifa.getEtapaComercial();
        Moneda m = tarifa.getMoneda();
        TipoTarifa tt = tarifa.getTipoTarifa();

        return new TarifaZonaEtapaResponse(
                tarifa.getIdTarifa(),
                p != null ? p.getIdProyecto() : null,
                p != null ? p.getCodigo() : null,
                p != null ? p.getNombre() : null,
                z != null ? z.getIdZona() : null,
                z != null ? z.getCodigo() : null,
                z != null ? z.getNombre() : null,
                ec != null ? ec.getIdEtapaComercial() : null,
                ec != null ? ec.getCodigo() : null,
                ec != null ? ec.getNombre() : null,
                m != null ? m.getIdMoneda() : null,
                m != null ? m.getCodigo() : null,
                m != null ? m.getNombre() : null,
                tt != null ? tt.getIdTipoTarifa() : null,
                tt != null ? tt.getCodigo() : null,
                tt != null ? tt.getNombre() : null,
                tarifa.getValor(),
                tarifa.getFechaDesde(),
                tarifa.getFechaHasta(),
                tarifa.getObservaciones(),
                tarifa.getActivo()
        );
    }

    private String normalizarCodigo(String valor) {
        return valor != null ? valor.trim().toUpperCase(Locale.ROOT) : null;
    }

    private String normalizarTexto(String valor) {
        return valor != null ? valor.trim() : null;
    }
}

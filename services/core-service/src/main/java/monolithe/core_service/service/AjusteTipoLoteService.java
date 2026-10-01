package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.AjusteTipoLoteRequest;
import monolithe.core_service.dto.AjusteTipoLoteResponse;
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
public class AjusteTipoLoteService {

    private final AjusteTipoLoteRepository ajusteTipoLoteRepository;
    private final ProyectoRepository proyectoRepository;
    private final TipoLoteRepository tipoLoteRepository;
    private final TipoAjustePrecioRepository tipoAjustePrecioRepository;
    private final MonedaRepository monedaRepository;

    private record ContextoAjuste(
            Proyecto proyecto,
            TipoLote tipoLote,
            TipoAjustePrecio tipoAjustePrecio,
            Moneda moneda
    ) {
    }

    @Transactional(readOnly = true)
    public List<AjusteTipoLoteResponse> listarPorProyecto(Long idProyecto) {
        obtenerProyecto(idProyecto);
        return ajusteTipoLoteRepository
                .findByProyecto_IdProyectoOrderByFechaDesdeDesc(idProyecto)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AjusteTipoLoteResponse> listarActivosPorProyecto(Long idProyecto) {
        obtenerProyecto(idProyecto);
        return ajusteTipoLoteRepository
                .findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(idProyecto)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AjusteTipoLoteResponse obtenerPorId(Long idAjusteTipoLote) {
        return toResponse(obtenerAjuste(idAjusteTipoLote));
    }

    @Transactional
    public AjusteTipoLoteResponse registrar(AjusteTipoLoteRequest request) {
        ContextoAjuste ctx = resolverContexto(request);
        OffsetDateTime ahora = OffsetDateTime.now(ZoneOffset.UTC);

        cerrarAjusteVigente(ctx, ahora);

        AjusteTipoLote nuevoAjuste = construirAjuste(ctx, request, ahora);
        AjusteTipoLote guardado = ajusteTipoLoteRepository.save(nuevoAjuste);

        return toResponse(guardado);
    }

    @Transactional
    public void desactivar(Long idAjusteTipoLote) {
        AjusteTipoLote ajuste = obtenerAjuste(idAjusteTipoLote);
        if (Boolean.TRUE.equals(ajuste.getActivo())) {
            ajuste.setFechaHasta(OffsetDateTime.now(ZoneOffset.UTC));
            ajuste.setActivo(false);
            ajusteTipoLoteRepository.save(ajuste);
        }
    }

    private ContextoAjuste resolverContexto(AjusteTipoLoteRequest request) {
        Proyecto proyecto = obtenerProyectoActivo(request.idProyecto());
        TipoLote tipoLote = obtenerTipoLoteActivo(normalizarCodigo(request.codigoTipoLote()));
        TipoAjustePrecio tipoAjuste = obtenerTipoAjusteActivo(normalizarCodigo(request.codigoTipoAjustePrecio()));
        Moneda moneda = resolverMoneda(normalizarCodigo(request.codigoMoneda()), tipoAjuste);

        return new ContextoAjuste(proyecto, tipoLote, tipoAjuste, moneda);
    }

    private AjusteTipoLote obtenerAjuste(Long idAjusteTipoLote) {
        return ajusteTipoLoteRepository.findById(idAjusteTipoLote)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Ajuste por tipo de lote no encontrado con id: " + idAjusteTipoLote
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

    private TipoLote obtenerTipoLoteActivo(String codigoTipoLote) {
        TipoLote tipo = tipoLoteRepository.findByCodigo(codigoTipoLote)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Tipo de lote no encontrado con código: " + codigoTipoLote
                ));
        if (!Boolean.TRUE.equals(tipo.getActivo())) {
            throw new ReglaNegocioException("El tipo de lote no está activo: " + codigoTipoLote);
        }
        return tipo;
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
            throw new ReglaNegocioException("Tipo de ajuste no soportado: " + codigoTipoAjuste);
        }
        return tipo;
    }

    private Moneda resolverMoneda(String codigoMoneda, TipoAjustePrecio tipoAjuste) {
        if (codigoMoneda == null || codigoMoneda.isEmpty()) {
            if ("MONTO_FIJO".equals(tipoAjuste.getCodigo())) {
                throw new ReglaNegocioException("Un ajuste de monto fijo debe tener una moneda asociada");
            }
            return null;
        }
        Moneda moneda = monedaRepository.findByCodigo(codigoMoneda)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Moneda no encontrada con código: " + codigoMoneda
                ));
        if (!Boolean.TRUE.equals(moneda.getActivo())) {
            throw new ReglaNegocioException("La moneda no está activa: " + codigoMoneda);
        }
        return moneda;
    }

    private void cerrarAjusteVigente(ContextoAjuste ctx, OffsetDateTime ahora) {
        Long idProyecto = ctx.proyecto().getIdProyecto();
        Integer idTipoLote = ctx.tipoLote().getIdTipoLote();
        Integer idTipoAjuste = ctx.tipoAjustePrecio().getIdTipoAjustePrecio();

        if (ctx.moneda() != null) {
            ajusteTipoLoteRepository.buscarVigente(idProyecto, idTipoLote, idTipoAjuste, ctx.moneda().getIdMoneda())
                    .ifPresent(anterior -> aplicarCierre(anterior, ahora));
        } else {
            ajusteTipoLoteRepository.buscarVigenteSinMoneda(idProyecto, idTipoLote, idTipoAjuste)
                    .ifPresent(anterior -> aplicarCierre(anterior, ahora));
        }
    }

    private void aplicarCierre(AjusteTipoLote anterior, OffsetDateTime ahora) {
        anterior.setFechaHasta(ahora);
        anterior.setActivo(false);
        ajusteTipoLoteRepository.save(anterior);
        ajusteTipoLoteRepository.flush();
    }

    private AjusteTipoLote construirAjuste(
            ContextoAjuste ctx, AjusteTipoLoteRequest request, OffsetDateTime ahora
    ) {
        AjusteTipoLote a = new AjusteTipoLote();
        a.setProyecto(ctx.proyecto());
        a.setTipoLote(ctx.tipoLote());
        a.setTipoAjustePrecio(ctx.tipoAjustePrecio());
        a.setMoneda(ctx.moneda());
        a.setValor(request.valor().setScale(4, RoundingMode.HALF_UP));
        a.setFechaDesde(ahora);
        a.setFechaHasta(null);
        a.setObservaciones(normalizarTexto(request.observaciones()));
        a.setActivo(true);
        return a;
    }

    private AjusteTipoLoteResponse toResponse(AjusteTipoLote ajuste) {
        Proyecto p = ajuste.getProyecto();
        TipoLote tl = ajuste.getTipoLote();
        TipoAjustePrecio ta = ajuste.getTipoAjustePrecio();
        Moneda m = ajuste.getMoneda();

        return new AjusteTipoLoteResponse(
                ajuste.getIdAjusteTipoLote(),
                p != null ? p.getIdProyecto() : null,
                p != null ? p.getCodigo() : null,
                p != null ? p.getNombre() : null,
                tl != null ? tl.getIdTipoLote() : null,
                tl != null ? tl.getCodigo() : null,
                tl != null ? tl.getNombre() : null,
                ta != null ? ta.getIdTipoAjustePrecio() : null,
                ta != null ? ta.getCodigo() : null,
                ta != null ? ta.getNombre() : null,
                m != null ? m.getIdMoneda() : null,
                m != null ? m.getCodigo() : null,
                m != null ? m.getNombre() : null,
                ajuste.getValor(),
                ajuste.getFechaDesde(),
                ajuste.getFechaHasta(),
                ajuste.getObservaciones(),
                ajuste.getActivo()
        );
    }

    private String normalizarCodigo(String valor) {
        return valor != null ? valor.trim().toUpperCase(Locale.ROOT) : null;
    }

    private String normalizarTexto(String valor) {
        return valor != null ? valor.trim() : null;
    }
}

package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.LoteRequest;
import monolithe.core_service.dto.LoteResponse;
import monolithe.core_service.entity.*;
import monolithe.core_service.exception.ConflictoNegocioException;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import monolithe.core_service.dto.LoteFiltroRequest;
import monolithe.core_service.specification.LoteSpecification;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class LoteService {

    private final LoteRepository loteRepository;
    private final ManzanaRepository manzanaRepository;
    private final ZonaRepository zonaRepository;
    private final EstadoLoteRepository estadoLoteRepository;
    private final TipoLoteRepository tipoLoteRepository;

    @Transactional(readOnly = true)
    public List<LoteResponse> listarPorManzana(Long idManzana) {
        obtenerManzana(idManzana);
        return loteRepository.findByManzana_IdManzanaOrderByNumeroAsc(idManzana)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LoteResponse> listarActivosPorManzana(Long idManzana) {
        obtenerManzana(idManzana);
        return loteRepository.findByManzana_IdManzanaAndActivoTrueOrderByNumeroAsc(idManzana)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LoteResponse obtenerPorId(Long idLote) {
        return toResponse(obtenerLote(idLote));
    }

    @Transactional(readOnly = true)
    public List<LoteResponse> buscar(LoteFiltroRequest filtro) {

        validarRangoArea(filtro);

        return loteRepository.findAll(
                LoteSpecification.conFiltros(filtro),
                Sort.by(Sort.Direction.ASC, "codigo"))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LoteResponse crear(LoteRequest request) {
        Manzana manzana = obtenerManzanaActiva(request.idManzana());
        Long idProyecto = manzana.getEtapa().getProyecto().getIdProyecto();
        Zona zona = resolverZonaValida(request.idZona(), idProyecto);
        TipoLote tipo = obtenerTipoActivo(request.codigoTipoLote());
        EstadoLote estado = obtenerEstadoActivo(request.codigoEstadoLote());
        validarEstadoInicial(estado);

        String codigo = normalizarCodigo(request.codigo());
        String numero = normalizarCodigo(request.numero());
        String observaciones = normalizarTexto(request.observaciones());

        validarUnicidadCrear(manzana.getIdManzana(), codigo, numero);

        Lote lote = new Lote();
        asignarValoresLote(lote, manzana, zona, idProyecto, tipo, estado, codigo, numero, observaciones, request);
        lote.setActivo(request.activo() != null ? request.activo() : Boolean.TRUE);

        return toResponse(loteRepository.save(lote));
    }

    @Transactional
    public LoteResponse actualizar(Long idLote, LoteRequest request) {
        Lote lote = obtenerLote(idLote);
        Manzana manzanaDestino = obtenerManzanaActiva(request.idManzana());
        Long idProyectoDestino = manzanaDestino.getEtapa().getProyecto().getIdProyecto();

        if (!lote.getIdProyecto().equals(idProyectoDestino)) {
            throw new ReglaNegocioException("No se puede cambiar un lote a una manzana de otro proyecto");
        }

        Zona zona = resolverZonaValida(request.idZona(), idProyectoDestino);
        TipoLote tipo = obtenerTipoActivo(request.codigoTipoLote());

        EstadoLote estadoActual = lote.getEstadoLote();
        String codigoEstadoSolicitado = normalizarCodigo(request.codigoEstadoLote());

        if (estadoActual != null && !estadoActual.getCodigo().equals(codigoEstadoSolicitado)) {
            throw new ReglaNegocioException(
                    "El estado del lote no puede modificarse mediante la edición general. Utilice el cambio de estado del lote.");
        }

        String codigo = normalizarCodigo(request.codigo());
        String numero = normalizarCodigo(request.numero());
        String observaciones = normalizarTexto(request.observaciones());

        validarUnicidadActualizar(manzanaDestino.getIdManzana(), idLote, codigo, numero);

        asignarValoresLote(lote, manzanaDestino, zona, lote.getIdProyecto(), tipo, estadoActual, codigo, numero,
                observaciones, request);
        if (request.activo() != null) {

            if (Boolean.TRUE.equals(lote.getActivo())
                    && Boolean.FALSE.equals(request.activo())) {
                validarDesactivacionLote(lote);
            }

            lote.setActivo(request.activo());
        }

        return toResponse(loteRepository.save(lote));
    }

    @Transactional
    public void desactivar(Long idLote) {
        Lote lote = obtenerLote(idLote);

        if (Boolean.TRUE.equals(lote.getActivo())) {
            validarDesactivacionLote(lote);

            lote.setActivo(false);
            loteRepository.save(lote);
        }
    }

    private void validarRangoArea(LoteFiltroRequest filtro) {

        if (filtro.areaMin() != null
                && filtro.areaMax() != null
                && filtro.areaMin().compareTo(filtro.areaMax()) > 0) {

            throw new ReglaNegocioException(
                    "El área mínima no puede ser mayor que el área máxima");
        }
    }

    private void validarEstadoInicial(EstadoLote estado) {
        if (estado == null)
            return;
        String codigo = estado.getCodigo();
        if ("RESERVADO".equals(codigo) || "VENDIDO".equals(codigo)) {
            throw new ReglaNegocioException(
                    "Un lote nuevo no puede crearse directamente en estado RESERVADO o VENDIDO");
        }
    }

    private void validarDesactivacionLote(Lote lote) {
        if (lote.getEstadoLote() == null) {
            return;
        }

        String codigoEstado = lote.getEstadoLote().getCodigo();

        if ("RESERVADO".equals(codigoEstado)) {
            throw new ReglaNegocioException(
                    "No se puede desactivar un lote con una reserva vigente");
        }

        if ("VENDIDO".equals(codigoEstado)) {
            throw new ReglaNegocioException(
                    "No se puede desactivar un lote vendido");
        }
    }

    private Manzana obtenerManzana(Long idManzana) {
        return manzanaRepository.findById(idManzana)
                .orElseThrow(() -> new RecursoNoEncontradoException("Manzana no encontrada con id: " + idManzana));
    }

    private Manzana obtenerManzanaActiva(Long idManzana) {
        Manzana manzana = obtenerManzana(idManzana);
        validarJerarquiaManzanaActiva(manzana);
        return manzana;
    }

    private void validarJerarquiaManzanaActiva(Manzana manzana) {
        if (!Boolean.TRUE.equals(manzana.getActivo())) {
            throw new ReglaNegocioException("La manzana no está activa: " + manzana.getIdManzana());
        }
        if (manzana.getEtapa() == null) {
            throw new ReglaNegocioException("La manzana no tiene una etapa asociada: " + manzana.getIdManzana());
        }
        if (!Boolean.TRUE.equals(manzana.getEtapa().getActivo())) {
            throw new ReglaNegocioException(
                    "La etapa de la manzana no está activa: " + manzana.getEtapa().getIdEtapa());
        }
        if (manzana.getEtapa().getProyecto() == null) {
            throw new ReglaNegocioException("La manzana no tiene un proyecto asociado: " + manzana.getIdManzana());
        }
        if (!Boolean.TRUE.equals(manzana.getEtapa().getProyecto().getActivo())) {
            throw new ReglaNegocioException(
                    "El proyecto de la manzana no está activo: " + manzana.getEtapa().getProyecto().getIdProyecto());
        }
    }

    private Lote obtenerLote(Long idLote) {
        return loteRepository.findById(idLote)
                .orElseThrow(() -> new RecursoNoEncontradoException("Lote no encontrado con id: " + idLote));
    }

    private String normalizarCodigo(String valor) {
        return valor != null ? valor.trim().toUpperCase(Locale.ROOT) : null;
    }

    private String normalizarTexto(String valor) {
        return valor != null ? valor.trim() : null;
    }

    private EstadoLote obtenerEstadoActivo(String codigo) {
        String codigoNormalizado = normalizarCodigo(codigo);
        EstadoLote estado = estadoLoteRepository.findByCodigo(codigoNormalizado)
                .orElseThrow(
                        () -> new RecursoNoEncontradoException("Estado de lote no encontrado: " + codigoNormalizado));
        if (!Boolean.TRUE.equals(estado.getActivo())) {
            throw new ReglaNegocioException("El estado de lote no está activo: " + codigoNormalizado);
        }
        return estado;
    }

    private TipoLote obtenerTipoActivo(String codigo) {
        if (codigo == null || codigo.trim().isEmpty()) {
            return null;
        }
        String codigoNormalizado = normalizarCodigo(codigo);
        TipoLote tipo = tipoLoteRepository.findByCodigo(codigoNormalizado)
                .orElseThrow(
                        () -> new RecursoNoEncontradoException("Tipo de lote no encontrado: " + codigoNormalizado));
        if (!Boolean.TRUE.equals(tipo.getActivo())) {
            throw new ReglaNegocioException("El tipo de lote no está activo: " + codigoNormalizado);
        }
        return tipo;
    }

    private Zona resolverZonaValida(Long idZona, Long idProyecto) {
        Zona zona = obtenerZonaActiva(idZona);
        validarZonaDelProyecto(zona, idProyecto);
        return zona;
    }

    private Zona obtenerZonaActiva(Long idZona) {
        if (idZona == null) {
            return null;
        }
        Zona zona = zonaRepository.findById(idZona)
                .orElseThrow(() -> new RecursoNoEncontradoException("Zona no encontrada con id: " + idZona));
        if (!Boolean.TRUE.equals(zona.getActivo())) {
            throw new ReglaNegocioException("La zona no está activa: " + idZona);
        }
        if (zona.getProyecto() == null) {
            throw new ReglaNegocioException("La zona no tiene un proyecto asociado: " + idZona);
        }
        return zona;
    }

    private void validarZonaDelProyecto(Zona zona, Long idProyecto) {
        if (zona != null && !idProyecto.equals(zona.getProyecto().getIdProyecto())) {
            throw new ReglaNegocioException("La zona seleccionada no pertenece al mismo proyecto que la manzana");
        }
    }

    private void validarUnicidadCrear(Long idManzana, String codigo, String numero) {
        if (loteRepository.existsByCodigo(codigo)) {
            throw new ConflictoNegocioException("Ya existe un lote con el código " + codigo);
        }
        if (loteRepository.existsByManzana_IdManzanaAndNumero(idManzana, numero)) {
            throw new ConflictoNegocioException("Ya existe el lote número " + numero + " en la manzana " + idManzana);
        }
    }

    private void validarUnicidadActualizar(Long idManzana, Long idLote, String codigo, String numero) {
        if (loteRepository.existsByCodigoAndIdLoteNot(codigo, idLote)) {
            throw new ConflictoNegocioException("Ya existe otro lote con el código " + codigo);
        }
        if (loteRepository.existsByManzana_IdManzanaAndNumeroAndIdLoteNot(idManzana, numero, idLote)) {
            throw new ConflictoNegocioException("Ya existe otro lote número " + numero + " en la manzana " + idManzana);
        }
    }

    private void asignarValoresLote(
            Lote lote,
            Manzana manzana,
            Zona zona,
            Long idProyecto,
            TipoLote tipo,
            EstadoLote estado,
            String codigo,
            String numero,
            String observaciones,
            LoteRequest req) {
        lote.setManzana(manzana);
        lote.setZona(zona);
        lote.setIdProyecto(idProyecto);
        lote.setTipoLote(tipo);
        lote.setEstadoLote(estado);
        lote.setCodigo(codigo);
        lote.setNumero(numero);
        lote.setAreaM2(req.areaM2());
        lote.setFrenteM(req.frenteM());
        lote.setFondoM(req.fondoM());
        lote.setLateralDerechoM(req.lateralDerechoM());
        lote.setLateralIzquierdoM(req.lateralIzquierdoM());
        lote.setObservaciones(observaciones);
    }

    private LoteResponse toResponse(Lote lote) {
        Manzana manzana = lote.getManzana();
        Etapa etapa = manzana != null ? manzana.getEtapa() : null;
        Proyecto proyecto = etapa != null ? etapa.getProyecto() : null;
        Zona zona = lote.getZona();
        TipoLote tipo = lote.getTipoLote();
        EstadoLote estado = lote.getEstadoLote();

        return new LoteResponse(
                lote.getIdLote(),
                lote.getIdProyecto(),
                proyecto != null ? proyecto.getCodigo() : null,
                proyecto != null ? proyecto.getNombre() : null,
                manzana != null ? manzana.getIdManzana() : null,
                manzana != null ? manzana.getCodigo() : null,
                manzana != null ? manzana.getNombre() : null,
                etapa != null ? etapa.getIdEtapa() : null,
                etapa != null ? etapa.getCodigo() : null,
                etapa != null ? etapa.getNombre() : null,
                zona != null ? zona.getIdZona() : null,
                zona != null ? zona.getCodigo() : null,
                zona != null ? zona.getNombre() : null,
                tipo != null ? tipo.getIdTipoLote() : null,
                tipo != null ? tipo.getCodigo() : null,
                tipo != null ? tipo.getNombre() : null,
                estado != null ? estado.getIdEstadoLote() : null,
                estado != null ? estado.getCodigo() : null,
                estado != null ? estado.getNombre() : null,
                lote.getCodigo(),
                lote.getNumero(),
                lote.getAreaM2(),
                lote.getFrenteM(),
                lote.getFondoM(),
                lote.getLateralDerechoM(),
                lote.getLateralIzquierdoM(),
                lote.getObservaciones(),
                lote.getActivo());
    }
}

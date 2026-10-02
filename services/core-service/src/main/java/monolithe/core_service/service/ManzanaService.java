package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ManzanaRequest;
import monolithe.core_service.dto.ManzanaResponse;
import monolithe.core_service.entity.EstadoManzana;
import monolithe.core_service.entity.Etapa;
import monolithe.core_service.entity.Manzana;
import monolithe.core_service.entity.Proyecto;
import monolithe.core_service.exception.ConflictoNegocioException;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.EstadoManzanaRepository;
import monolithe.core_service.repository.EtapaRepository;
import monolithe.core_service.repository.ManzanaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ManzanaService {

    private final ManzanaRepository manzanaRepository;
    private final EtapaRepository etapaRepository;
    private final EstadoManzanaRepository estadoManzanaRepository;

    @Transactional(readOnly = true)
    public List<ManzanaResponse> listarPorEtapa(Long idEtapa) {
        obtenerEtapa(idEtapa);
        return manzanaRepository.findByEtapa_IdEtapaOrderByNumeroOrdenAsc(idEtapa).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ManzanaResponse> listarActivasPorEtapa(Long idEtapa) {
        obtenerEtapa(idEtapa);
        return manzanaRepository.findByEtapa_IdEtapaAndActivoTrueOrderByNumeroOrdenAsc(idEtapa).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ManzanaResponse obtenerPorId(Long idManzana) {
        Manzana manzana = obtenerManzana(idManzana);
        return toResponse(manzana);
    }

    @Transactional
    public ManzanaResponse crear(ManzanaRequest request) {
        String codigo = normalizarCodigo(request.codigo());
        String nombre = normalizarTexto(request.nombre());
        String descripcion = normalizarTexto(request.descripcion());
        Etapa etapa = obtenerEtapaActiva(request.idEtapa());
        EstadoManzana estado = obtenerEstadoActivo(request.codigoEstadoManzana());

        if (manzanaRepository.existsByEtapa_IdEtapaAndCodigo(etapa.getIdEtapa(), codigo)) {
            throw new ConflictoNegocioException(
                    "Ya existe una manzana con el código " + codigo + " en la etapa " + etapa.getIdEtapa()
            );
        }

        Manzana m = new Manzana();
        m.setEtapa(etapa);
        m.setEstadoManzana(estado);
        m.setCodigo(codigo);
        m.setNombre(nombre);
        m.setDescripcion(descripcion);
        m.setNumeroOrden(request.numeroOrden() != null ? request.numeroOrden() : 1);
        m.setActivo(request.activo() != null ? request.activo() : true);

        Manzana guardada = manzanaRepository.save(m);
        return toResponse(guardada);
    }

    @Transactional
    public ManzanaResponse actualizar(Long idManzana, ManzanaRequest request) {
        Manzana m = obtenerManzana(idManzana);
        Etapa etapaDestino = obtenerEtapaActiva(request.idEtapa());

        Long idProyectoActual = m.getEtapa().getProyecto().getIdProyecto();
        Long idProyectoDestino = etapaDestino.getProyecto().getIdProyecto();

        if (!idProyectoActual.equals(idProyectoDestino)) {
            throw new ReglaNegocioException("No se puede cambiar una manzana a una etapa de otro proyecto");
        }

        String codigo = normalizarCodigo(request.codigo());
        String nombre = normalizarTexto(request.nombre());
        String descripcion = normalizarTexto(request.descripcion());
        EstadoManzana estado = obtenerEstadoActivo(request.codigoEstadoManzana());

        if (manzanaRepository.existsByEtapa_IdEtapaAndCodigoAndIdManzanaNot(etapaDestino.getIdEtapa(), codigo, idManzana)) {
            throw new ConflictoNegocioException(
                    "Ya existe otra manzana con el código " + codigo + " en la etapa " + etapaDestino.getIdEtapa()
            );
        }

        m.setEtapa(etapaDestino);
        m.setEstadoManzana(estado);
        m.setCodigo(codigo);
        m.setNombre(nombre);
        m.setDescripcion(descripcion);
        if (request.numeroOrden() != null) {
            m.setNumeroOrden(request.numeroOrden());
        }
        if (request.activo() != null) {
            m.setActivo(request.activo());
        }

        Manzana actualizada = manzanaRepository.save(m);
        return toResponse(actualizada);
    }

    @Transactional
    public void desactivar(Long idManzana) {
        Manzana m = obtenerManzana(idManzana);

        if (Boolean.TRUE.equals(m.getActivo())) {
            m.setActivo(false);
            manzanaRepository.save(m);
        }
    }

    private Etapa obtenerEtapa(Long idEtapa) {
        return etapaRepository.findById(idEtapa)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Etapa no encontrada con id: " + idEtapa));
    }

    private Etapa obtenerEtapaActiva(Long idEtapa) {
        Etapa etapa = obtenerEtapa(idEtapa);
        if (!Boolean.TRUE.equals(etapa.getActivo())) {
            throw new ReglaNegocioException("La etapa no está activa: " + idEtapa);
        }
        if (etapa.getProyecto() == null || !Boolean.TRUE.equals(etapa.getProyecto().getActivo())) {
            Long idProyecto = etapa.getProyecto() != null ? etapa.getProyecto().getIdProyecto() : null;
            throw new ReglaNegocioException("El proyecto de la etapa no está activo: " + idProyecto);
        }
        return etapa;
    }

    private Manzana obtenerManzana(Long idManzana) {
        return manzanaRepository.findById(idManzana)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Manzana no encontrada con id: " + idManzana));
    }

    private EstadoManzana obtenerEstadoActivo(String codigoEstadoManzana) {
        String codigoNormalizado = normalizarCodigo(codigoEstadoManzana);
        EstadoManzana estado = estadoManzanaRepository.findByCodigo(codigoNormalizado)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Estado de manzana no encontrado: " + codigoNormalizado));
        if (!Boolean.TRUE.equals(estado.getActivo())) {
            throw new ReglaNegocioException("El estado de manzana no está activo: " + codigoNormalizado);
        }
        return estado;
    }

    private String normalizarCodigo(String codigo) {
        return codigo != null ? codigo.trim().toUpperCase(Locale.ROOT) : null;
    }

    private String normalizarTexto(String texto) {
        return texto != null ? texto.trim() : null;
    }

    private ManzanaResponse toResponse(Manzana manzana) {
        Etapa etapa = manzana.getEtapa();
        Proyecto proyecto = etapa != null ? etapa.getProyecto() : null;
        EstadoManzana estado = manzana.getEstadoManzana();

        return new ManzanaResponse(
                manzana.getIdManzana(),
                etapa != null ? etapa.getIdEtapa() : null,
                etapa != null ? etapa.getCodigo() : null,
                etapa != null ? etapa.getNombre() : null,
                proyecto != null ? proyecto.getIdProyecto() : null,
                proyecto != null ? proyecto.getCodigo() : null,
                proyecto != null ? proyecto.getNombre() : null,
                estado != null ? estado.getIdEstadoManzana() : null,
                estado != null ? estado.getCodigo() : null,
                estado != null ? estado.getNombre() : null,
                manzana.getCodigo(),
                manzana.getNombre(),
                manzana.getDescripcion(),
                manzana.getNumeroOrden(),
                manzana.getActivo()
        );
    }
}

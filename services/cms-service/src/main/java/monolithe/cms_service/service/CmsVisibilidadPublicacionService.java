package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.ProyectoVisibilidadCmsResponse;
import monolithe.cms_service.entity.CmsBorrador;
import monolithe.cms_service.entity.CmsProyectoVisibilidad;
import monolithe.cms_service.entity.CmsPublicacionVersion;
import monolithe.cms_service.entity.CmsVisibilidadHistorial;
import monolithe.cms_service.entity.EstadoBorrador;
import monolithe.cms_service.entity.Proyecto;
import monolithe.cms_service.entity.TipoObjetivoBorrador;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.CmsBorradorRepository;
import monolithe.cms_service.repository.CmsProyectoVisibilidadRepository;
import monolithe.cms_service.repository.CmsPublicacionVersionRepository;
import monolithe.cms_service.repository.CmsVisibilidadHistorialRepository;
import monolithe.cms_service.repository.ProyectoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

/** Publica exclusivamente visibilidad, nunca especificaciones oficiales de proyectos. */
@Service
@RequiredArgsConstructor
public class CmsVisibilidadPublicacionService {
    private final CmsBorradorRepository borradorRepository;
    private final ProyectoRepository proyectoRepository;
    private final CmsProyectoVisibilidadRepository visibilidadRepository;
    private final CmsPublicacionVersionRepository versionRepository;
    private final CmsVisibilidadHistorialRepository historialRepository;

    // Defensa independiente del flag del navegador: cerrado hasta migración SQL y despliegue validados.
    @Value("${CMS_PUBLICACION_VISIBILIDAD_ENABLED:false}")
    private boolean publicacionHabilitada;

    @PreAuthorize("hasAuthority('web_content.projects_visibility')")
    @Transactional(readOnly = true)
    public List<ProyectoVisibilidadCmsResponse> listarAdministrables() {
        return proyectoRepository.findByActivoTrueOrderByNombreAsc().stream()
                .map(p -> new ProyectoVisibilidadCmsResponse(
                        p.getIdProyecto(), p.getCodigo(), p.getNombre(),
                        visibilidadRepository.findById(p.getIdProyecto())
                                .map(v -> Boolean.TRUE.equals(v.getVisiblePublico())).orElse(false),
                        versionRepository.findByIdProyecto(p.getIdProyecto())
                                .map(v -> v.getRevision()).orElse(0L)))
                .toList();
    }

    @PreAuthorize("hasAuthority('web_content.projects_visibility') and hasAuthority('web_content.publish')")
    @Transactional
    public CmsVisibilidadHistorial publicar(Long idBorrador, Long revisionEditorialEsperada,
                                            Long revisionPublicadaEsperada, Long idUsuario) {
        if (!publicacionHabilitada) {
            throw new ConflictException("La publicación de visibilidad aún no está habilitada");
        }
        if (idBorrador == null || idBorrador <= 0 || idUsuario == null || idUsuario <= 0
                || revisionEditorialEsperada == null || revisionEditorialEsperada < 1
                || revisionPublicadaEsperada == null || revisionPublicadaEsperada < 0) {
            throw new IllegalArgumentException("Borrador, usuario y revisiones válidas son obligatorios");
        }
        // Bloqueo único: borrador propio -> fila de visibilidad -> versión del proyecto.
        CmsBorrador borrador = borradorRepository
                .findWithLockByIdBorradorAndIdUsuarioRegistro(idBorrador, idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Borrador no encontrado"));
        if (borrador.getTipoObjetivo() != TipoObjetivoBorrador.VISIBILIDAD_PROYECTO
                || borrador.getEstado() != EstadoBorrador.EN_EDICION) {
            throw new ConflictException("El borrador no es de visibilidad en edición");
        }
        if (!revisionEditorialEsperada.equals(borrador.getRevisionEdicion())) {
            throw new ConflictException("La revisión editorial del borrador cambió");
        }
        Map<String, Object> pendiente = borrador.getContenidoPendiente();
        if (pendiente == null || pendiente.size() != 1
                || !(pendiente.get("visible_publico") instanceof Boolean nuevo)) {
            throw new IllegalArgumentException("El borrador contiene campos de visibilidad inválidos");
        }
        Long idProyecto = borrador.getIdProyecto();
        Proyecto proyecto = proyectoRepository.findById(idProyecto)
                .filter(p -> Boolean.TRUE.equals(p.getActivo()))
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto oficial activo no encontrado"));

        // Si no existe, la fila comienza oculta. ON CONFLICT serializa creaciones
        // concurrentes, y FOR UPDATE serializa publicaciones del mismo proyecto.
        visibilidadRepository.asegurarFilaOculta(proyecto.getIdProyecto());
        CmsProyectoVisibilidad visibilidad = visibilidadRepository.bloquearPorProyecto(idProyecto)
                .orElseThrow(() -> new IllegalStateException("No se pudo bloquear visibilidad"));
        CmsPublicacionVersion version = versionRepository.findWithLockByIdProyecto(idProyecto).orElse(null);
        long revisionActual = version == null ? 0L : version.getRevision();
        if (revisionActual == Long.MAX_VALUE || revisionActual != revisionPublicadaEsperada
                || revisionActual != borrador.getRevisionBase()) {
            throw new ConflictException("La versión pública cambió desde la creación del borrador");
        }
        boolean anterior = Boolean.TRUE.equals(visibilidad.getVisiblePublico());
        if (anterior == nuevo) {
            throw new ConflictException("La visibilidad propuesta es igual a la actual");
        }

        visibilidad.setVisiblePublico(nuevo);
        visibilidadRepository.save(visibilidad);
        if (version == null) {
            version = new CmsPublicacionVersion();
            version.setIdProyecto(idProyecto);
        }
        version.setRevision(revisionActual + 1);
        versionRepository.save(version);

        borrador.setEstado(EstadoBorrador.PUBLICADO);
        borrador.setIdUsuarioPublicacion(idUsuario);
        borrador.setFechaPublicacion(OffsetDateTime.now(ZoneOffset.UTC));
        borradorRepository.save(borrador);

        // Mismo commit o mismo rollback que visibilidad, versión y borrador.
        return historialRepository.save(CmsVisibilidadHistorial.nueva(
                idBorrador, idProyecto, idUsuario, revisionActual, anterior, nuevo));
    }
}

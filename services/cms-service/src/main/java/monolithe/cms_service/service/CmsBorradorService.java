package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.TextoSeccionBorrador;
import monolithe.cms_service.entity.CmsBorrador;
import monolithe.cms_service.entity.EstadoBorrador;
import monolithe.cms_service.entity.Seccion;
import monolithe.cms_service.entity.TipoObjetivoBorrador;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.CmsBorradorRepository;
import monolithe.cms_service.repository.CmsPublicacionVersionRepository;
import monolithe.cms_service.repository.PaginaRepository;
import monolithe.cms_service.repository.ProyectoRepository;
import monolithe.cms_service.repository.SeccionRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Gestiona EXCLUSIVAMENTE borradores. No modifica tablas de contenido publicado.
 * Los IDs de usuario proceden del sujeto del JWT validado por el controlador.
 * La asociación de nuevas imágenes se implementará después de definir su contrato.
 */
@Service
@RequiredArgsConstructor
public class CmsBorradorService {

    private final CmsBorradorRepository borradorRepository;
    private final CmsPublicacionVersionRepository versionRepository;
    private final PaginaRepository paginaRepository;
    private final ProyectoRepository proyectoRepository;
    private final SeccionRepository seccionRepository;

    @PreAuthorize("hasAuthority('web_content.edit')")
    @Transactional
    public CmsBorrador crearPagina(Long idPagina, List<TextoSeccionBorrador> textos,
                                  UUID grupo, Long idUsuario) {
        validarUsuario(idUsuario);
        validarPagina(idPagina);
        Map<String, Object> contenido = validarYConstruirTextos(idPagina, textos);
        UUID grupoEfectivo = grupo == null ? UUID.randomUUID() : grupo;
        comprobarObjetivoNoDuplicado(grupoEfectivo, TipoObjetivoBorrador.PAGINA, idPagina, idUsuario);

        CmsBorrador borrador = nuevoBorrador(grupoEfectivo, idUsuario);
        borrador.setTipoObjetivo(TipoObjetivoBorrador.PAGINA);
        borrador.setIdPagina(idPagina);
        borrador.setContenidoPendiente(contenido);
        borrador.setRevisionBase(versionRepository.findByIdPagina(idPagina)
                .map(v -> v.getRevision()).orElse(0L));
        return borradorRepository.save(borrador);
    }

    @PreAuthorize("hasAuthority('web_content.projects_visibility')")
    @Transactional
    public CmsBorrador crearVisibilidad(Long idProyecto, Boolean visiblePublico,
                                       UUID grupo, Long idUsuario) {
        validarUsuario(idUsuario);
        validarProyecto(idProyecto);
        if (visiblePublico == null) {
            throw new IllegalArgumentException("Se requiere visible_publico");
        }
        UUID grupoEfectivo = grupo == null ? UUID.randomUUID() : grupo;
        comprobarObjetivoNoDuplicado(grupoEfectivo, TipoObjetivoBorrador.VISIBILIDAD_PROYECTO, idProyecto, idUsuario);

        CmsBorrador borrador = nuevoBorrador(grupoEfectivo, idUsuario);
        borrador.setTipoObjetivo(TipoObjetivoBorrador.VISIBILIDAD_PROYECTO);
        borrador.setIdProyecto(idProyecto);
        borrador.setContenidoPendiente(Map.of("visible_publico", visiblePublico));
        borrador.setRevisionBase(versionRepository.findByIdProyecto(idProyecto)
                .map(v -> v.getRevision()).orElse(0L));
        return borradorRepository.save(borrador);
    }

    @PreAuthorize("hasAuthority('web_content.view')")
    @Transactional(readOnly = true)
    public List<CmsBorrador> listarPropios(Long idUsuario) {
        validarUsuario(idUsuario);
        return borradorRepository.findByIdUsuarioRegistroAndEstadoOrderByFechaActualizacionDesc(
                idUsuario, EstadoBorrador.EN_EDICION);
    }

    @PreAuthorize("hasAuthority('web_content.view')")
    @Transactional(readOnly = true)
    public CmsBorrador obtenerPropio(Long idBorrador, Long idUsuario) {
        validarUsuario(idUsuario);
        return borradorRepository.findByIdBorradorAndIdUsuarioRegistro(idBorrador, idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Borrador no encontrado"));
    }

    @PreAuthorize("hasAuthority('web_content.edit')")
    @Transactional
    public CmsBorrador actualizarPagina(Long idBorrador, List<TextoSeccionBorrador> textos,
                                       Long revisionEsperada, Long idUsuario) {
        CmsBorrador borrador = bloquearEditable(idBorrador, revisionEsperada, idUsuario);
        exigirTipo(borrador, TipoObjetivoBorrador.PAGINA);
        validarPagina(borrador.getIdPagina());
        borrador.setContenidoPendiente(validarYConstruirTextos(borrador.getIdPagina(), textos));
        incrementarRevision(borrador);
        return borradorRepository.save(borrador);
    }

    @PreAuthorize("hasAuthority('web_content.projects_visibility')")
    @Transactional
    public CmsBorrador actualizarVisibilidad(Long idBorrador, Boolean visiblePublico,
                                            Long revisionEsperada, Long idUsuario) {
        CmsBorrador borrador = bloquearEditable(idBorrador, revisionEsperada, idUsuario);
        exigirTipo(borrador, TipoObjetivoBorrador.VISIBILIDAD_PROYECTO);
        validarProyecto(borrador.getIdProyecto());
        if (visiblePublico == null) {
            throw new IllegalArgumentException("Se requiere visible_publico");
        }
        borrador.setContenidoPendiente(Map.of("visible_publico", visiblePublico));
        incrementarRevision(borrador);
        return borradorRepository.save(borrador);
    }

    @PreAuthorize("hasAuthority('web_content.edit')")
    @Transactional
    public CmsBorrador descartarPagina(Long idBorrador, Long revisionEsperada, Long idUsuario) {
        return descartarDeTipo(idBorrador, revisionEsperada, idUsuario, TipoObjetivoBorrador.PAGINA);
    }

    @PreAuthorize("hasAuthority('web_content.projects_visibility')")
    @Transactional
    public CmsBorrador descartarVisibilidad(Long idBorrador, Long revisionEsperada, Long idUsuario) {
        return descartarDeTipo(idBorrador, revisionEsperada, idUsuario,
                TipoObjetivoBorrador.VISIBILIDAD_PROYECTO);
    }

    private CmsBorrador descartarDeTipo(Long idBorrador, Long revisionEsperada,
                                       Long idUsuario, TipoObjetivoBorrador tipo) {
        CmsBorrador borrador = bloquearEditable(idBorrador, revisionEsperada, idUsuario);
        exigirTipo(borrador, tipo);
        borrador.setEstado(EstadoBorrador.DESCARTADO);
        incrementarRevision(borrador);
        return borradorRepository.save(borrador);
    }

    private CmsBorrador bloquearEditable(Long idBorrador, Long revisionEsperada, Long idUsuario) {
        validarUsuario(idUsuario);
        if (idBorrador == null || revisionEsperada == null || revisionEsperada < 1) {
            throw new IllegalArgumentException("Identificador y revisión válidos son obligatorios");
        }
        CmsBorrador borrador = borradorRepository
                .findWithLockByIdBorradorAndIdUsuarioRegistro(idBorrador, idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Borrador no encontrado"));
        if (borrador.getEstado() != EstadoBorrador.EN_EDICION) {
            throw new ConflictException("El borrador ya no está en edición");
        }
        if (!revisionEsperada.equals(borrador.getRevisionEdicion())) {
            throw new ConflictException("El borrador fue modificado por otra sesión");
        }
        return borrador;
    }

    private static void incrementarRevision(CmsBorrador borrador) {
        borrador.setRevisionEdicion(borrador.getRevisionEdicion() + 1L);
    }

    private static void exigirTipo(CmsBorrador borrador, TipoObjetivoBorrador tipo) {
        if (borrador.getTipoObjetivo() != tipo) {
            throw new IllegalArgumentException("Tipo de borrador no compatible con la operación");
        }
    }

    private static CmsBorrador nuevoBorrador(UUID grupo, Long usuario) {
        CmsBorrador borrador = new CmsBorrador();
        borrador.setIdGrupoEdicion(grupo);
        borrador.setIdUsuarioRegistro(usuario);
        return borrador;
    }

    private static void validarUsuario(Long idUsuario) {
        if (idUsuario == null || idUsuario <= 0) {
            throw new IllegalArgumentException("Identificador del usuario inválido");
        }
    }

    private void validarPagina(Long idPagina) {
        if (idPagina == null || idPagina <= 0) {
            throw new IllegalArgumentException("Identificador de página inválido");
        }
        paginaRepository.findById(idPagina)
                .filter(p -> Boolean.TRUE.equals(p.getActivo()))
                .orElseThrow(() -> new ResourceNotFoundException("Página no encontrada"));
    }

    private void validarProyecto(Long idProyecto) {
        if (idProyecto == null || idProyecto <= 0) {
            throw new IllegalArgumentException("Identificador de proyecto inválido");
        }
        proyectoRepository.findById(idProyecto)
                .filter(p -> Boolean.TRUE.equals(p.getActivo()))
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto activo no encontrado"));
    }

    private void comprobarObjetivoNoDuplicado(UUID grupo, TipoObjetivoBorrador tipo,
                                               Long idObjetivo, Long idUsuario) {
        List<CmsBorrador> existentes = borradorRepository.findByIdGrupoEdicionOrderByIdBorradorAsc(grupo);
        if (existentes.stream().anyMatch(b -> !idUsuario.equals(b.getIdUsuarioRegistro()))) {
            throw new ResourceNotFoundException("Grupo de edición no encontrado");
        }
        if (existentes.stream().anyMatch(b -> b.getTipoObjetivo() == tipo &&
                (tipo == TipoObjetivoBorrador.PAGINA
                        ? idObjetivo.equals(b.getIdPagina())
                        : idObjetivo.equals(b.getIdProyecto())))) {
            throw new ConflictException("El grupo ya contiene un borrador para este destino");
        }
    }

    private Map<String, Object> validarYConstruirTextos(Long idPagina,
                                                        List<TextoSeccionBorrador> textos) {
        if (textos == null || textos.isEmpty() || textos.size() > 30) {
            throw new IllegalArgumentException("Debe incluir entre 1 y 30 secciones");
        }
        Set<Long> ids = new HashSet<>();
        List<Map<String, Object>> secciones = new ArrayList<>();
        for (TextoSeccionBorrador cambio : textos) {
            if (cambio == null || cambio.idSeccion() == null || !ids.add(cambio.idSeccion())) {
                throw new IllegalArgumentException("Sección inválida o repetida");
            }
            Seccion seccion = seccionRepository.findById(cambio.idSeccion())
                    .filter(s -> idPagina.equals(s.getIdPagina()) && Boolean.TRUE.equals(s.getActivo()))
                    .orElseThrow(() -> new IllegalArgumentException("La sección no pertenece a la página"));
            Map<String, Object> valores = new LinkedHashMap<>();
            valores.put("id_seccion", seccion.getIdSeccion());
            agregarTexto(valores, "titulo", cambio.titulo(), 180);
            agregarTexto(valores, "subtitulo", cambio.subtitulo(), 255);
            agregarTexto(valores, "contenido", cambio.contenido(), 10000);
            if (valores.size() == 1) {
                // Marcador explícito de imagen únicamente. No concede publicar sin subir
                // una imagen privada: el publicador verifica su integridad y pertenencia.
                boolean heroPermitido = Set.of("HERO_PRINCIPAL", "HERO_SLIDE_2_PROMO", "HERO_SLIDE_3_PROMO")
                        .contains(seccion.getCodigo());
                boolean inicio = paginaRepository.findById(idPagina)
                        .map(pagina -> "INICIO".equals(pagina.getCodigo()))
                        .orElse(false);
                if (!heroPermitido || !inicio) {
                    throw new IllegalArgumentException("Una sección sin textos solo puede preparar imágenes del Hero de INICIO");
                }
            }
            secciones.add(valores);
        }
        return Map.of("secciones", secciones);
    }

    private static void agregarTexto(Map<String, Object> valores, String campo,
                                    String texto, int maximo) {
        if (texto == null) return;
        if (texto.length() > maximo || texto.indexOf('<') >= 0 || texto.indexOf('>') >= 0) {
            throw new IllegalArgumentException("Texto no permitido para: " + campo);
        }
        valores.put(campo, texto);
    }
}

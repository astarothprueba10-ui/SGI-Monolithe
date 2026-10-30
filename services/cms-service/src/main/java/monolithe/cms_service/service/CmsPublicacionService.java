package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.entity.CmsBorrador;
import monolithe.cms_service.entity.CmsPublicacionHistorial;
import monolithe.cms_service.entity.CmsPublicacionVersion;
import monolithe.cms_service.entity.CmsBorradorImagen;
import monolithe.cms_service.entity.Multimedia;
import monolithe.cms_service.entity.MultimediaAsignacion;
import monolithe.cms_service.entity.TipoMultimedia;
import monolithe.cms_service.entity.UsoMultimedia;
import monolithe.cms_service.entity.EstadoBorrador;
import monolithe.cms_service.entity.TipoObjetivoBorrador;
import monolithe.cms_service.entity.Pagina;
import monolithe.cms_service.entity.Seccion;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.CmsBorradorImagenRepository;
import monolithe.cms_service.repository.CmsBorradorRepository;
import monolithe.cms_service.repository.CmsPublicacionHistorialRepository;
import monolithe.cms_service.repository.CmsPublicacionVersionRepository;
import monolithe.cms_service.repository.PaginaRepository;
import monolithe.cms_service.repository.SeccionRepository;
import monolithe.cms_service.repository.MultimediaRepository;
import monolithe.cms_service.repository.MultimediaAsignacionRepository;
import monolithe.cms_service.repository.TipoMultimediaRepository;
import monolithe.cms_service.repository.UsoMultimediaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Publica contenidos autorizados de INICIO mediante borradores y revisión optimista.
 * La visibilidad de las secciones promocionales se activa solo al publicarlas;
 * la visibilidad de los proyectos comerciales se gestiona por separado.
 */
@Service
@RequiredArgsConstructor
public class CmsPublicacionService {

    private final CmsBorradorRepository borradorRepository;
    private final CmsBorradorImagenRepository imagenRepository;
    private final PaginaRepository paginaRepository;
    private final CmsPublicacionVersionRepository versionRepository;
    private final SeccionRepository seccionRepository;
    private final CmsPublicacionHistorialRepository historialRepository;
    private final MultimediaRepository multimediaRepository;
    private final MultimediaAsignacionRepository asignacionRepository;
    private final TipoMultimediaRepository tiposMultimedia;
    private final UsoMultimediaRepository usosMultimedia;
    private final StorageBorradoresPrivado storagePrivado;
    private final SupabaseStorageService storagePublico;
    private static final Logger log = LoggerFactory.getLogger(CmsPublicacionService.class);

    @Value("${cms.publicacion.imagenes.enabled:${CMS_PUBLICACION_IMAGENES_HABILITADA:false}}")
    private boolean publicacionImagenesHabilitada;

    @PreAuthorize("hasAuthority('web_content.publish')")
    @Transactional
    public CmsPublicacionHistorial publicarTextos(Long idBorrador,
            Long revisionEditorialEsperada, Long revisionPublicadaEsperada, Long idUsuario) {
        return publicar(idBorrador, revisionEditorialEsperada, revisionPublicadaEsperada, idUsuario, false);
    }

    /** Publica juntos los textos autorizados y los fondos privados del mismo borrador. */
    @PreAuthorize("hasAuthority('web_content.publish')")
    @Transactional
    public CmsPublicacionHistorial publicarContenido(Long idBorrador,
            Long revisionEditorialEsperada, Long revisionPublicadaEsperada, Long idUsuario) {
        if (!publicacionImagenesHabilitada) {
            throw new ConflictException("Publicación de imágenes deshabilitada en este entorno");
        }
        return publicar(idBorrador, revisionEditorialEsperada, revisionPublicadaEsperada, idUsuario, true);
    }

    private CmsPublicacionHistorial publicar(Long idBorrador, Long revisionEditorialEsperada,
            Long revisionPublicadaEsperada, Long idUsuario, boolean incluirImagenes) {
        if (idBorrador == null || idBorrador <= 0 || idUsuario == null || idUsuario <= 0
                || revisionEditorialEsperada == null || revisionEditorialEsperada < 1
                || revisionPublicadaEsperada == null || revisionPublicadaEsperada < 0) {
            throw new IllegalArgumentException("Borrador, usuario y revisiones válidas son obligatorios");
        }

        // Orden único de bloqueos: borrador propio -> página -> versión -> secciones.
        // El bloqueo de página protege también la primera creación de una versión.
        CmsBorrador borrador = borradorRepository
                .findWithLockByIdBorradorAndIdUsuarioRegistro(idBorrador, idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Borrador no encontrado"));
        if (borrador.getTipoObjetivo() != TipoObjetivoBorrador.PAGINA
                || borrador.getEstado() != EstadoBorrador.EN_EDICION) {
            throw new ConflictException("El borrador no es una página en edición");
        }
        // La ruta heredada solo publica textos, evitando cerrar borradores mixtos.
        if (!incluirImagenes && imagenRepository.existsByIdBorrador(idBorrador)) {
            throw new ConflictException("El borrador contiene imágenes pendientes de publicación");
        }
        Pagina pagina = paginaRepository.findWithLockByIdPagina(borrador.getIdPagina())
                .orElseThrow(() -> new ResourceNotFoundException("Página no encontrada"));
        CmsPublicacionVersion version = versionRepository.findWithLockByIdPagina(pagina.getIdPagina())
                .orElse(null);
        Long revisionActual = version == null ? 0L : version.getRevision();
        List<Seccion> secciones = seccionRepository
                .findWithLockByIdPaginaOrderByOrdenAsc(pagina.getIdPagina());

        List<CmsBorradorImagen> imagenesPrivadas = incluirImagenes
                ? imagenRepository.findByIdBorradorOrderByIdSeccionAsc(idBorrador) : List.of();
        List<ImagenParaPublicar> preparadas = prepararImagenes(
                imagenesPrivadas, borrador, pagina, secciones);
        Set<Long> seccionesConImagen = new HashSet<>();
        preparadas.forEach(item -> seccionesConImagen.add(item.seccion().getIdSeccion()));
        CmsPublicacionContrato.Plan plan = CmsPublicacionContrato.evaluar(
                borrador, pagina, secciones, revisionEditorialEsperada,
                revisionActual, revisionPublicadaEsperada, idUsuario, seccionesConImagen);
        Map<String, Object> anterior = CmsPublicacionSnapshot.capturar(pagina, secciones);
        if (!preparadas.isEmpty()) {
            anterior.put("fondos_publicados", fotografiarFondos(preparadas));
        }
        Map<Long, Seccion> porId = new HashMap<>();
        secciones.forEach(seccion -> porId.put(seccion.getIdSeccion(), seccion));
        List<Seccion> modificadas = new ArrayList<>();
        for (CmsPublicacionContrato.CambioPermitido cambio : plan.cambios()) {
            Seccion seccion = porId.get(cambio.idSeccion());
            // Los IDs, propiedad y estado ya fueron verificados por el contrato.
            cambio.textos().forEach((campo, valor) -> {
                switch (campo) {
                    case "titulo" -> seccion.setTitulo(valor);
                    case "subtitulo" -> seccion.setSubtitulo(valor);
                    case "contenido" -> seccion.setContenido(valor);
                    default -> throw new IllegalStateException("Campo de publicación no autorizado");
                }
            });
            // Las secciones de migración 35 nacen ocultas. Su primera publicación
            // (texto, imagen o ambas) las vuelve consultables por el endpoint público.
            // No se habilitan otras secciones ni se modifica la visibilidad de proyectos.
            if ("HERO_SLIDE_2_PROMO".equals(cambio.codigo())
                    || "HERO_SLIDE_3_PROMO".equals(cambio.codigo())) {
                seccion.setVisible(true);
            }
            modificadas.add(seccion);
        }
        List<Map<String, Object>> nuevosFondos = preparadas.isEmpty()
                ? List.of() : publicarFondos(preparadas, idUsuario);
        Map<String, Object> nuevo = CmsPublicacionSnapshot.capturar(pagina, secciones);
        if (!preparadas.isEmpty()) nuevo.put("fondos_publicados", nuevosFondos);

        CmsPublicacionVersion versionActualizada = version;
        if (versionActualizada == null) {
            versionActualizada = new CmsPublicacionVersion();
            versionActualizada.setIdPagina(plan.idPagina());
        }
        versionActualizada.setRevision(plan.revisionNueva());
        versionRepository.save(versionActualizada);
        seccionRepository.saveAll(modificadas);

        borrador.setEstado(EstadoBorrador.PUBLICADO);
        borrador.setIdUsuarioPublicacion(idUsuario);
        borrador.setFechaPublicacion(OffsetDateTime.now(ZoneOffset.UTC));
        borradorRepository.save(borrador);

        // El INSERT del historial participa en la misma transacción y su error
        // provoca rollback de secciones, revisión y estado del borrador.
        return historialRepository.save(CmsPublicacionHistorial.nueva(
                plan.idPagina(), plan.idBorrador(), plan.idUsuarioPublicador(),
                plan.revisionAnterior(), anterior, nuevo));
    }

    /** Preflight de integridad y propiedad, antes de subir ningún objeto a Storage público. */
    private List<ImagenParaPublicar> prepararImagenes(List<CmsBorradorImagen> imagenes,
            CmsBorrador borrador, Pagina pagina, List<Seccion> secciones) {
        if (imagenes.isEmpty()) return List.of();
        Map<Long, Seccion> porId = new HashMap<>();
        secciones.forEach(seccion -> porId.put(seccion.getIdSeccion(), seccion));
        Set<Long> ids = new HashSet<>();
        List<ImagenParaPublicar> preparadas = new ArrayList<>();
        for (CmsBorradorImagen imagen : imagenes) {
            if (!borrador.getIdBorrador().equals(imagen.getIdBorrador())
                    || !borrador.getIdUsuarioRegistro().equals(imagen.getIdUsuarioRegistro())
                    || !StorageBorradoresPrivado.BUCKET.equals(imagen.getBucketId())
                    || !ids.add(imagen.getIdSeccion())) {
                throw new IllegalArgumentException("Imagen privada ajena, duplicada o inválida");
            }
            Seccion seccion = porId.get(imagen.getIdSeccion());
            if (seccion == null || !pagina.getIdPagina().equals(seccion.getIdPagina())
                    || !Boolean.TRUE.equals(seccion.getActivo())
                    || !Set.of("HERO_PRINCIPAL", "HERO_SLIDE_2_PROMO", "HERO_SLIDE_3_PROMO")
                            .contains(seccion.getCodigo())) {
                throw new IllegalArgumentException("Imagen fuera del Hero de Inicio autorizado");
            }
            String prefijo = "borradores/" + borrador.getIdBorrador() + "/" + imagen.getIdSeccion() + "/";
            if (imagen.getObjectKey() == null || !imagen.getObjectKey().startsWith(prefijo)) {
                throw new ConflictException("La imagen privada no pertenece al borrador y sección");
            }
            byte[] datos = storagePrivado.descargar(imagen.getObjectKey());
            if (imagen.getTamanoBytes() == null || datos.length != imagen.getTamanoBytes()
                    || imagen.getHashSha256() == null
                    || !ImagenBorradorValidador.hash(datos).equalsIgnoreCase(imagen.getHashSha256().trim())
                    || !Set.of("image/jpeg", "image/png", "image/webp").contains(imagen.getMimeType())) {
                throw new ConflictException("La imagen privada no supera la validación de integridad");
            }
            preparadas.add(new ImagenParaPublicar(imagen, seccion, datos));
        }
        return List.copyOf(preparadas);
    }

    private List<Map<String, Object>> fotografiarFondos(List<ImagenParaPublicar> imagenes) {
        int uso = resolverUsoFondo();
        List<Map<String, Object>> estado = new ArrayList<>();
        for (ImagenParaPublicar item : imagenes) {
            for (MultimediaAsignacion asignacion : asignacionRepository
                    .findByIdSeccionAndActivoTrueOrderByOrdenAsc(item.seccion().getIdSeccion())) {
                if (!Integer.valueOf(uso).equals(asignacion.getIdUsoMultimedia())) continue;
                Map<String, Object> dato = new LinkedHashMap<>();
                dato.put("id_seccion", item.seccion().getIdSeccion());
                dato.put("id_multimedia", asignacion.getIdMultimedia());
                dato.put("id_asignacion", asignacion.getIdMultimediaAsignacion());
                dato.put("visible", asignacion.getVisible());
                estado.add(dato);
            }
        }
        return estado;
    }

    private List<Map<String, Object>> publicarFondos(List<ImagenParaPublicar> imagenes, Long usuario) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Se requiere una transacción activa para publicar imágenes");
        }
        Integer tipo = tiposMultimedia.findByActivoTrueOrderByOrdenAsc().stream()
                .filter(t -> "IMAGEN".equals(t.getCodigo()))
                .map(TipoMultimedia::getIdTipoMultimedia).findFirst()
                .orElseThrow(() -> new IllegalStateException("Falta el catálogo IMAGEN"));
        int uso = resolverUsoFondo();
        List<String> clavesCreadas = new ArrayList<>();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int estado) {
                if (estado != STATUS_COMMITTED) {
                    for (String clave : clavesCreadas) {
                        try { storagePublico.eliminarImagenCms(clave); }
                        catch (RuntimeException ex) { log.error("Revisar objeto público huérfano CMS: {}", clave, ex); }
                    }
                }
            }
        });
        List<Map<String, Object>> nuevos = new ArrayList<>();
        for (ImagenParaPublicar item : imagenes) {
            Long seccion = item.seccion().getIdSeccion();
            String clave = storagePublico.nuevaClaveImagenCms(seccion, item.imagen().getMimeType());
            // Registrar antes de subir: incluso un timeout tras crear el objeto se compensará.
            clavesCreadas.add(clave);
            storagePublico.subirImagenCms(clave, item.bytes(), item.imagen().getMimeType());
            // Solo reemplazar asignaciones FONDO del mismo slide, no material comercial externo.
            List<MultimediaAsignacion> existentes = asignacionRepository
                    .findByIdSeccionAndActivoTrueOrderByOrdenAsc(seccion);
            for (MultimediaAsignacion anterior : existentes) {
                if (!Integer.valueOf(uso).equals(anterior.getIdUsoMultimedia())) continue;
                anterior.setVisible(false);
                anterior.setActivo(false);
                asignacionRepository.save(anterior);
            }
            Multimedia multimedia = new Multimedia();
            multimedia.setIdTipoMultimedia(tipo);
            multimedia.setCodigo("CMS-WEB-" + UUID.randomUUID());
            multimedia.setNombre("Fondo CMS " + item.seccion().getCodigo());
            multimedia.setClaveArchivo(clave);
            multimedia.setTipoMime(item.imagen().getMimeType());
            multimedia.setTamanioBytes(item.imagen().getTamanoBytes());
            multimedia.setHashSha256(item.imagen().getHashSha256());
            multimedia.setIdUsuarioRegistro(usuario);
            multimedia.setActivo(true);
            multimedia = multimediaRepository.saveAndFlush(multimedia);
            MultimediaAsignacion nueva = new MultimediaAsignacion();
            nueva.setIdMultimedia(multimedia.getIdMultimedia());
            nueva.setIdUsoMultimedia(uso);
            nueva.setIdSeccion(seccion);
            nueva.setIdUsuarioRegistro(usuario);
            nueva.setOrden(0);
            nueva.setVisible(true);
            nueva.setActivo(true);
            nueva = asignacionRepository.saveAndFlush(nueva);
            Map<String, Object> dato = new LinkedHashMap<>();
            dato.put("id_seccion", seccion);
            dato.put("id_multimedia", multimedia.getIdMultimedia());
            dato.put("id_asignacion", nueva.getIdMultimediaAsignacion());
            dato.put("clave_archivo", clave);
            nuevos.add(dato);
        }
        // La referencia privada queda en BD hasta que la limpieza periódica confirmada
        // retire el objeto; la publicación ya impide leer borradores finalizados.
        return List.copyOf(nuevos);
    }

    private int resolverUsoFondo() {
        return usosMultimedia.findByActivoTrueOrderByOrdenAsc().stream()
                .filter(u -> "FONDO".equals(u.getCodigo()))
                .map(UsoMultimedia::getIdUsoMultimedia).findFirst()
                .orElseThrow(() -> new IllegalStateException("Falta el catálogo FONDO"));
    }

    private record ImagenParaPublicar(CmsBorradorImagen imagen, Seccion seccion, byte[] bytes) { }
}

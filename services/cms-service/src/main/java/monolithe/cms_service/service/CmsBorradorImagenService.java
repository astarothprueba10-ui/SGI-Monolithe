package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.CmsBorradorImagenResponse;
import monolithe.cms_service.entity.CmsBorrador;
import monolithe.cms_service.entity.CmsBorradorImagen;
import monolithe.cms_service.entity.EstadoBorrador;
import monolithe.cms_service.entity.TipoObjetivoBorrador;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.CmsBorradorImagenRepository;
import monolithe.cms_service.repository.CmsBorradorRepository;
import monolithe.cms_service.repository.SeccionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/** Solo asocia multimedia de borradores propios y nunca altera contenido publicado. */
@Service
@RequiredArgsConstructor
public class CmsBorradorImagenService {
    private static final Logger log = LoggerFactory.getLogger(CmsBorradorImagenService.class);
    private final CmsBorradorRepository borradores;
    private final CmsBorradorImagenRepository imagenes;
    private final SeccionRepository secciones;
    private final ImagenBorradorValidador validador;
    private final StorageBorradoresPrivado storage;

    @PreAuthorize("hasAuthority('web_content.edit')")
    @Transactional
    public CmsBorradorImagenResponse guardar(Long borradorId, Long seccionId, Long revision,
                                             Long usuario, MultipartFile archivo) {
        CmsBorrador borrador = autorizar(borradorId, seccionId, usuario, true);
        comprobarRevision(borrador, revision);
        var validada = validador.validar(archivo);
        var actual = imagenes.findByIdBorradorAndIdSeccion(borradorId, seccionId).orElse(null);
        String key = "borradores/" + borradorId + "/" + seccionId + "/" + UUID.randomUUID() + validada.extension();
        String anterior = actual == null ? null : actual.getObjectKey();
        var subida = new AtomicBoolean(false);
        configurarCompensacion(key, anterior, subida);
        try {
            storage.subir(key, validada.bytes(), validada.mimeType());
            subida.set(true);
        } catch (RuntimeException e) {
            limpiarSilenciosamente(key);
            throw e;
        }
        CmsBorradorImagen imagen = actual == null ? new CmsBorradorImagen() : actual;
        asignar(imagen, borradorId, seccionId, usuario, key, validada);
        imagenes.saveAndFlush(imagen);
        borrador.setRevisionEdicion(borrador.getRevisionEdicion() + 1);
        borradores.saveAndFlush(borrador);
        return CmsBorradorImagenResponse.desde(imagen, borrador.getRevisionEdicion());
    }

    @PreAuthorize("hasAuthority('web_content.view')")
    @Transactional(readOnly = true)
    public List<CmsBorradorImagenResponse> listar(Long borradorId, Long usuario) {
        if (borradorId == null || borradorId <= 0 || usuario == null || usuario <= 0) {
            throw new IllegalArgumentException("Identificadores inválidos");
        }
        CmsBorrador b = borradores.findByIdBorradorAndIdUsuarioRegistro(borradorId, usuario)
                .orElseThrow(() -> new ResourceNotFoundException("Borrador no encontrado"));
        if (b.getTipoObjetivo() != TipoObjetivoBorrador.PAGINA ||
                b.getEstado() != EstadoBorrador.EN_EDICION) {
            throw new ConflictException("El borrador no está disponible para previsualizar");
        }
        return imagenes.findByIdBorradorOrderByIdSeccionAsc(borradorId).stream()
                .map(i -> {
                    if (!usuario.equals(i.getIdUsuarioRegistro())) {
                        throw new ResourceNotFoundException("Imagen privada no disponible");
                    }
                    return CmsBorradorImagenResponse.desde(i, b.getRevisionEdicion());
                }).toList();
    }

    @PreAuthorize("hasAuthority('web_content.view')")
    @Transactional(readOnly = true)
    public ImagenPrivada obtener(Long borradorId, Long seccionId, Long usuario) {
        autorizar(borradorId, seccionId, usuario, false);
        CmsBorradorImagen imagen = buscarImagen(borradorId, seccionId);
        byte[] bytes = storage.descargar(imagen.getObjectKey());
        if (!imagen.getHashSha256().trim().equals(ImagenBorradorValidador.hash(bytes))) {
            throw new IllegalStateException("La imagen privada no supera la verificacion de integridad");
        }
        return new ImagenPrivada(bytes, imagen.getMimeType());
    }

    @PreAuthorize("hasAuthority('web_content.edit')")
    @Transactional
    public Long quitar(Long borradorId, Long seccionId, Long revision, Long usuario) {
        CmsBorrador borrador = autorizar(borradorId, seccionId, usuario, true);
        comprobarRevision(borrador, revision);
        CmsBorradorImagen imagen = buscarImagen(borradorId, seccionId);
        imagenes.delete(imagen);
        borrador.setRevisionEdicion(borrador.getRevisionEdicion() + 1);
        borradores.saveAndFlush(borrador);
        borrarTrasCommit(imagen.getObjectKey());
        return borrador.getRevisionEdicion();
    }

    private CmsBorradorImagen buscarImagen(Long borradorId, Long seccionId) {
        return imagenes.findByIdBorradorAndIdSeccion(borradorId, seccionId)
                .orElseThrow(() -> new ResourceNotFoundException("Imagen de borrador no encontrada"));
    }

    private CmsBorrador autorizar(Long borradorId, Long seccionId, Long usuario, boolean edicion) {
        if (borradorId == null || borradorId <= 0 || seccionId == null || seccionId <= 0
                || usuario == null || usuario <= 0) throw new IllegalArgumentException("Identificadores invalidos");
        CmsBorrador b = (edicion
                ? borradores.findWithLockByIdBorradorAndIdUsuarioRegistro(borradorId, usuario)
                : borradores.findByIdBorradorAndIdUsuarioRegistro(borradorId, usuario))
                .orElseThrow(() -> new ResourceNotFoundException("Borrador no encontrado"));
        if (b.getTipoObjetivo() != TipoObjetivoBorrador.PAGINA || b.getEstado() != EstadoBorrador.EN_EDICION)
            throw new ConflictException("El borrador no admite imagenes en este estado");
        boolean valida = secciones.findById(seccionId).filter(s -> Boolean.TRUE.equals(s.getActivo())
                && b.getIdPagina().equals(s.getIdPagina())).isPresent();
        if (!valida) throw new ResourceNotFoundException("Seccion no encontrada en la pagina del borrador");
        return b;
    }

    private static void comprobarRevision(CmsBorrador b, Long revision) {
        if (revision == null || !revision.equals(b.getRevisionEdicion()))
            throw new ConflictException("El borrador fue modificado por otra sesion");
    }

    private static void asignar(CmsBorradorImagen destino, Long idBorrador, Long idSeccion,
                                  Long usuario, String key, ImagenBorradorValidador.ImagenValidada v) {
        destino.setIdBorrador(idBorrador);
        destino.setIdSeccion(idSeccion);
        destino.setIdUsuarioRegistro(usuario);
        destino.setObjectKey(key);
        destino.setMimeType(v.mimeType());
        destino.setTamanoBytes((long)v.bytes().length);
        destino.setHashSha256(v.sha256());
    }

    private void configurarCompensacion(String nueva, String anterior, AtomicBoolean subida) {
        if (!TransactionSynchronizationManager.isSynchronizationActive())
            throw new IllegalStateException("La operacion requiere transaccion activa");
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { if (anterior != null) limpiarSilenciosamente(anterior); }
            @Override public void afterCompletion(int estado) {
                if (estado == STATUS_ROLLED_BACK && subida.get()) limpiarSilenciosamente(nueva);
            }
        });
    }

    private void borrarTrasCommit(String key) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { limpiarSilenciosamente(key); }
        });
    }

    private void limpiarSilenciosamente(String key) {
        try { storage.eliminar(key); }
        catch (RuntimeException e) { log.warn("Limpieza pendiente de objeto privado CMS", e); }
    }

    public record ImagenPrivada(byte[] contenido, String mimeType) { }
}

package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.entity.CmsBorradorImagen;
import monolithe.cms_service.entity.EstadoBorrador;
import monolithe.cms_service.repository.CmsBorradorImagenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Sanea imágenes privadas de borradores descartados o ya publicados.
 * La referencia en PostgreSQL es la cola durable de reintento: se borra SOLO cuando
 * Storage ha confirmado la eliminacion (o el objeto ya no existe).
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "cms.borradores.limpieza-descartados",
        name = "enabled", havingValue = "true")
public class CmsBorradorImagenesDescartadasLimpieza {
    private static final Logger log = LoggerFactory.getLogger(CmsBorradorImagenesDescartadasLimpieza.class);
    private static final int LOTE = 50;
    private final CmsBorradorImagenRepository imagenes;
    private final StorageBorradoresPrivado storage;

    @Scheduled(fixedDelayString = "${cms.borradores.limpieza-descartados.interval-ms:300000}",
            initialDelayString = "${cms.borradores.limpieza-descartados.interval-ms:300000}")
    public void ejecutarLote() {
        var pendientes = imagenes.buscarPendientesDescartados(
                EstadoBorrador.DESCARTADO, EstadoBorrador.PUBLICADO,
                StorageBorradoresPrivado.BUCKET, PageRequest.of(0, LOTE));
        for (CmsBorradorImagen imagen : pendientes) {
            try {
                String prefijo = "borradores/" + imagen.getIdBorrador() + "/"
                        + imagen.getIdSeccion() + "/";
                if (imagen.getObjectKey() == null || !imagen.getObjectKey().startsWith(prefijo)) {
                    log.error("Referencia de imagen privada finalizada con ruta inesperada; id={}",
                            imagen.getIdImagenBorrador());
                    continue;
                }
                storage.eliminar(imagen.getObjectKey());
                int borradas = imagenes.eliminarReferenciaDescartada(
                        imagen.getIdImagenBorrador(), imagen.getObjectKey());
                if (borradas != 1) {
                    log.warn("Objeto procesado, pero la referencia no pudo retirarse; id={}",
                            imagen.getIdImagenBorrador());
                } else {
                    log.info("Imagen privada de borrador finalizado retirada; id={}",
                            imagen.getIdImagenBorrador());
                }
            } catch (RuntimeException e) {
                // Conservar referencia para el siguiente ciclo. No tocar cms-public.
                log.warn("No se pudo completar limpieza de imagen privada; id={}",
                        imagen.getIdImagenBorrador(), e);
            }
        }
    }
}

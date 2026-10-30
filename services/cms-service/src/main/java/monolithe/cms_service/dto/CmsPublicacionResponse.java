package monolithe.cms_service.dto;

import monolithe.cms_service.entity.CmsPublicacionHistorial;

/** Respuesta pública acotada: no expone snapshots del historial ni datos del autor. */
public record CmsPublicacionResponse(
        Long idHistorial,
        Long idBorrador,
        Long idPagina,
        Long revisionAnterior,
        Long revisionNueva
) {
    public static CmsPublicacionResponse desde(CmsPublicacionHistorial historial) {
        return new CmsPublicacionResponse(
                historial.getIdHistorial(),
                historial.getIdBorrador(),
                historial.getIdPagina(),
                historial.getRevisionAnterior(),
                historial.getRevisionNueva());
    }
}

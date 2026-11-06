package monolithe.cms_service.dto;

import monolithe.cms_service.entity.CmsVisibilidadHistorial;

public record CmsVisibilidadPublicacionResponse(
        Long idHistorial, Long idBorrador, Long idProyecto,
        Long revisionAnterior, Long revisionNueva, boolean visiblePublico) {
    public static CmsVisibilidadPublicacionResponse desde(CmsVisibilidadHistorial historial) {
        return new CmsVisibilidadPublicacionResponse(
                historial.getIdHistorial(), historial.getIdBorrador(), historial.getIdProyecto(),
                historial.getRevisionAnterior(), historial.getRevisionNueva(),
                historial.getVisibleNuevo());
    }
}

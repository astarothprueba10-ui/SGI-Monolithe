package monolithe.cms_service.dto;

import monolithe.cms_service.entity.CmsBorrador;
import monolithe.cms_service.entity.EstadoBorrador;
import monolithe.cms_service.entity.TipoObjetivoBorrador;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/** DTO deliberadamente acotado: no expone entidad JPA ni identificadores del autor. */
public record CmsBorradorResponse(
        Long idBorrador,
        UUID idGrupoEdicion,
        TipoObjetivoBorrador tipoObjetivo,
        Long idPagina,
        Long idProyecto,
        Map<String, Object> contenidoPendiente,
        Long revisionBase,
        Long revisionEdicion,
        EstadoBorrador estado,
        OffsetDateTime fechaCreacion,
        OffsetDateTime fechaActualizacion
) {
    public static CmsBorradorResponse desde(CmsBorrador borrador) {
        return new CmsBorradorResponse(
                borrador.getIdBorrador(),
                borrador.getIdGrupoEdicion(),
                borrador.getTipoObjetivo(),
                borrador.getIdPagina(),
                borrador.getIdProyecto(),
                borrador.getContenidoPendiente(),
                borrador.getRevisionBase(),
                borrador.getRevisionEdicion(),
                borrador.getEstado(),
                borrador.getFechaCreacion(),
                borrador.getFechaActualizacion());
    }
}

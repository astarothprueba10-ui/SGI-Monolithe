package monolithe.cms_service.dto;

/** Catálogo reducido: no expone precios, contratos ni especificaciones oficiales. */
public record ProyectoVisibilidadCmsResponse(
        Long idProyecto, String codigo, String nombre,
        boolean visiblePublico, long revisionPublicada) { }

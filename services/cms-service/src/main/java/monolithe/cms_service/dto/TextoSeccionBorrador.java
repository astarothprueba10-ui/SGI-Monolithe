package monolithe.cms_service.dto;

/** Modificación editorial de una sección existente. Null significa no modificar el campo. */
public record TextoSeccionBorrador(
        Long idSeccion,
        String titulo,
        String subtitulo,
        String contenido
) { }

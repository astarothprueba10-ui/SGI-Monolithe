package monolithe.cms_service.service;

import monolithe.cms_service.entity.CmsBorrador;
import monolithe.cms_service.entity.EstadoBorrador;
import monolithe.cms_service.entity.Pagina;
import monolithe.cms_service.entity.Seccion;
import monolithe.cms_service.entity.TipoObjetivoBorrador;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Contrato puro, sin persistencia, para la FUTURA publicación de textos de INICIO.
 *
 * No publica contenido, no crea versiones, no cambia la visibilidad de secciones,
 * no consulta imágenes privadas y NO sustituye la autorización web_content.publish.
 * El servicio transaccional futuro deberá obtener borrador y revisión publicada
 * bajo bloqueo antes de llamar a evaluar().
 */
public final class CmsPublicacionContrato {

    private static final String PRINCIPAL = "HERO_PRINCIPAL";
    private static final String PROMO_2 = "HERO_SLIDE_2_PROMO";
    private static final String PROMO_3 = "HERO_SLIDE_3_PROMO";
    private static final Set<String> CODIGOS = Set.of(PRINCIPAL, PROMO_2, PROMO_3);
    private static final Set<String> CAMPOS_BORRADOR = Set.of("id_seccion", "titulo", "subtitulo", "contenido");

    private CmsPublicacionContrato() { }

    public static Plan evaluar(CmsBorrador borrador, Pagina pagina,
                               Collection<Seccion> seccionesConfiables,
                               Long revisionEditorialEsperada,
                               Long revisionPublicadaActual,
                               Long revisionPublicadaEsperada,
                               Long idUsuarioPublicador) {
        return evaluar(borrador, pagina, seccionesConfiables, revisionEditorialEsperada,
                revisionPublicadaActual, revisionPublicadaEsperada, idUsuarioPublicador, Set.of());
    }

    /** Permite una sección sin textos solamente si tiene un fondo privado verificado. */
    public static Plan evaluar(CmsBorrador borrador, Pagina pagina,
                               Collection<Seccion> seccionesConfiables,
                               Long revisionEditorialEsperada,
                               Long revisionPublicadaActual,
                               Long revisionPublicadaEsperada,
                               Long idUsuarioPublicador, Set<Long> idsImagenesValidadas) {
        if (idsImagenesValidadas == null) {
            throw new IllegalArgumentException("Falta la validación de imágenes privadas");
        }
        if (idUsuarioPublicador == null || idUsuarioPublicador <= 0) {
            throw new IllegalArgumentException("Usuario publicador inválido");
        }
        if (borrador == null || !idUsuarioPublicador.equals(borrador.getIdUsuarioRegistro())) {
            throw new ResourceNotFoundException("Borrador no encontrado");
        }
        if (borrador.getTipoObjetivo() != TipoObjetivoBorrador.PAGINA
                || borrador.getEstado() != EstadoBorrador.EN_EDICION) {
            throw new ConflictException("El borrador no es una página en edición");
        }
        if (pagina == null || !Boolean.TRUE.equals(pagina.getActivo())
                || !"INICIO".equals(pagina.getCodigo())
                || !pagina.getIdPagina().equals(borrador.getIdPagina())) {
            throw new IllegalArgumentException("El contrato solo autoriza la página INICIO");
        }
        if (revisionEditorialEsperada == null || revisionEditorialEsperada < 1
                || !revisionEditorialEsperada.equals(borrador.getRevisionEdicion())) {
            throw new ConflictException("La revisión del borrador cambió");
        }
        if (revisionPublicadaActual == null || revisionPublicadaActual < 0
                || revisionPublicadaEsperada == null || revisionPublicadaEsperada < 0
                || !revisionPublicadaActual.equals(revisionPublicadaEsperada)
                || !revisionPublicadaActual.equals(borrador.getRevisionBase())) {
            throw new ConflictException("La versión pública cambió desde la creación del borrador");
        }
        if (revisionPublicadaActual == Long.MAX_VALUE) {
            throw new IllegalArgumentException("Se agotó el rango de revisiones");
        }
        if (seccionesConfiables == null) {
            throw new IllegalArgumentException("No se recibió el catálogo de secciones");
        }
        Map<Long, Seccion> catalogo = new HashMap<>();
        for (Seccion seccion : seccionesConfiables) {
            if (seccion == null || seccion.getIdSeccion() == null
                    || catalogo.putIfAbsent(seccion.getIdSeccion(), seccion) != null) {
                throw new IllegalArgumentException("Catálogo de secciones inconsistente");
            }
        }

        Map<String, Object> pendiente = borrador.getContenidoPendiente();
        if (pendiente == null || pendiente.size() != 1 || !pendiente.containsKey("secciones")
                || !(pendiente.get("secciones") instanceof List<?> cambios)
                || cambios.isEmpty() || cambios.size() > 3) {
            throw new IllegalArgumentException("Formato de borrador no publicable");
        }

        Set<Long> ids = new HashSet<>();
        List<CambioPermitido> permitidos = new ArrayList<>();
        for (Object entrada : cambios) {
            if (!(entrada instanceof Map<?, ?> fila)
                    || fila.isEmpty() || fila.keySet().stream()
                            .anyMatch(k -> !(k instanceof String nombre) || !CAMPOS_BORRADOR.contains(nombre))) {
                throw new IllegalArgumentException("Campos de borrador no autorizados");
            }
            Object idCrudo = fila.get("id_seccion");
            if (!(idCrudo instanceof Number numero) || !esEnteroExacto(numero)) {
                throw new IllegalArgumentException("Identificador de sección no válido");
            }
            long idSeccion = numero.longValue();
            if (idSeccion <= 0 || !ids.add(idSeccion)) {
                throw new IllegalArgumentException("Sección repetida o inválida");
            }
            Seccion seccion = catalogo.get(idSeccion);
            if (seccion == null || !pagina.getIdPagina().equals(seccion.getIdPagina())
                    || !Boolean.TRUE.equals(seccion.getActivo())
                    || !CODIGOS.contains(seccion.getCodigo())) {
                throw new IllegalArgumentException("La sección no pertenece al Hero autorizado");
            }
            boolean principal = PRINCIPAL.equals(seccion.getCodigo());
            if (!principal && (fila.containsKey("titulo") || fila.containsKey("contenido"))) {
                throw new IllegalArgumentException(
                        "Los títulos y descripciones comerciales de slides 2 y 3 no se publican desde Marketing");
            }
            Map<String, String> textos = new LinkedHashMap<>();
            for (String campo : List.of("titulo", "subtitulo", "contenido")) {
                if (!fila.containsKey(campo)) continue;
                Object valor = fila.get(campo);
                if (!(valor instanceof String texto)) {
                    throw new IllegalArgumentException("El texto de " + campo + " es inválido");
                }
                int max = switch (campo) {
                    case "titulo" -> 180;
                    case "subtitulo" -> 255;
                    default -> 10_000;
                };
                if (texto.length() > max || texto.indexOf('<') >= 0 || texto.indexOf('>') >= 0) {
                    throw new IllegalArgumentException("Texto no permitido para " + campo);
                }
                textos.put(campo, texto);
            }
            if (textos.isEmpty() && !idsImagenesValidadas.contains(idSeccion)) {
                throw new IllegalArgumentException("Una sección sin textos necesita una imagen privada validada");
            }
            permitidos.add(new CambioPermitido(idSeccion, seccion.getCodigo(),
                    Boolean.TRUE.equals(seccion.getVisible()),
                    Collections.unmodifiableMap(textos)));
        }
        return new Plan(borrador.getIdBorrador(), pagina.getIdPagina(), idUsuarioPublicador,
                revisionPublicadaActual, revisionPublicadaActual + 1,
                List.copyOf(permitidos));
    }

    private static boolean esEnteroExacto(Number n) {
        if (n instanceof Long || n instanceof Integer || n instanceof Short || n instanceof Byte) return true;
        if (n instanceof java.math.BigInteger big) {
            try { big.longValueExact(); return true; }
            catch (ArithmeticException e) { return false; }
        }
        if (n instanceof java.math.BigDecimal big) {
            try { big.longValueExact(); return true; }
            catch (ArithmeticException e) { return false; }
        }
        return false;
    }

    public record CambioPermitido(Long idSeccion, String codigo,
                                  boolean visibleActualmente, Map<String, String> textos) { }

    public record Plan(Long idBorrador, Long idPagina, Long idUsuarioPublicador,
                       Long revisionAnterior, Long revisionNueva,
                       List<CambioPermitido> cambios) { }
}

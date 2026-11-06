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

public final class CmsPublicacionContrato {

    private static final String PRINCIPAL = "HERO_PRINCIPAL";
    private static final String PROMO_2 = "HERO_SLIDE_2_PROMO";
    private static final String PROMO_3 = "HERO_SLIDE_3_PROMO";

    private static final Set<String> CODIGOS = Set.of(
            PRINCIPAL,
            PROMO_2,
            PROMO_3);

    private static final Set<String> CAMPOS_BORRADOR = Set.of(
            "id_seccion",
            "titulo",
            "subtitulo",
            "contenido");

    private static final int MAX_TITULO = 180;
    private static final int MAX_SUBTITULO = 255;
    private static final int MAX_DESCRIPCION = 500;

    private CmsPublicacionContrato() {
    }

    public static Plan evaluar(
            CmsBorrador borrador,
            Pagina pagina,
            Collection<Seccion> seccionesConfiables,
            Long revisionEditorialEsperada,
            Long revisionPublicadaActual,
            Long revisionPublicadaEsperada,
            Long idUsuarioPublicador) {

        return evaluar(
                borrador,
                pagina,
                seccionesConfiables,
                revisionEditorialEsperada,
                revisionPublicadaActual,
                revisionPublicadaEsperada,
                idUsuarioPublicador,
                Set.of());
    }

    /**
     * Permite una sección sin textos solamente si tiene
     * una imagen privada verificada.
     */
    public static Plan evaluar(
            CmsBorrador borrador,
            Pagina pagina,
            Collection<Seccion> seccionesConfiables,
            Long revisionEditorialEsperada,
            Long revisionPublicadaActual,
            Long revisionPublicadaEsperada,
            Long idUsuarioPublicador,
            Set<Long> idsImagenesValidadas) {

        if (idsImagenesValidadas == null) {
            throw new IllegalArgumentException(
                    "Falta la validación de imágenes privadas");
        }

        if (idUsuarioPublicador == null || idUsuarioPublicador <= 0) {
            throw new IllegalArgumentException(
                    "Usuario publicador inválido");
        }

        if (borrador == null
                || !idUsuarioPublicador.equals(
                        borrador.getIdUsuarioRegistro())) {

            throw new ResourceNotFoundException(
                    "Borrador no encontrado");
        }

        if (borrador.getTipoObjetivo() != TipoObjetivoBorrador.PAGINA
                || borrador.getEstado() != EstadoBorrador.EN_EDICION) {

            throw new ConflictException(
                    "El borrador no es una página en edición");
        }

        if (pagina == null
                || pagina.getIdPagina() == null
                || !Boolean.TRUE.equals(pagina.getActivo())
                || !"INICIO".equals(pagina.getCodigo())
                || !pagina.getIdPagina().equals(borrador.getIdPagina())) {

            throw new IllegalArgumentException(
                    "El contrato solo autoriza la página INICIO");
        }

        if (revisionEditorialEsperada == null
                || revisionEditorialEsperada < 1
                || !revisionEditorialEsperada.equals(
                        borrador.getRevisionEdicion())) {

            throw new ConflictException(
                    "La revisión del borrador cambió");
        }

        if (revisionPublicadaActual == null
                || revisionPublicadaActual < 0
                || revisionPublicadaEsperada == null
                || revisionPublicadaEsperada < 0
                || !revisionPublicadaActual.equals(
                        revisionPublicadaEsperada)
                || !revisionPublicadaActual.equals(
                        borrador.getRevisionBase())) {

            throw new ConflictException(
                    "La versión pública cambió desde la creación del borrador");
        }

        if (revisionPublicadaActual == Long.MAX_VALUE) {
            throw new IllegalArgumentException(
                    "Se agotó el rango de revisiones");
        }

        if (seccionesConfiables == null) {
            throw new IllegalArgumentException(
                    "No se recibió el catálogo de secciones");
        }

        Map<Long, Seccion> catalogo = new HashMap<>();

        for (Seccion seccion : seccionesConfiables) {

            if (seccion == null
                    || seccion.getIdSeccion() == null
                    || catalogo.putIfAbsent(
                            seccion.getIdSeccion(),
                            seccion) != null) {

                throw new IllegalArgumentException(
                        "Catálogo de secciones inconsistente");
            }
        }

        Map<String, Object> pendiente = borrador.getContenidoPendiente();

        if (pendiente == null
                || pendiente.size() != 1
                || !pendiente.containsKey("secciones")
                || !(pendiente.get("secciones") instanceof List<?> cambios)
                || cambios.isEmpty()
                || cambios.size() > 3) {

            throw new IllegalArgumentException(
                    "Formato de borrador no publicable");
        }

        Set<Long> ids = new HashSet<>();
        List<CambioPermitido> permitidos = new ArrayList<>();

        for (Object entrada : cambios) {

            if (!(entrada instanceof Map<?, ?> fila)
                    || fila.isEmpty()
                    || fila.keySet().stream().anyMatch(
                            k -> !(k instanceof String nombre)
                                    || !CAMPOS_BORRADOR.contains(nombre))) {

                throw new IllegalArgumentException(
                        "Campos de borrador no autorizados");
            }

            Object idCrudo = fila.get("id_seccion");

            if (!(idCrudo instanceof Number numero)
                    || !esEnteroExacto(numero)) {

                throw new IllegalArgumentException(
                        "Identificador de sección no válido");
            }

            long idSeccion = numero.longValue();

            if (idSeccion <= 0 || !ids.add(idSeccion)) {
                throw new IllegalArgumentException(
                        "Sección repetida o inválida");
            }

            Seccion seccion = catalogo.get(idSeccion);

            if (seccion == null
                    || !pagina.getIdPagina().equals(
                            seccion.getIdPagina())
                    || !Boolean.TRUE.equals(seccion.getActivo())
                    || !CODIGOS.contains(seccion.getCodigo())) {

                throw new IllegalArgumentException(
                        "La sección no pertenece al Hero autorizado");
            }

            boolean principal = PRINCIPAL.equals(seccion.getCodigo());

            /*
             * Los slides 2 y 3 solo admiten subtítulo.
             * No se aceptan título ni descripción,
             * aunque el valor recibido sea nulo.
             */
            if (!principal
                    && (fila.containsKey("titulo")
                            || fila.containsKey("contenido"))) {

                throw new IllegalArgumentException(
                        "Los slides 2 y 3 solo permiten modificar el subtítulo promocional");
            }

            Map<String, String> textos = new LinkedHashMap<>();

            for (String campo : List.of(
                    "titulo",
                    "subtitulo",
                    "contenido")) {

                if (!fila.containsKey(campo)) {
                    continue;
                }

                Object valor = fila.get(campo);

                if (!(valor instanceof String texto)) {
                    throw new IllegalArgumentException(
                            "El texto de " + campo + " es inválido");
                }

                String normalizado = texto.trim();

                int maximo = switch (campo) {
                    case "titulo" -> MAX_TITULO;
                    case "subtitulo" -> MAX_SUBTITULO;
                    default -> MAX_DESCRIPCION;
                };

                if (normalizado.length() > maximo
                        || normalizado.indexOf('<') >= 0
                        || normalizado.indexOf('>') >= 0) {

                    throw new IllegalArgumentException(
                            "Texto no permitido para " + campo);
                }

                textos.put(campo, normalizado);
            }

            /*
             * El Hero principal requiere título cuando se
             * modifican textos. Una operación exclusiva
             * de imagen no necesita enviar textos.
             */
            if (principal
                    && !textos.isEmpty()
                    && (!textos.containsKey("titulo")
                            || textos.get("titulo").isBlank())) {

                throw new IllegalArgumentException(
                        "El título principal no puede estar vacío");
            }

            /*
             * Una sección sin textos solo puede publicarse
             * cuando existe una imagen privada validada
             * para esa misma sección.
             */
            if (textos.isEmpty()
                    && !idsImagenesValidadas.contains(idSeccion)) {

                throw new IllegalArgumentException(
                        "Una sección sin textos necesita una imagen privada validada");
            }

            permitidos.add(
                    new CambioPermitido(
                            idSeccion,
                            seccion.getCodigo(),
                            Boolean.TRUE.equals(seccion.getVisible()),
                            Collections.unmodifiableMap(textos)));
        }

        return new Plan(
                borrador.getIdBorrador(),
                pagina.getIdPagina(),
                idUsuarioPublicador,
                revisionPublicadaActual,
                revisionPublicadaActual + 1,
                List.copyOf(permitidos));
    }

    private static boolean esEnteroExacto(Number numero) {

        if (numero instanceof Long
                || numero instanceof Integer
                || numero instanceof Short
                || numero instanceof Byte) {

            return true;
        }

        if (numero instanceof java.math.BigInteger big) {
            try {
                big.longValueExact();
                return true;
            } catch (ArithmeticException e) {
                return false;
            }
        }

        if (numero instanceof java.math.BigDecimal big) {
            try {
                big.longValueExact();
                return true;
            } catch (ArithmeticException e) {
                return false;
            }
        }

        return false;
    }

    public record CambioPermitido(
            Long idSeccion,
            String codigo,
            boolean visibleActualmente,
            Map<String, String> textos) {
    }

    public record Plan(
            Long idBorrador,
            Long idPagina,
            Long idUsuarioPublicador,
            Long revisionAnterior,
            Long revisionNueva,
            List<CambioPermitido> cambios) {
    }
}
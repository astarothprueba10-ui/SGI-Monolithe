package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.*;
import monolithe.cms_service.entity.*;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContenidoPublicService {

    private final PaginaService paginaService;
    private final SeccionRepository seccionRepository;
    private final SeccionItemRepository seccionItemRepository;
    private final MultimediaAsignacionRepository asignacionRepository;
    private final MultimediaRepository multimediaRepository;

    @Transactional(readOnly = true)
    public PaginaPublicResponse obtenerPaginaPorCodigo(
            String codigo) {

        Pagina pagina = paginaService
                .buscarPublicadaPorCodigo(
                        codigo.trim().toUpperCase()
                )
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "No existe una página publicada con el código: "
                                        + codigo
                        )
                );

        return construirPagina(pagina);
    }

    @Transactional(readOnly = true)
    public PaginaPublicResponse obtenerPaginaPorRuta(
            String ruta) {

        Pagina pagina = paginaService
                .buscarPublicadaPorRuta(ruta)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "No existe una página publicada con la ruta: "
                                        + ruta
                        )
                );

        return construirPagina(pagina);
    }

    private PaginaPublicResponse construirPagina(
            Pagina pagina) {

        List<SeccionPublicResponse> secciones =
                construirSecciones(pagina.getIdPagina());

        List<MultimediaPublicResponse> multimedia =
                construirMultimediaPagina(
                        pagina.getIdPagina()
                );

        return PaginaPublicResponse.builder()
                .idPagina(pagina.getIdPagina())
                .codigo(pagina.getCodigo())
                .slug(pagina.getSlug())
                .titulo(pagina.getTitulo())
                .descripcion(pagina.getDescripcion())
                .tituloSeo(pagina.getTituloSeo())
                .descripcionSeo(pagina.getDescripcionSeo())
                .orden(pagina.getOrden())
                .mostrarMenu(pagina.getMostrarMenu())
                .fechaPublicacion(pagina.getFechaPublicacion())
                .multimedia(multimedia)
                .secciones(secciones)
                .build();
    }

    private List<SeccionPublicResponse> construirSecciones(
            Long idPagina) {

        List<Seccion> secciones =
                seccionRepository
                        .findByIdPaginaAndVisibleTrueAndActivoTrueOrderByOrdenAsc(
                                idPagina
                        );

        List<SeccionPublicResponse> respuesta =
                new ArrayList<>();

        for (Seccion seccion : secciones) {

            if (!estaVigente(
                    seccion.getFechaDesde(),
                    seccion.getFechaHasta())) {
                continue;
            }

            respuesta.add(
                    SeccionPublicResponse.builder()
                            .idSeccion(seccion.getIdSeccion())
                            .idTipoSeccion(
                                    seccion.getIdTipoSeccion())
                            .codigo(seccion.getCodigo())
                            .titulo(seccion.getTitulo())
                            .subtitulo(seccion.getSubtitulo())
                            .contenido(seccion.getContenido())
                            .configuracion(
                                    seccion.getConfiguracion())
                            .orden(seccion.getOrden())
                            .multimedia(
                                    construirMultimediaSeccion(
                                            seccion.getIdSeccion()
                                    )
                            )
                            .items(
                                    construirItems(
                                            seccion.getIdSeccion()
                                    )
                            )
                            .build()
            );
        }

        return respuesta;
    }

    private List<SeccionItemPublicResponse> construirItems(
            Long idSeccion) {

        List<SeccionItem> items =
                seccionItemRepository
                        .findByIdSeccionAndVisibleTrueAndActivoTrueOrderByOrdenAsc(
                                idSeccion
                        );

        List<SeccionItemPublicResponse> respuesta =
                new ArrayList<>();

        for (SeccionItem item : items) {

            if (!estaVigente(
                    item.getFechaDesde(),
                    item.getFechaHasta())) {
                continue;
            }

            respuesta.add(
                    SeccionItemPublicResponse.builder()
                            .idSeccionItem(
                                    item.getIdSeccionItem())
                            .codigo(item.getCodigo())
                            .titulo(item.getTitulo())
                            .subtitulo(item.getSubtitulo())
                            .contenido(item.getContenido())
                            .textoEnlace(
                                    item.getTextoEnlace())
                            .urlEnlace(
                                    item.getUrlEnlace())
                            .configuracion(
                                    item.getConfiguracion())
                            .orden(item.getOrden())
                            .multimedia(
                                    construirMultimediaItem(
                                            item.getIdSeccionItem()
                                    )
                            )
                            .build()
            );
        }

        return respuesta;
    }

    private List<MultimediaPublicResponse> construirMultimediaPagina(
            Long idPagina) {

        return construirMultimedia(
                asignacionRepository
                        .findByIdPaginaAndVisibleTrueAndActivoTrueOrderByOrdenAsc(
                                idPagina
                        )
        );
    }

    private List<MultimediaPublicResponse> construirMultimediaSeccion(
            Long idSeccion) {

        return construirMultimedia(
                asignacionRepository
                        .findByIdSeccionAndVisibleTrueAndActivoTrueOrderByOrdenAsc(
                                idSeccion
                        )
        );
    }

    private List<MultimediaPublicResponse> construirMultimediaItem(
            Long idSeccionItem) {

        return construirMultimedia(
                asignacionRepository
                        .findByIdSeccionItemAndVisibleTrueAndActivoTrueOrderByOrdenAsc(
                                idSeccionItem
                        )
        );
    }

    private List<MultimediaPublicResponse> construirMultimedia(
            List<MultimediaAsignacion> asignaciones) {

        List<MultimediaPublicResponse> respuesta =
                new ArrayList<>();

        for (MultimediaAsignacion asignacion : asignaciones) {

            if (!estaVigente(
                    asignacion.getFechaDesde(),
                    asignacion.getFechaHasta())) {
                continue;
            }

            multimediaRepository
                    .findById(asignacion.getIdMultimedia())
                    .filter(multimedia ->
                            Boolean.TRUE.equals(
                                    multimedia.getActivo()
                            )
                    )
                    .ifPresent(multimedia ->
                            respuesta.add(
                                    mapearMultimedia(
                                            multimedia,
                                            asignacion
                                    )
                            )
                    );
        }

        return respuesta;
    }

    private MultimediaPublicResponse mapearMultimedia(
            Multimedia multimedia,
            MultimediaAsignacion asignacion) {

        return MultimediaPublicResponse.builder()
                .idMultimedia(
                        multimedia.getIdMultimedia())
                .idUsoMultimedia(
                        asignacion.getIdUsoMultimedia())
                .codigo(
                        multimedia.getCodigo())
                .nombre(
                        multimedia.getNombre())
                .descripcion(
                        multimedia.getDescripcion())
                .claveArchivo(
                        multimedia.getClaveArchivo())
                .urlExterna(
                        multimedia.getUrlExterna())
                .tipoMime(
                        multimedia.getTipoMime())
                .textoAlternativo(
                        multimedia.getTextoAlternativo())
                .anchoPx(
                        multimedia.getAnchoPx())
                .altoPx(
                        multimedia.getAltoPx())
                .duracionSegundos(
                        multimedia.getDuracionSegundos())
                .orden(
                        asignacion.getOrden())
                .build();
    }

    private boolean estaVigente(
            OffsetDateTime fechaDesde,
            OffsetDateTime fechaHasta) {

        OffsetDateTime ahora =
                OffsetDateTime.now(ZoneOffset.UTC);

        if (fechaDesde != null
                && ahora.isBefore(fechaDesde)) {
            return false;
        }

        if (fechaHasta != null
                && ahora.isAfter(fechaHasta)) {
            return false;
        }

        return true;
    }
}
package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.SeccionItemRequest;
import monolithe.cms_service.entity.Seccion;
import monolithe.cms_service.entity.SeccionItem;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.SeccionItemRepository;
import monolithe.cms_service.repository.SeccionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SeccionItemService {

    private final SeccionItemRepository seccionItemRepository;
    private final SeccionRepository seccionRepository;

    public List<SeccionItem> listarPorSeccion(Long idSeccion) {

        validarSeccionActiva(idSeccion);

        return seccionItemRepository
                .findByIdSeccionAndActivoTrueOrderByOrdenAsc(idSeccion);
    }

    @Transactional
    public SeccionItem crear(
            Long idSeccion,
            SeccionItemRequest request,
            Long idUsuario) {

        validarSeccionActiva(idSeccion);

        String codigo = normalizarCodigo(request.getCodigo());

        if (seccionItemRepository.existsByIdSeccionAndCodigo(
                idSeccion,
                codigo)) {

            throw new ConflictException(
                    "Ya existe un ítem con el código: " + codigo
            );
        }

        validarFechas(request);

        SeccionItem item = new SeccionItem();

        item.setIdSeccion(idSeccion);
        aplicarDatos(item, request);
        item.setCodigo(codigo);
        item.setIdUsuarioRegistro(idUsuario);
        item.setActivo(true);

        return seccionItemRepository.save(item);
    }

    @Transactional
    public SeccionItem actualizar(
            Long idSeccionItem,
            SeccionItemRequest request) {

        SeccionItem item = obtenerActivo(idSeccionItem);

        validarSeccionActiva(item.getIdSeccion());

        String codigo = normalizarCodigo(request.getCodigo());

        if (seccionItemRepository
                .existsByIdSeccionAndCodigoAndIdSeccionItemNot(
                        item.getIdSeccion(),
                        codigo,
                        idSeccionItem
                )) {

            throw new ConflictException(
                    "Ya existe otro ítem con el código: " + codigo
            );
        }

        validarFechas(request);

        aplicarDatos(item, request);
        item.setCodigo(codigo);

        return seccionItemRepository.save(item);
    }

    @Transactional
    public SeccionItem cambiarVisibilidad(
            Long idSeccionItem,
            boolean visible) {

        SeccionItem item = obtenerActivo(idSeccionItem);

        item.setVisible(visible);

        return seccionItemRepository.save(item);
    }

    @Transactional
    public void eliminar(
            Long idSeccionItem) {

        SeccionItem item = obtenerActivo(idSeccionItem);

        item.setActivo(false);
        item.setVisible(false);

        seccionItemRepository.save(item);
    }

    private SeccionItem obtenerActivo(Long idSeccionItem) {

        return seccionItemRepository
                .findById(idSeccionItem)
                .filter(item ->
                        Boolean.TRUE.equals(item.getActivo())
                )
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "No existe un ítem de sección activo con id: "
                                        + idSeccionItem
                        )
                );
    }

    private Seccion validarSeccionActiva(Long idSeccion) {

        return seccionRepository
                .findById(idSeccion)
                .filter(seccion ->
                        Boolean.TRUE.equals(seccion.getActivo())
                )
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "No existe una sección activa con id: "
                                        + idSeccion
                        )
                );
    }

    private void aplicarDatos(
            SeccionItem item,
            SeccionItemRequest request) {

        item.setTitulo(limpiar(request.getTitulo()));
        item.setSubtitulo(limpiar(request.getSubtitulo()));
        item.setContenido(limpiar(request.getContenido()));
        item.setTextoEnlace(limpiar(request.getTextoEnlace()));
        item.setUrlEnlace(limpiar(request.getUrlEnlace()));
        item.setConfiguracion(request.getConfiguracion());

        item.setOrden(
                request.getOrden() != null
                        ? request.getOrden()
                        : 0
        );

        item.setVisible(
                request.getVisible() == null
                        || request.getVisible()
        );

        item.setFechaDesde(request.getFechaDesde());
        item.setFechaHasta(request.getFechaHasta());
    }

    private void validarFechas(
            SeccionItemRequest request) {

        if (request.getFechaDesde() != null
                && request.getFechaHasta() != null
                && request.getFechaHasta()
                .isBefore(request.getFechaDesde())) {

            throw new IllegalArgumentException(
                    "La fecha final no puede ser anterior a la fecha inicial"
            );
        }
    }

    private String normalizarCodigo(String codigo) {
        return codigo.trim().toUpperCase();
    }

    private String limpiar(String valor) {

        if (valor == null) {
            return null;
        }

        String resultado = valor.trim();

        return resultado.isEmpty()
                ? null
                : resultado;
    }
}
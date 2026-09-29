package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.MultimediaRequest;
import monolithe.cms_service.entity.Multimedia;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.MultimediaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MultimediaService {

    private final MultimediaRepository multimediaRepository;
    private final CatalogoMultimediaService catalogoMultimediaService;

    public List<Multimedia> listarActivos() {
        return multimediaRepository
                .findByActivoTrueOrderByFechaCreacionDesc();
    }

    public Multimedia buscarActivo(Long idMultimedia) {
        return multimediaRepository
                .findById(idMultimedia)
                .filter(multimedia -> Boolean.TRUE.equals(multimedia.getActivo()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe un recurso multimedia activo con id: "
                                + idMultimedia));
    }

    @Transactional
    public Multimedia crear(
            MultimediaRequest request,
            Long idUsuario) {

        String codigo = normalizarCodigo(request.getCodigo());

        catalogoMultimediaService.obtenerTipoActivo(
                request.getIdTipoMultimedia());

        if (multimediaRepository.existsByCodigo(codigo)) {
            throw new ConflictException(
                    "Ya existe un recurso multimedia con el código: "
                            + codigo);
        }

        validarOrigen(request);

        Multimedia multimedia = new Multimedia();

        multimedia.setCodigo(codigo);
        multimedia.setIdUsuarioRegistro(idUsuario);
        multimedia.setActivo(true);

        aplicarDatos(multimedia, request);

        return multimediaRepository.save(multimedia);
    }

    @Transactional
    public Multimedia actualizar(
            Long idMultimedia,
            MultimediaRequest request) {

        Multimedia multimedia = buscarActivo(idMultimedia);

        catalogoMultimediaService.obtenerTipoActivo(
                request.getIdTipoMultimedia());

        String codigo = normalizarCodigo(request.getCodigo());

        if (multimediaRepository
                .existsByCodigoAndIdMultimediaNot(
                        codigo,
                        idMultimedia)) {

            throw new ConflictException(
                    "Ya existe otro recurso multimedia con el código: "
                            + codigo);
        }

        validarOrigen(request);

        multimedia.setCodigo(codigo);

        aplicarDatos(multimedia, request);

        return multimediaRepository.save(multimedia);
    }

    @Transactional
    public Multimedia cambiarEstado(
            Long idMultimedia,
            boolean activo) {

        Multimedia multimedia = multimediaRepository
                .findById(idMultimedia)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe un recurso multimedia con id: "
                                + idMultimedia));

        multimedia.setActivo(activo);

        return multimediaRepository.save(multimedia);
    }

    private void aplicarDatos(
            Multimedia multimedia,
            MultimediaRequest request) {

        multimedia.setIdTipoMultimedia(
                request.getIdTipoMultimedia());

        multimedia.setNombre(
                request.getNombre().trim());

        multimedia.setDescripcion(
                limpiar(request.getDescripcion()));

        multimedia.setNombreArchivoOriginal(
                limpiar(request.getNombreArchivoOriginal()));

        multimedia.setClaveArchivo(
                limpiar(request.getClaveArchivo()));

        multimedia.setUrlExterna(
                limpiar(request.getUrlExterna()));

        multimedia.setTipoMime(
                limpiar(request.getTipoMime()));

        multimedia.setTamanioBytes(
                request.getTamanioBytes());

        multimedia.setHashSha256(
                limpiar(request.getHashSha256()));

        multimedia.setTextoAlternativo(
                limpiar(request.getTextoAlternativo()));

        multimedia.setAnchoPx(
                request.getAnchoPx());

        multimedia.setAltoPx(
                request.getAltoPx());

        multimedia.setDuracionSegundos(
                request.getDuracionSegundos());
    }

    private void validarOrigen(
            MultimediaRequest request) {

        boolean tieneClave = request.getClaveArchivo() != null
                && !request.getClaveArchivo().isBlank();

        boolean tieneUrl = request.getUrlExterna() != null
                && !request.getUrlExterna().isBlank();

        if (tieneClave == tieneUrl) {
            throw new IllegalArgumentException(
                    "Debe especificarse exactamente uno entre claveArchivo o urlExterna");
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
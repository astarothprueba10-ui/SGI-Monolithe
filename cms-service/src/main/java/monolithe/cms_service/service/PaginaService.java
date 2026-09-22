package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.PaginaRequest;
import monolithe.cms_service.entity.Estado;
import monolithe.cms_service.entity.Pagina;
import monolithe.cms_service.repository.PaginaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PaginaService {

    private final PaginaRepository paginaRepository;
    private final EstadoService estadoService;

    public List<Pagina> listarActivas() {
        return paginaRepository.findByActivoTrueOrderByOrdenAsc();
    }

    public Optional<Pagina> buscarPorCodigo(String codigo) {
        return paginaRepository.findByCodigoAndActivoTrue(codigo);
    }

    public Optional<Pagina> buscarPorRuta(String ruta) {
        return paginaRepository.findByRutaAndActivoTrue(ruta);
    }

    public List<Pagina> listarPublicadas() {

        Estado publicado =
                estadoService.obtenerPublicado();

        return paginaRepository
                .findByIdEstadoAndActivoTrueOrderByOrdenAsc(
                        publicado.getIdEstado()
                );
    }

    public Optional<Pagina> buscarPublicadaPorCodigo(
            String codigo) {

        Estado publicado =
                estadoService.obtenerPublicado();

        return paginaRepository
                .findByCodigoAndIdEstadoAndActivoTrue(
                        codigo,
                        publicado.getIdEstado()
                );
    }

    public Optional<Pagina> buscarPublicadaPorRuta(
            String ruta) {

        Estado publicado =
                estadoService.obtenerPublicado();

        return paginaRepository
                .findByRutaAndIdEstadoAndActivoTrue(
                        ruta,
                        publicado.getIdEstado()
                );
    }

    @Transactional
    public Pagina crearPagina(
            PaginaRequest request,
            Long idUsuario) {

        String codigo = request
                .getCodigo()
                .trim()
                .toUpperCase();

        String ruta = normalizarRuta(request.getRuta());

        if (paginaRepository.existsByCodigo(codigo)) {
            throw new IllegalArgumentException(
                    "Ya existe una página con el código: " + codigo
            );
        }

        if (paginaRepository.existsByRuta(ruta)) {
            throw new IllegalArgumentException(
                    "Ya existe una página con la ruta: " + ruta
            );
        }

        Estado borrador =
                estadoService.obtenerBorrador();

        Pagina pagina = new Pagina();

        pagina.setIdEstado(
                borrador.getIdEstado());

        pagina.setIdUsuarioRegistra(
                idUsuario);

        pagina.setCodigo(
                codigo);

        pagina.setRuta(
                ruta);

        pagina.setTitulo(
                request.getTitulo().trim());

        pagina.setDescripcion(
                limpiar(request.getDescripcion()));

        pagina.setTituloSeo(
                limpiar(request.getTituloSeo()));

        pagina.setDescripcionSeo(
                limpiar(request.getDescripcionSeo()));

        pagina.setOrden(
                request.getOrden() != null
                        ? request.getOrden()
                        : 0);

        pagina.setMostrarMenu(
                request.getMostrarMenu() == null
                        || request.getMostrarMenu());

        pagina.setActivo(true);

        return paginaRepository.save(pagina);
    }

    private String normalizarRuta(String ruta) {

        String resultado =
                ruta.trim().toLowerCase();

        if (!resultado.startsWith("/")) {
            resultado = "/" + resultado;
        }

        return resultado;
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
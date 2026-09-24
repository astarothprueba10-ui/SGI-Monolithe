package monolithe.cms_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.entity.Pagina;
import monolithe.cms_service.service.PaginaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/paginas")
@RequiredArgsConstructor
public class PaginaPublicController {

    private final PaginaService paginaService;

    @GetMapping
    public List<Pagina> listarPaginasPublicadas() {
        return paginaService.listarPublicadas();
    }

    @GetMapping("/codigo/{codigo}")
    public ResponseEntity<Pagina> buscarPorCodigo(
            @PathVariable String codigo) {

        return paginaService
                .buscarPublicadaPorCodigo(
                        codigo.trim().toUpperCase()
                )
                .map(ResponseEntity::ok)
                .orElseGet(() ->
                        ResponseEntity.notFound().build()
                );
    }
}
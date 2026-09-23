package monolithe.cms_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.ProyectoSummaryResponse;
import monolithe.cms_service.service.ProyectoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controlador público para el catálogo de proyectos inmobiliarios.
 */
@RestController
@RequestMapping("/api/public/proyectos")
@RequiredArgsConstructor
public class ProyectoPublicController {

    private final ProyectoService proyectoService;

    /**
     * Lista todos los proyectos disponibles para la web pública.
     */
    @GetMapping
    public List<ProyectoSummaryResponse> listarProyectos() {
        return proyectoService.listarProyectosPublicos();
    }

    /**
     * Retorna los detalles de un proyecto por su ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProyectoSummaryResponse> buscarPorId(@PathVariable Long id) {
        return proyectoService.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Retorna los detalles de un proyecto por su código comercial.
     */
    @GetMapping("/codigo/{codigo}")
    public ResponseEntity<ProyectoSummaryResponse> buscarPorCodigo(@PathVariable String codigo) {
        return proyectoService.buscarPorCodigo(codigo)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}

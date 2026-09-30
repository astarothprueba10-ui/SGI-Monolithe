package monolithe.cms_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.CmsProyectoRequest;
import monolithe.cms_service.entity.CmsProyecto;
import monolithe.cms_service.service.CmsProyectoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cms/proyectos")
@RequiredArgsConstructor
public class CmsProyectoController {

    private final CmsProyectoService cmsProyectoService;

    @GetMapping
    public List<CmsProyecto> listar() {
        return cmsProyectoService.listarActivos();
    }

    @PostMapping
    public ResponseEntity<CmsProyecto> crear(
            @Valid @RequestBody CmsProyectoRequest request) {

        CmsProyecto cmsProyecto = cmsProyectoService.crear(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(cmsProyecto);
    }

    @PutMapping("/{idCmsProyecto}")
    public ResponseEntity<CmsProyecto> actualizar(
            @PathVariable Long idCmsProyecto,
            @Valid @RequestBody CmsProyectoRequest request) {

        CmsProyecto cmsProyecto = cmsProyectoService.actualizar(
                idCmsProyecto,
                request);

        return ResponseEntity.ok(cmsProyecto);
    }

    @PatchMapping("/{idCmsProyecto}/estado")
    public ResponseEntity<CmsProyecto> cambiarEstado(
            @PathVariable Long idCmsProyecto,
            @RequestParam boolean activo) {

        CmsProyecto cmsProyecto = cmsProyectoService.cambiarEstado(
                idCmsProyecto,
                activo);

        return ResponseEntity.ok(cmsProyecto);
    }
}
package monolithe.core_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.UbigeoResponse;
import monolithe.core_service.service.UbigeoService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Expone el catálogo geográfico a los usuarios autorizados del módulo de proyectos. */
@RestController
@RequestMapping("/api/core/ubigeos")
@RequiredArgsConstructor
public class UbigeoController {
    private final UbigeoService ubigeoService;

    /** Devuelve departamentos, provincias y distritos en una única consulta autenticada. */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('projects.view', 'projects.create', 'projects.edit')")
    public List<UbigeoResponse> listar() {
        return ubigeoService.listar();
    }
}

package monolithe.core_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.service.PlanoCadStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/core/planos/proyecto/{idProyecto}/archivos")
@RequiredArgsConstructor
public class PlanoCadStorageController {
    private final PlanoCadStorageService service;

    @GetMapping
    @PreAuthorize("hasAuthority('lots.view')")
    public List<PlanoCadStorageService.Ficha> listar(@PathVariable Long idProyecto) {
        return service.listar(idProyecto);
    }

    @PostMapping(consumes="multipart/form-data")
    @PreAuthorize("hasAuthority('lots.configure')")
    public PlanoCadStorageService.Ficha importar(@PathVariable Long idProyecto,
        @AuthenticationPrincipal Jwt jwt,@RequestParam("archivo") MultipartFile archivo) {
        Long actor;
        try {actor=Long.valueOf(jwt.getSubject());}
        catch(RuntimeException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Identidad inválida.");
        }
        return service.cargar(idProyecto,actor,archivo);
    }

    @GetMapping("/{idArchivo}/enlace")
    @PreAuthorize("hasAuthority('lots.view')")
    public PlanoCadStorageService.Descarga descargar(@PathVariable Long idProyecto,
        @PathVariable Long idArchivo) {
        return service.firmarDescarga(idProyecto,idArchivo);
    }
}

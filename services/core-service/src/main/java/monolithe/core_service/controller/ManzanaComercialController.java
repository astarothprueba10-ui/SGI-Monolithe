package monolithe.core_service.controller;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ManzanaComercialDto.*;
import monolithe.core_service.service.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/core/proyectos/{idProyecto}/manzanas-comerciales")
@RequiredArgsConstructor
public class ManzanaComercialController {
    private final ManzanaComercialService service;
    @GetMapping
    @PreAuthorize("hasAuthority('projects.view')")
    public Listado listar(@PathVariable Long idProyecto){return service.listar(idProyecto);}
    @PutMapping
    @PreAuthorize("hasAuthority('ROLE_GERENCIA') and hasAuthority('projects.view') and hasAuthority('projects.edit') and hasAuthority('lots.edit')")
    public Listado guardar(@PathVariable Long idProyecto,@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Cambio req){
        return service.guardar(idProyecto,Long.valueOf(jwt.getSubject()),req);
    }
}

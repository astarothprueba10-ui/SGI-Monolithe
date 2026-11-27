package monolithe.core_service.controller;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.LoteComercialDto.*;
import monolithe.core_service.service.LoteComercialService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/core/proyectos/{idProyecto}/lotes-comerciales")
@RequiredArgsConstructor
public class LoteComercialController {
 private final LoteComercialService service;
 @GetMapping @PreAuthorize("hasAuthority('lots.view')")
 public Listado listar(@PathVariable Long idProyecto){return service.listar(idProyecto);}
 @PostMapping("/revisar") @PreAuthorize("hasAuthority('ROLE_GERENCIA') and hasAuthority('projects.edit') and hasAuthority('lots.edit')")
 public Vista revisar(@PathVariable Long idProyecto,@Valid @RequestBody Consulta q){return service.revisar(idProyecto,q);}
 @PutMapping @PreAuthorize("hasAuthority('ROLE_GERENCIA') and hasAuthority('projects.edit') and hasAuthority('lots.edit')")
 public Listado guardar(@PathVariable Long idProyecto,@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Cambio q){
   return service.guardar(idProyecto,Long.valueOf(jwt.getSubject()),q);
 }
}

package monolithe.cms_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.SeccionRequest;
import monolithe.cms_service.entity.Seccion;
import monolithe.cms_service.service.SeccionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cms")
@RequiredArgsConstructor
public class SeccionCmsController {

    private final SeccionService seccionService;

    @GetMapping("/paginas/{idPagina}/secciones")
    public List<Seccion> listarSecciones(
            @PathVariable Long idPagina) {

        return seccionService.listarPorPagina(idPagina);
    }

    @PostMapping("/paginas/{idPagina}/secciones")
    public ResponseEntity<Seccion> crearSeccion(
            @PathVariable Long idPagina,
            @Valid @RequestBody SeccionRequest request,
            JwtAuthenticationToken authentication) {

        Long idUsuario = obtenerIdUsuario(authentication);

        Seccion seccion = seccionService.crearSeccion(
                idPagina,
                request,
                idUsuario);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(seccion);
    }

    @PutMapping("/secciones/{idSeccion}")
    public ResponseEntity<Seccion> actualizarSeccion(
            @PathVariable Long idSeccion,
            @Valid @RequestBody SeccionRequest request) {

        Seccion seccion = seccionService.actualizarSeccion(
                idSeccion,
                request);

        return ResponseEntity.ok(seccion);
    }

    @PatchMapping("/secciones/{idSeccion}/visibilidad")
    public ResponseEntity<Seccion> cambiarVisibilidad(
            @PathVariable Long idSeccion,
            @RequestParam boolean visible) {

        Seccion seccion = seccionService.cambiarVisibilidad(
                idSeccion,
                visible);

        return ResponseEntity.ok(seccion);
    }

    @DeleteMapping("/secciones/{idSeccion}")
    public ResponseEntity<Void> eliminarSeccion(
            @PathVariable Long idSeccion) {

        seccionService.eliminarSeccion(idSeccion);

        return ResponseEntity.noContent().build();
    }

    private Long obtenerIdUsuario(
            JwtAuthenticationToken authentication) {

        String subject = authentication.getToken().getSubject();

        if (subject == null || subject.isBlank()) {
            throw new IllegalStateException(
                    "El token no contiene el identificador del usuario");
        }

        try {
            return Long.valueOf(subject);
        } catch (NumberFormatException ex) {
            throw new IllegalStateException(
                    "El identificador del usuario del token no es válido");
        }
    }
}
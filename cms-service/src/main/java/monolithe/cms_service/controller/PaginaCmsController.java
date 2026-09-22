package monolithe.cms_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.PaginaRequest;
import monolithe.cms_service.entity.Pagina;
import monolithe.cms_service.service.PaginaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cms/paginas")
@RequiredArgsConstructor
public class PaginaCmsController {

    private final PaginaService paginaService;

    @GetMapping
    public List<Pagina> listarPaginas() {
        return paginaService.listarActivas();
    }

    @PostMapping
    public ResponseEntity<Pagina> crearPagina(
            @Valid @RequestBody PaginaRequest request,
            JwtAuthenticationToken authentication) {

        Long idUsuario = obtenerIdUsuario(authentication);

        Pagina pagina =
                paginaService.crearPagina(
                        request,
                        idUsuario
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(pagina);
    }

    private Long obtenerIdUsuario(
            JwtAuthenticationToken authentication) {

        String subject =
                authentication.getToken().getSubject();

        if (subject == null || subject.isBlank()) {
            throw new IllegalStateException(
                    "El token no contiene el identificador del usuario"
            );
        }

        try {
            return Long.valueOf(subject);
        } catch (NumberFormatException ex) {
            throw new IllegalStateException(
                    "El identificador del usuario del token no es válido"
            );
        }
    }
}
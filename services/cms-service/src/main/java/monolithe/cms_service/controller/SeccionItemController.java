package monolithe.cms_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.SeccionItemRequest;
import monolithe.cms_service.entity.SeccionItem;
import monolithe.cms_service.service.SeccionItemService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cms")
@RequiredArgsConstructor
public class SeccionItemController {

        private final SeccionItemService seccionItemService;

        @GetMapping("/secciones/{idSeccion}/items")
        public List<SeccionItem> listar(
                        @PathVariable Long idSeccion,
                        @RequestParam(defaultValue = "false") boolean incluirInactivos) {

                return seccionItemService.listarPorSeccion(
                                idSeccion,
                                incluirInactivos);
        }

        @PostMapping("/secciones/{idSeccion}/items")
        public ResponseEntity<SeccionItem> crear(
                        @PathVariable Long idSeccion,
                        @Valid @RequestBody SeccionItemRequest request,
                        JwtAuthenticationToken authentication) {

                Long idUsuario = obtenerIdUsuario(authentication);

                SeccionItem item = seccionItemService.crear(
                                idSeccion,
                                request,
                                idUsuario);

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(item);
        }

        @PutMapping("/seccion-items/{idSeccionItem}")
        public ResponseEntity<SeccionItem> actualizar(
                        @PathVariable Long idSeccionItem,
                        @Valid @RequestBody SeccionItemRequest request) {

                SeccionItem item = seccionItemService.actualizar(
                                idSeccionItem,
                                request);

                return ResponseEntity.ok(item);
        }

        @PatchMapping("/seccion-items/{idSeccionItem}/visibilidad")
        public ResponseEntity<SeccionItem> cambiarVisibilidad(
                        @PathVariable Long idSeccionItem,
                        @RequestParam boolean visible) {

                SeccionItem item = seccionItemService.cambiarVisibilidad(
                                idSeccionItem,
                                visible);

                return ResponseEntity.ok(item);
        }

        @PatchMapping("/seccion-items/{idSeccionItem}/estado")
        public ResponseEntity<SeccionItem> cambiarEstado(
                        @PathVariable Long idSeccionItem,
                        @RequestParam boolean activo) {

                SeccionItem item = seccionItemService.cambiarEstado(
                                idSeccionItem,
                                activo);

                return ResponseEntity.ok(item);
        }

        @DeleteMapping("/seccion-items/{idSeccionItem}")
        public ResponseEntity<Void> eliminar(
                        @PathVariable Long idSeccionItem) {

                seccionItemService.eliminar(idSeccionItem);

                return ResponseEntity
                                .noContent()
                                .build();
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
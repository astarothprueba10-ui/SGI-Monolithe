package monolithe.cms_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.MultimediaRequest;
import monolithe.cms_service.entity.Multimedia;
import monolithe.cms_service.service.MultimediaService;
import monolithe.cms_service.dto.StorageUploadResponse;
import monolithe.cms_service.service.SupabaseStorageService;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cms/multimedia")
@RequiredArgsConstructor
public class MultimediaController {

        private final MultimediaService multimediaService;
        private final SupabaseStorageService supabaseStorageService;

        @GetMapping
        public List<Multimedia> listar() {
                return multimediaService.listarActivos();
        }

        @GetMapping("/{idMultimedia}")
        public ResponseEntity<Multimedia> buscar(
                        @PathVariable Long idMultimedia) {

                return ResponseEntity.ok(
                                multimediaService.buscarActivo(idMultimedia));
        }

        @PostMapping
        public ResponseEntity<Multimedia> crear(
                        @Valid @RequestBody MultimediaRequest request,
                        JwtAuthenticationToken authentication) {

                Long idUsuario = obtenerIdUsuario(authentication);

                Multimedia multimedia = multimediaService.crear(
                                request,
                                idUsuario);

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(multimedia);
        }

        @PutMapping("/{idMultimedia}")
        public ResponseEntity<Multimedia> actualizar(
                        @PathVariable Long idMultimedia,
                        @Valid @RequestBody MultimediaRequest request) {

                Multimedia multimedia = multimediaService.actualizar(
                                idMultimedia,
                                request);

                return ResponseEntity.ok(multimedia);
        }

        @PatchMapping("/{idMultimedia}/estado")
        public ResponseEntity<Multimedia> cambiarEstado(
                        @PathVariable Long idMultimedia,
                        @RequestParam boolean activo) {

                Multimedia multimedia = multimediaService.cambiarEstado(
                                idMultimedia,
                                activo);

                return ResponseEntity.ok(multimedia);
        }

        @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        public ResponseEntity<StorageUploadResponse> subirArchivo(
                        @RequestParam("archivo") MultipartFile archivo,
                        @RequestParam(value = "carpeta", defaultValue = "general") String carpeta) {

                String claveArchivo = supabaseStorageService.subirArchivo(
                                archivo,
                                carpeta);

                String urlPublica = supabaseStorageService.obtenerUrlPublica(
                                claveArchivo);

                StorageUploadResponse response = new StorageUploadResponse(
                                claveArchivo,
                                urlPublica,
                                archivo.getOriginalFilename(),
                                archivo.getContentType(),
                                archivo.getSize());

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(response);
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
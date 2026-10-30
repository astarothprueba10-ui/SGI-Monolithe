package monolithe.cms_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.CmsBorradorImagenResponse;
import monolithe.cms_service.service.CmsBorradorImagenService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/cms/borradores/{idBorrador}/imagenes")
@RequiredArgsConstructor
public class CmsBorradorImagenController {
    private final CmsBorradorImagenService service;

    @GetMapping
    public List<CmsBorradorImagenResponse> listar(@PathVariable Long idBorrador,
            JwtAuthenticationToken jwt) {
        return service.listar(idBorrador, usuario(jwt));
    }

    @PutMapping(path = "/{idSeccion}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CmsBorradorImagenResponse guardar(@PathVariable Long idBorrador,
            @PathVariable Long idSeccion, @RequestParam Long revisionEsperada,
            @RequestPart("archivo") MultipartFile archivo, JwtAuthenticationToken jwt) {
        return service.guardar(idBorrador, idSeccion, revisionEsperada, usuario(jwt), archivo);
    }

    @GetMapping("/{idSeccion}")
    public ResponseEntity<byte[]> obtener(@PathVariable Long idBorrador,
            @PathVariable Long idSeccion, JwtAuthenticationToken jwt) {
        var imagen = service.obtener(idBorrador, idSeccion, usuario(jwt));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .contentType(MediaType.parseMediaType(imagen.mimeType()))
                .body(imagen.contenido());
    }

    @DeleteMapping("/{idSeccion}")
    public CmsBorradorImagenResponse quitar(@PathVariable Long idBorrador,
            @PathVariable Long idSeccion, @RequestParam Long revisionEsperada,
            JwtAuthenticationToken jwt) {
        Long revision = service.quitar(idBorrador, idSeccion, revisionEsperada, usuario(jwt));
        return new CmsBorradorImagenResponse(idBorrador, idSeccion, null, null, null, revision);
    }

    private static Long usuario(JwtAuthenticationToken jwt) {
        try {
            Long id = Long.valueOf(jwt.getToken().getSubject());
            if (id <= 0) throw new NumberFormatException();
            return id;
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("El JWT no contiene un identificador de usuario valido");
        }
    }
}

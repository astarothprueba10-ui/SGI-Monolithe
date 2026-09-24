package monolithe.cms_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.ConsultaWebRequest;
import monolithe.cms_service.dto.ConsultaWebResponse;
import monolithe.cms_service.service.ConsultaWebService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador público para la recepción de consultas y leads desde la web pública.
 */
@RestController
@RequestMapping("/api/public/consultas")
@RequiredArgsConstructor
public class ConsultaPublicController {

    private final ConsultaWebService consultaWebService;

    /**
     * Endpoint público para enviar una consulta desde el formulario de contacto o lead form.
     */
    @PostMapping
    public ResponseEntity<ConsultaWebResponse> registrarConsulta(
            @Valid @RequestBody ConsultaWebRequest request) {

        ConsultaWebResponse respuesta = consultaWebService.registrarConsulta(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }
}

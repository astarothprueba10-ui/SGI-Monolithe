package monolithe.cms_service.controller;

import monolithe.cms_service.config.SecurityConfig;
import monolithe.cms_service.dto.CmsBorradorImagenResponse;
import monolithe.cms_service.exception.GlobalExceptionHandler;
import monolithe.cms_service.service.CmsBorradorImagenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = CmsBorradorImagenController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@TestPropertySource(properties = "security.cors.allowed-origins=http://localhost:5174")
class CmsBorradorImagenControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean CmsBorradorImagenService service;
    @MockitoBean JwtDecoder decoder;

    private static MockMultipartFile archivo() {
        return new MockMultipartFile("archivo", "foto.jpg", "image/jpeg",
                new byte[]{(byte)255, (byte)216, (byte)255, (byte)255, (byte)217});
    }

    @Test void subirRequiereSesion() throws Exception {
        mvc.perform(multipart("/api/cms/borradores/5/imagenes/9").file(archivo())
                        .with(request -> {request.setMethod("PUT"); return request;})
                        .param("revisionEsperada", "1"))
                .andExpect(status().isUnauthorized());
    }

    @Test void subirRequierePermisoEdit() throws Exception {
        mvc.perform(multipart("/api/cms/borradores/5/imagenes/9").file(archivo())
                        .with(request -> {request.setMethod("PUT"); return request;})
                        .param("revisionEsperada", "1")
                        .with(jwt().jwt(j -> j.subject("7"))
                                .authorities(new SimpleGrantedAuthority("web_content.view"))))
                .andExpect(status().isForbidden());
    }

    @Test void subirUsaUsuarioJwt() throws Exception {
        when(service.guardar(eq(5L), eq(9L), eq(1L), eq(7L), any()))
                .thenReturn(new CmsBorradorImagenResponse(5L, 9L, "image/jpeg", 5L, "hash", 2L));
        mvc.perform(multipart("/api/cms/borradores/5/imagenes/9").file(archivo())
                        .with(request -> {request.setMethod("PUT"); return request;})
                        .param("revisionEsperada", "1")
                        .with(jwt().jwt(j -> j.subject("7"))
                                .authorities(new SimpleGrantedAuthority("web_content.edit"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revisionEdicion").value(2))
                .andExpect(jsonPath("$.objectKey").doesNotExist());
        verify(service).guardar(eq(5L), eq(9L), eq(1L), eq(7L), any());
    }

    @Test void imagenPrivadaRequiereView() throws Exception {
        mvc.perform(get("/api/cms/borradores/5/imagenes/9")
                        .with(jwt().jwt(j -> j.subject("7"))
                                .authorities(new SimpleGrantedAuthority("web_content.edit"))))
                .andExpect(status().isForbidden());
    }

    @Test void permiteLeerImagenConViewYNoStore() throws Exception {
        when(service.obtener(5L, 9L, 7L)).thenReturn(
                new CmsBorradorImagenService.ImagenPrivada(new byte[]{1,2,3}, "image/png"));
        mvc.perform(get("/api/cms/borradores/5/imagenes/9")
                        .with(jwt().jwt(j -> j.subject("7"))
                                .authorities(new SimpleGrantedAuthority("web_content.view"))))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test void quitarRequiereEdit() throws Exception {
        mvc.perform(delete("/api/cms/borradores/5/imagenes/9?revisionEsperada=1")
                        .with(jwt().jwt(j -> j.subject("7"))
                                .authorities(new SimpleGrantedAuthority("web_content.view"))))
                .andExpect(status().isForbidden());
    }
}

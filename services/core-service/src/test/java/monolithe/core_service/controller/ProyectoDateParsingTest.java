package monolithe.core_service.controller;

import monolithe.core_service.exception.GlobalExceptionHandler;
import monolithe.core_service.service.ProyectoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProyectoDateParsingTest {
    private ProyectoService service;
    private MockMvc mvc;

    @BeforeEach
    void preparar() {
        service = mock(ProyectoService.class);
        mvc = MockMvcBuilders.standaloneSetup(new ProyectoController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"2023-02-29", "2026-02-30", "2026-04-31", "fecha inválida"})
    void rechazaFechasInexistentesAntesDeInvocarElServicio(String fecha) throws Exception {
        String json = """
                {"codigoEstadoProyecto":"PLANIFICADO","codigo":"PROJ-001","nombre":"Proyecto",
                 "fechaInicio":"%s"}
                """.formatted(fecha);
        mvc.perform(post("/api/core/proyectos").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}

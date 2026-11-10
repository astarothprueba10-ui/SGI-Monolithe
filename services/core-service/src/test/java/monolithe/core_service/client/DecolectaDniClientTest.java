package monolithe.core_service.client;

import java.net.SocketTimeoutException;
import monolithe.core_service.exception.ConsultaIdentidadNoDisponibleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class DecolectaDniClientTest {
    private static final String URL = "https://api.decolecta.com/v1/reniec/dni?numero=00000001";
    private static final String BODY = """
            {"document_number":"00000001","first_name":"Lucía","first_last_name":"Prueba","second_last_name":"Ejemplo"}
            """;
    private RestTemplate rest;
    private MockRestServiceServer server;
    private DecolectaDniClient client;

    @BeforeEach
    void preparar() {
        rest = new RestTemplate();
        server = MockRestServiceServer.bindTo(rest).build();
        client = new DecolectaDniClient(rest, JsonMapper.builder().build(), "clave-ficticia-de-prueba");
    }

    @Test
    void enviaTokenSoloEnCabeceraYRecuperaLosApellidosSeparados() {
        server.expect(requestTo(URL)).andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer clave-ficticia-de-prueba"))
                .andRespond(withSuccess(BODY, MediaType.APPLICATION_JSON));
        var persona = client.consultar("00000001").orElseThrow();
        assertEquals("Lucía", persona.nombres());
        assertEquals("Prueba", persona.apellidoPaterno());
        assertEquals("Ejemplo", persona.apellidoMaterno());
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "{", "null", "{}", "{\"document_number\":\"00000002\",\"first_name\":\"Lucía\",\"first_last_name\":\"Prueba\"}"})
    void noAceptaRespuestasIncompletasOMezclaPersonas(String body) {
        server.expect(requestTo(URL)).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        assertThrows(ConsultaIdentidadNoDisponibleException.class, () -> client.consultar("00000001"));
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(ints = {301, 401, 403, 429, 500})
    void lasFallasExternasNoPublicanLaRespuestaDelProveedor(int status) {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.valueOf(status))
                .body("detalle privado del proveedor"));
        var error = assertThrows(ConsultaIdentidadNoDisponibleException.class, () -> client.consultar("00000001"));
        assertFalse(error.getMessage().contains("privado"));
        server.verify();
    }

    @Test
    void devuelveAusenciaSoloCuandoElProveedorIndicaNoEncontrado() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.NOT_FOUND));
        assertTrue(client.consultar("00000001").isEmpty());
        server.verify();
    }

    @Test
    void unTimeoutPermiteQueElCrmContinúeConElRegistroManual() {
        server.expect(requestTo(URL)).andRespond(withException(new SocketTimeoutException("Tiempo agotado")));
        assertThrows(ConsultaIdentidadNoDisponibleException.class, () -> client.consultar("00000001"));
        server.verify();
    }

    @Test
    void laClaveAusenteNoDisparaUnaPeticionExterna() {
        var unconfigured = new DecolectaDniClient(rest, JsonMapper.builder().build(), "");
        assertThrows(ConsultaIdentidadNoDisponibleException.class, () -> unconfigured.consultar("00000001"));
        server.verify();
    }
}

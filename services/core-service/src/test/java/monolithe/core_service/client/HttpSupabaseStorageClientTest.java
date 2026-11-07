package monolithe.core_service.client;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

class HttpSupabaseStorageClientTest {

    private static final String BASE = "https://cjwnnroqjltoaqzpxlmh.supabase.co/storage/v1";
    private static final String SECRET = "sb_secret_test_key_for_backend_only";

    @Test
    void subirEvidenciaUsaStorageRealYApiKeySinBearerInvalido() {
        RestTemplate rest = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(rest).build();
        HttpSupabaseStorageClient client = new HttpSupabaseStorageClient(
                rest, JsonMapper.builder().build(), BASE, SECRET);

        server.expect(requestTo(BASE + "/object/crm-retrocesos-evidencias/solicitudes/7/ejemplo.jpg"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("apikey", SECRET))
                .andExpect(request -> assertNull(request.getHeaders().getFirst("Authorization")))
                .andRespond(withSuccess("{\"Key\":\"solicitudes/7/ejemplo.jpg\"}", MediaType.APPLICATION_JSON));

        MockMultipartFile archivo = new MockMultipartFile("archivo", "ejemplo.jpg",
                "image/jpeg", new byte[] {(byte) 0xff, (byte) 0xd8, 0x01, 0x02});
        assertEquals("solicitudes/7/ejemplo.jpg",
                client.subirArchivo("crm-retrocesos-evidencias", "solicitudes/7/ejemplo.jpg", archivo)
                        .path("Key").asString());
        server.verify();
    }

    @Test
    void urlFirmadaUsaElBucketPrivadoCorrecto() {
        RestTemplate rest = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(rest).build();
        HttpSupabaseStorageClient client = new HttpSupabaseStorageClient(
                rest, JsonMapper.builder().build(), BASE, SECRET);
        String path = "/object/sign/crm-retrocesos-evidencias/solicitudes/7/ejemplo.jpg";

        server.expect(requestTo(BASE + path))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("apikey", SECRET))
                .andRespond(withSuccess("{\"signedURL\":\"" + path + "?token=demo\"}",
                        MediaType.APPLICATION_JSON));

        assertEquals(BASE + path + "?token=demo",
                client.generarUrlFirmada("crm-retrocesos-evidencias",
                        "solicitudes/7/ejemplo.jpg", 300));
        server.verify();
    }

    @Test
    void rechazaPlaceholderSinRealizarLlamadasDeRed() {
        HttpSupabaseStorageClient client = new HttpSupabaseStorageClient(
                new RestTemplate(), JsonMapper.builder().build(),
                "https://placeholder.supabase.co/storage/v1", SECRET);
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "ejemplo.jpg", "image/jpeg", new byte[] {(byte) 0xff, (byte) 0xd8});
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> client.subirArchivo("crm-retrocesos-evidencias", "solicitudes/7/ejemplo.jpg", archivo));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatusCode());
    }
}

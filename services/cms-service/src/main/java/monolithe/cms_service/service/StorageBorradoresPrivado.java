package monolithe.cms_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.URI;
import java.util.regex.Pattern;

/** Cliente tecnico solo del bucket de borradores; nunca devuelve URLs publicas. */
@Service
public class StorageBorradoresPrivado {
    public static final String BUCKET = "cms-drafts-private";
    private static final Pattern KEY = Pattern.compile("borradores/[0-9]+/[0-9]+/[0-9a-f-]{36}\\.(jpg|png|webp)");
    private final String url;
    private final String clave;
    private final RestClient client;

    public StorageBorradoresPrivado(@Value("${supabase.url:}") String url,
                                   @Value("${supabase.secret-key:}") String clave) {
        this.url = url == null ? "" : url.strip().replaceAll("/+$", "");
        this.clave = clave == null ? "" : clave.strip();
        this.client = RestClient.create();
    }

    public void subir(String key, byte[] data, String mime) {
        validar(key);
        try {
            client.post().uri(uri("/object/", key)).headers(h -> credenciales(h))
                    .header("x-upsert", "false").contentType(MediaType.parseMediaType(mime))
                    .body(data).retrieve().toBodilessEntity();
        } catch (RestClientException e) {
            throw new IllegalStateException("No fue posible guardar la imagen privada", e);
        }
    }

    public byte[] descargar(String key) {
        validar(key);
        try {
            byte[] data = client.get().uri(uri("/object/authenticated/", key))
                    .headers(h -> credenciales(h)).retrieve().body(byte[].class);
            if (data == null || data.length == 0 || data.length > ImagenBorradorValidador.MAX_BYTES) {
                throw new IllegalStateException("Respuesta de Storage invalida");
            }
            return data;
        } catch (RestClientException e) {
            throw new IllegalStateException("No fue posible recuperar la imagen privada", e);
        }
    }

    public void eliminar(String key) {
        validar(key);
        try {
            client.delete().uri(uri("/object/", key))
                    .headers(h -> credenciales(h)).retrieve().toBodilessEntity();
        } catch (HttpClientErrorException.NotFound e) {
            // Reintento idempotente: el objeto pudo eliminarse antes de un fallo de BD.
            return;
        } catch (RestClientException e) {
            throw new IllegalStateException("No fue posible limpiar la imagen privada", e);
        }
    }

    private URI uri(String prefijo, String key) {
        return URI.create(url + "/storage/v1" + prefijo + BUCKET + "/" + key);
    }

    private void credenciales(org.springframework.http.HttpHeaders headers) {
        headers.set("apikey", clave);
        if (!clave.startsWith("sb_secret_")) headers.setBearerAuth(clave);
    }

    private void validar(String key) {
        if (!(url.startsWith("https://") || url.startsWith("http://localhost:"))
                || clave.isBlank() || key == null || !KEY.matcher(key).matches()) {
            throw new IllegalStateException("Configuracion o clave privada de Storage invalida");
        }
    }
}

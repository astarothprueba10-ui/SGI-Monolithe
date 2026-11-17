package monolithe.core_service.service;

import java.net.URI;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Solo firma una ruta contractual autorizada por la función privada 5.4.5. */
@Service
public class PortalDocumentoStorageService {
    private static final String BUCKET = "contratos-firmados-private";
    private static final int TTL_SECONDS = 120;
    private static final Pattern UUID_PDF = Pattern.compile(
            "[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\\.pdf");
    private final PortalClienteService portal;
    private final RestClient client;
    private final JsonMapper mapper;
    private final String supabaseUrl;
    private final String secret;

    public record EnlaceLecturaPortal(String urlLectura, String nombreArchivo,
            String tipoMime, int expiresInSeconds) {}

    public PortalDocumentoStorageService(PortalClienteService portal,
            JsonMapper mapper,
            @Value("${SUPABASE_URL:}") String supabaseUrl,
            @Value("${SUPABASE_SECRET_KEY:}") String secret) {
        this.portal = portal;
        this.client = RestClient.create();
        this.mapper = mapper;
        this.supabaseUrl = supabaseUrl == null ? "" : supabaseUrl.trim();
        this.secret = secret == null ? "" : secret.trim();
    }

    public EnlaceLecturaPortal firmarLectura(Long actor, String tipo, Long idDocumento) {
        JsonNode referencia = portal.autorizarDocumentoPrivado(actor,tipo,idDocumento);
        final long idContrato = referencia.path("idContrato").asLong(0);
        final String categoria = referencia.path("categoria").asString("");
        final String clave = referencia.path("claveArchivo").asString("");
        final String nombre = referencia.path("nombreOriginal").asString("documento.pdf");
        final String mime = referencia.path("tipoMime").asString("");
        final String bucket = referencia.path("bucket").asString("");
        String prefijo = "CONTRATO".equals(tipo)
                ? "contratos/" + idContrato + "/"
                : "anexos/" + idContrato + "/" + categoria + "/";

        if (!referencia.path("autorizado").asBoolean(false)
                || idContrato<=0 || idDocumento==null || idDocumento<=0
                || !tipo.equals(referencia.path("tipo").asString(""))
                || referencia.path("idDocumento").asLong(0)!=idDocumento
                || !BUCKET.equals(bucket)
                || !"application/pdf".equals(mime)
                || ("ANEXO".equals(tipo) && !("PLANO_LOTE".equals(categoria)
                    || "MEMORIA_DESCRIPTIVA".equals(categoria)))
                || !clave.startsWith(prefijo)
                || !UUID_PDF.matcher(clave.substring(prefijo.length())).matches()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "La lectura del documento no está autorizada.");
        }
        if (secret.isBlank() || supabaseUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Storage documental no configurado.");
        }
        String base = supabaseUrl.replaceAll("/+$","");
        URI host;
        try { host=URI.create(base); }
        catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Configuración de Storage inválida.",ex);
        }
        if (!"https".equalsIgnoreCase(host.getScheme())
                || host.getHost()==null || !host.getHost().endsWith(".supabase.co")
                || host.getUserInfo()!=null || host.getPort()!=-1
                || host.getRawQuery()!=null || host.getRawFragment()!=null
                || host.getRawPath()!=null && !host.getRawPath().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Servidor de Storage no autorizado.");
        }
        String ruta = "/object/sign/" + BUCKET + "/" + clave;
        String origen = base + "/storage/v1";
        final String respuesta;
        try {
            respuesta = client.post().uri(origen+ruta)
                    .header("apikey",secret)
                    .header("Authorization","Bearer "+secret)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("expiresIn",TTL_SECONDS))
                    .retrieve().body(String.class);
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "No se pudo generar la lectura privada.",ex);
        }
        try {
            if (respuesta==null || respuesta.isBlank()) throw new IllegalStateException();
            String relativa=mapper.readTree(respuesta).path("signedURL").asString("");
            URI enlace=URI.create(relativa);
            if (enlace.isAbsolute() || !ruta.equals(enlace.getRawPath())
                    || enlace.getRawQuery()==null
                    || !enlace.getRawQuery().matches("token=[A-Za-z0-9._~%+-]+")) {
                throw new IllegalStateException("Enlace no permitido.");
            }
            return new EnlaceLecturaPortal(origen+relativa,nombre,"application/pdf",TTL_SECONDS);
        } catch (JacksonException|IllegalArgumentException|IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Storage devolvió un enlace inesperado.",ex);
        }
    }
}

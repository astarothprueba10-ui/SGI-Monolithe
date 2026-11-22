package monolithe.core_service.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Valida el encabezado y el tamaño real; no confía en el MIME proporcionado por el navegador. */
public final class PlanoCadArchivoValidator {
    public static final long MAX_BYTES=20L*1024*1024;
    private static final Pattern NOMBRE=Pattern.compile("^[^/\\\\\\x00-\\x1f]{1,255}$");
    private PlanoCadArchivoValidator(){}

    public record Archivo(String formato,String nombre,String mime,String sha256) {}

    public static Archivo verificar(String nombre, byte[] bytes) {
        if(nombre==null || !NOMBRE.matcher(nombre).matches() || bytes==null
            || bytes.length<16 || bytes.length>MAX_BYTES)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Archivo inválido. Tamaño máximo 20 MB y nombre sin rutas.");
        String ext=nombre.substring(Math.max(0,nombre.lastIndexOf('.')+1)).toUpperCase(Locale.ROOT);
        if(!ext.equals("DWG") && !ext.equals("SVG"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Solo se admiten DWG o SVG.");
        if(ext.equals("DWG")) {
            String cabecera=new String(bytes,0,6,StandardCharsets.US_ASCII);
            if(!cabecera.matches("AC10[0-9]{2}"))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"El archivo no contiene una cabecera DWG válida.");
        } else {
            String prefijo=new String(bytes,0,Math.min(bytes.length,1024),StandardCharsets.UTF_8).stripLeading();
            if(!prefijo.matches("(?s)^(?:<\\?xml[^>]*>\\s*)?<svg[\\s>].*"))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"El archivo no es un SVG XML válido.");
            String texto=new String(bytes,StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
            if(texto.contains("<!doctype") || texto.contains("<!entity") || texto.contains("<script")
                || texto.contains("<foreignobject") || texto.contains("<iframe") || texto.contains("<image")
                || texto.contains("<style") || texto.contains("onload=") || texto.contains("onerror=")
                || texto.contains("javascript:") || texto.contains("xlink:href") || texto.contains("href="))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"SVG con elementos activos o enlaces no permitidos.");
        }
        try {
            byte[] hash=MessageDigest.getInstance("SHA-256").digest(bytes);
            return new Archivo(ext,nombre,"application/octet-stream",HexFormat.of().formatHex(hash));
        } catch(NoSuchAlgorithmException ex) {
            throw new IllegalStateException("No se pudo calcular la huella SHA-256.",ex);
        }
    }
}

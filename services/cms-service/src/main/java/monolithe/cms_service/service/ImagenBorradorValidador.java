package monolithe.cms_service.service;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.ByteArrayInputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.util.Iterator;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;

/** Validacion binaria: nunca confiar solo en la extension o en Content-Type. */
@Component
public class ImagenBorradorValidador {
    public static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Map<String, String> EXTENSION = Map.of(
            "image/jpeg", ".jpg", "image/png", ".png", "image/webp", ".webp");

    public ImagenValidada validar(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty() || archivo.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("La imagen debe tener entre 1 byte y 5 MB");
        }
        String mime = archivo.getContentType();
        if (!EXTENSION.containsKey(mime)) {
            throw new IllegalArgumentException("Formato de imagen no permitido");
        }
        try {
            byte[] datos = archivo.getBytes();
            if (datos.length == 0 || datos.length > MAX_BYTES || !firmaValida(datos, mime)) {
                throw new IllegalArgumentException("El contenido no corresponde a una imagen valida");
            }
            return new ImagenValidada(datos, mime, EXTENSION.get(mime), hash(datos));
        } catch (IOException e) {
            throw new IllegalArgumentException("No se pudo leer la imagen", e);
        }
    }

    private static boolean firmaValida(byte[] data, String mime) {
        return switch (mime) {
            case "image/jpeg" -> esJpeg(data);
            case "image/png" -> esPng(data);
            case "image/webp" -> esWebp(data);
            default -> false;
        };
    }

    private static boolean esJpeg(byte[] d) {
        return d.length >= 4 && (d[0] & 255) == 255 && (d[1] & 255) == 216
                && (d[2] & 255) == 255 && (d[d.length - 2] & 255) == 255
                && (d[d.length - 1] & 255) == 217 && decodificable(d);
    }

    private static boolean esPng(byte[] d) {
        byte[] firma = {(byte)137, 80, 78, 71, 13, 10, 26, 10};
        if (d.length < 24) return false;
        for (int i = 0; i < firma.length; i++) if (d[i] != firma[i]) return false;
        return d[12] == 'I' && d[13] == 'H' && d[14] == 'D' && d[15] == 'R' && decodificable(d);
    }

    private static boolean esWebp(byte[] d) {
        if (d.length < 30 || !ascii(d, 0, "RIFF") || !ascii(d, 8, "WEBP")) return false;
        if (!(ascii(d, 12, "VP8 ") || ascii(d, 12, "VP8L") || ascii(d, 12, "VP8X"))) return false;
        long total = (d[4]&255L) | ((d[5]&255L)<<8) | ((d[6]&255L)<<16) | ((d[7]&255L)<<24);
        long chunk = (d[16]&255L) | ((d[17]&255L)<<8) | ((d[18]&255L)<<16) | ((d[19]&255L)<<24);
        return total + 8 == d.length && chunk >= 10 && 20 + chunk + (chunk & 1) <= d.length;
    }

    private static boolean ascii(byte[] d, int offset, String s) {
        for (int i = 0; i < s.length(); i++) if (d[offset + i] != (byte)s.charAt(i)) return false;
        return true;
    }

    private static boolean decodificable(byte[] bytes) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (input == null) return false;
            Iterator<ImageReader> lectores = ImageIO.getImageReaders(input);
            if (!lectores.hasNext()) return false;
            ImageReader lector = lectores.next();
            try {
                lector.setInput(input);
                int ancho = lector.getWidth(0);
                int alto = lector.getHeight(0);
                if (ancho <= 0 || alto <= 0 || (long)ancho * alto > 16_000_000) return false;
                BufferedImage imagen = lector.read(0);
                return imagen != null;
            } finally {
                lector.dispose();
            }
        } catch (IOException | RuntimeException e) {
            return false;
        }
    }

    public static String hash(byte[] datos) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(datos));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    public record ImagenValidada(byte[] bytes, String mimeType, String extension, String sha256) { }
}

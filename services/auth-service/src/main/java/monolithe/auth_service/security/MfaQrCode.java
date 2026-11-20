package monolithe.auth_service.security;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.common.BitMatrix;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

/** Genera en el servidor un QR sin transferir la semilla a servicios externos. */
@Component
public final class MfaQrCode {
    /** Renderiza un QR compatible con aplicaciones autenticadoras TOTP. */
    public String image(String login, String secret) {
        String account = URLEncoder.encode(login, StandardCharsets.UTF_8).replace("+", "%20");
        String uri = "otpauth://totp/Monolithe:" + account + "?secret=" + secret
                + "&issuer=Monolithe&algorithm=SHA1&digits=6&period=30";
        try {
            BitMatrix matrix = new QRCodeWriter().encode(uri, BarcodeFormat.QR_CODE, 232, 232,
                    Map.of(EncodeHintType.MARGIN, 4));
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(png(matrix));
        } catch (WriterException e) {
            throw new IllegalStateException("No se pudo codificar el QR de configuración", e);
        }
    }

    private byte[] png(BitMatrix matrix) {
        BufferedImage image = new BufferedImage(matrix.getWidth(), matrix.getHeight(), BufferedImage.TYPE_BYTE_BINARY);
        for (int y = 0; y < matrix.getHeight(); y++) {
            for (int x = 0; x < matrix.getWidth(); x++) {
                image.setRGB(x, y, matrix.get(x, y) ? 0xff000000 : 0xffffffff);
            }
        }
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (!ImageIO.write(image, "PNG", output)) throw new IOException("Formato PNG no disponible");
            return output.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar el QR de configuración", e);
        }
    }
}

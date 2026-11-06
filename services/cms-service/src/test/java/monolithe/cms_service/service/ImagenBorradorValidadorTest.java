package monolithe.cms_service.service;

import org.junit.jupiter.api.Test;
import java.io.ByteArrayOutputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

class ImagenBorradorValidadorTest {
    private final ImagenBorradorValidador validador = new ImagenBorradorValidador();

    private byte[] generar(String formato) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), formato, out);
        return out.toByteArray();
    }

    @Test void aceptaJpeg() throws Exception {
        var f = new MockMultipartFile("archivo", "foto.jpg", "image/jpeg",
                generar("jpg"));
        var img = validador.validar(f);
        assertEquals(".jpg", img.extension());
        assertEquals(64, img.sha256().length());
    }

    @Test void rechazaArchivoFalso() {
        var f = new MockMultipartFile("archivo", "foto.jpg", "image/jpeg", "texto".getBytes());
        assertThrows(IllegalArgumentException.class, () -> validador.validar(f));
    }

    @Test void rechazaSvg() {
        var f = new MockMultipartFile("archivo", "foto.svg", "image/svg+xml", "<svg/>".getBytes());
        assertThrows(IllegalArgumentException.class, () -> validador.validar(f));
    }

    @Test void rechazaTamanoExcesivo() {
        var f = new MockMultipartFile("archivo", "foto.jpg", "image/jpeg", new byte[5*1024*1024+1]);
        assertThrows(IllegalArgumentException.class, () -> validador.validar(f));
    }

    @Test void aceptaPngConCabeceraValida() throws Exception {
        byte[] png = generar("png");
        var f = new MockMultipartFile("archivo", "foto.png", "image/png", png);
        assertEquals(".png", validador.validar(f).extension());
    }

    @Test void rechazaWebpTruncado() {
        byte[] webp = {82,73,70,70,12,0,0,0,87,69,66,80,86,80,56,32,0,0,0,0};
        var f = new MockMultipartFile("archivo", "foto.webp", "image/webp", webp);
        assertThrows(IllegalArgumentException.class, () -> validador.validar(f));
    }
}

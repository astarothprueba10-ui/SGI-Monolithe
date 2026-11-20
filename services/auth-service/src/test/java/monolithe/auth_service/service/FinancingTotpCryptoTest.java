package monolithe.auth_service.service;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.Base64;
import static org.junit.jupiter.api.Assertions.*;

class FinancingTotpCryptoTest {
    // RFC 6238 (SHA-1): 8 dígitos 94287082 -> 6 dígitos 287082.
    private static final String RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

    @Test
    void generaTotpRfc6238YRechazaReplay() {
        FinancingTotpCrypto c=new FinancingTotpCrypto(Base64.getEncoder()
            .encodeToString(new byte[32]));
        assertEquals("287082",c.codigoParaPaso(RFC_SECRET,1));
        assertEquals(1,c.verificarPaso(RFC_SECRET,"287082",-1,Instant.ofEpochSecond(59)));
        assertEquals(-1,c.verificarPaso(RFC_SECRET,"287082",1,Instant.ofEpochSecond(59)));
        assertEquals(-1,c.verificarPaso(RFC_SECRET,"287082",-1,Instant.ofEpochSecond(5000)));
        assertEquals(-1,c.verificarPaso(RFC_SECRET,"28708a",-1,Instant.ofEpochSecond(59)));
    }

    @Test
    void cifraConAadPorUsuarioYNoReutilizaIv() {
        FinancingTotpCrypto c=new FinancingTotpCrypto(Base64.getEncoder()
            .encodeToString(new byte[32]));
        String uno=c.cifrar(RFC_SECRET,10L);
        String dos=c.cifrar(RFC_SECRET,10L);
        assertNotEquals(uno,dos);
        assertNotEquals(RFC_SECRET,uno);
        assertEquals(RFC_SECRET,c.descifrar(uno,10L));
        assertThrows(IllegalStateException.class,()->c.descifrar(uno,11L));
    }

    @Test
    void generaSecretosDeCientoSesentaBitsYNoAceptaClaveAusente() {
        FinancingTotpCrypto c=new FinancingTotpCrypto("");
        assertFalse(c.configurado());
        assertThrows(IllegalStateException.class,()->c.cifrar(RFC_SECRET,1L));
        String s=new FinancingTotpCrypto(Base64.getEncoder()
            .encodeToString(new byte[32])).nuevoSecreto();
        assertEquals(32,s.length());
        assertEquals(20,FinancingTotpCrypto.decodificarBase32(s).length);
    }
}

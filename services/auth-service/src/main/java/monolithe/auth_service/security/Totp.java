package monolithe.auth_service.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Locale;
import java.util.OptionalLong;

/** Códigos TOTP de seis dígitos conforme a RFC 6238. */
public final class Totp {
    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    private Totp() {}

    /** Acepta el intervalo actual o anterior y rechaza pasos ya usados. */
    public static OptionalLong verify(byte[] seed, String code, Instant now, long lastStep) {
        if (!code.matches("[0-9]{6}")) return OptionalLong.empty();
        long current = now.getEpochSecond() / 30;
        byte[] provided = code.getBytes(StandardCharsets.US_ASCII);
        for (long step = current; step >= current - 1 && step > lastStep; step--) {
            byte[] expected = codeAt(seed, step).getBytes(StandardCharsets.US_ASCII);
            if (MessageDigest.isEqual(expected, provided)) return OptionalLong.of(step);
        }
        return OptionalLong.empty();
    }

    static String codeAt(byte[] seed, long step) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA1");
            hmac.init(new SecretKeySpec(seed, "HmacSHA1"));
            byte[] hash = hmac.doFinal(ByteBuffer.allocate(Long.BYTES).putLong(step).array());
            int offset = hash[hash.length - 1] & 0x0f;
            int binary = ByteBuffer.wrap(hash, offset, Integer.BYTES).getInt() & Integer.MAX_VALUE;
            return String.format(Locale.ROOT, "%06d", binary % 1_000_000);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo validar el código TOTP", e);
        }
    }

    /** Codifica la semilla para ingreso manual y para el URI del autenticador. */
    public static String base32(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        int buffer = 0;
        int bits = 0;
        for (byte value : bytes) {
            buffer = (buffer << 8) | (value & 0xff);
            bits += 8;
            while (bits >= 5) {
                bits -= 5;
                result.append(BASE32.charAt((buffer >>> bits) & 31));
            }
        }
        if (bits > 0) result.append(BASE32.charAt((buffer << (5 - bits)) & 31));
        return result.toString();
    }
}

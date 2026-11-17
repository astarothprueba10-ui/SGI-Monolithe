package monolithe.auth_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;

/** Implementación RFC 6238 (HMAC-SHA1, 6 dígitos, 30s). Ningún secreto sale a logs. */
@Component
public class FinancingTotpCrypto {
    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private final SecureRandom random = new SecureRandom();
    private final String keyBase64;

    public FinancingTotpCrypto(@Value("${security.financing-mfa.encryption-key-base64:}") String keyBase64) {
        this.keyBase64 = keyBase64;
    }

    private SecretKeySpec key() {
        try {
            byte[] raw = Base64.getDecoder().decode(keyBase64);
            if (raw.length != 32) throw new IllegalStateException("Clave TOTP debe tener 32 bytes.");
            return new SecretKeySpec(raw, "AES");
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("Se requiere FINANCING_MFA_ENCRYPTION_KEY_BASE64 válido.", e);
        }
    }

    public boolean configurado() {
        try { key(); return true; } catch (IllegalStateException ex) { return false; }
    }

    public byte[] aleatorio(int size) {
        byte[] b = new byte[size];
        random.nextBytes(b);
        return b;
    }

    public String nuevoSecreto() { return base32(aleatorio(20)); }

    public String cifrar(String secreto, long usuario) {
        try {
            byte[] iv = aleatorio(12);
            Cipher aes = Cipher.getInstance("AES/GCM/NoPadding");
            aes.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(128, iv));
            aes.updateAAD(("fin-mfa-v1:" + usuario).getBytes(StandardCharsets.UTF_8));
            byte[] cifrado = aes.doFinal(secreto.getBytes(StandardCharsets.US_ASCII));
            return "v1:" + Base64.getEncoder().encodeToString(iv) + ":"
                    + Base64.getEncoder().encodeToString(cifrado);
        } catch (Exception ex) {
            throw new IllegalStateException("No fue posible cifrar el secreto MFA.", ex);
        }
    }

    public String descifrar(String valor, long usuario) {
        try {
            String[] p = valor.split(":", -1);
            if (p.length != 3 || !p[0].equals("v1")) throw new IllegalArgumentException("Formato inválido");
            byte[] iv = Base64.getDecoder().decode(p[1]);
            if (iv.length != 12) throw new IllegalArgumentException("IV inválido");
            Cipher aes = Cipher.getInstance("AES/GCM/NoPadding");
            aes.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
            aes.updateAAD(("fin-mfa-v1:" + usuario).getBytes(StandardCharsets.UTF_8));
            return new String(aes.doFinal(Base64.getDecoder().decode(p[2])), StandardCharsets.US_ASCII);
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo verificar la integridad del secreto MFA.", ex);
        }
    }

    public long verificarPaso(String secreto, String codigo, long ultimoPaso, Instant ahora) {
        if (codigo == null || !codigo.matches("[0-9]{6}")) return -1;
        byte[] candidato = codigo.getBytes(StandardCharsets.US_ASCII);
        long actual = ahora.getEpochSecond() / 30;
        // Comparar toda la ventana; nunca permitir reutilizar un paso ya aceptado.
        long match = -1;
        for (long paso = actual - 1; paso <= actual + 1; paso++) {
            if (paso > ultimoPaso &&
                MessageDigest.isEqual(candidato, codigoParaPaso(secreto, paso).getBytes(StandardCharsets.US_ASCII))) {
                match = Math.max(match, paso);
            }
        }
        return match;
    }

    public String codigoParaPaso(String secreto, long paso) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(decodificarBase32(secreto), "HmacSHA1"));
            byte[] hash = mac.doFinal(ByteBuffer.allocate(8).putLong(paso).array());
            int offset = hash[hash.length - 1] & 15;
            int valor = ((hash[offset] & 0x7f) << 24)
                    | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8)
                    | (hash[offset + 3] & 0xff);
            return String.format(java.util.Locale.ROOT, "%06d", valor % 1_000_000);
        } catch (Exception ex) {
            throw new IllegalStateException("No fue posible verificar el código TOTP.", ex);
        }
    }

    public static String hash(String valor) {
        try {
            byte[] data = MessageDigest.getInstance("SHA-256")
                    .digest(valor.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(data);
        } catch (Exception ex) { throw new IllegalStateException("SHA-256 no disponible", ex); }
    }

    public static String base32(byte[] bytes) {
        StringBuilder out = new StringBuilder();
        int buffer = 0, bits = 0;
        for (byte b : bytes) {
            buffer = (buffer << 8) | (b & 0xff);
            bits += 8;
            while (bits >= 5) {
                bits -= 5;
                out.append(BASE32.charAt((buffer >> bits) & 31));
            }
        }
        if (bits > 0) out.append(BASE32.charAt((buffer << (5 - bits)) & 31));
        return out.toString();
    }

    public static byte[] decodificarBase32(String s) {
        if (s == null || !s.matches("[A-Z2-7]{32}")) throw new IllegalArgumentException("Secreto inválido");
        byte[] dest = new byte[20];
        int buffer = 0, bits = 0, pos = 0;
        for (char c : s.toCharArray()) {
            buffer = (buffer << 5) | BASE32.indexOf(c);
            bits += 5;
            if (bits >= 8) {
                bits -= 8;
                dest[pos++] = (byte) ((buffer >> bits) & 255);
            }
        }
        if (pos != 20) throw new IllegalArgumentException("Longitud de secreto inválida");
        return dest;
    }
}

package monolithe.auth_service.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

/** Protege semillas TOTP y genera retos y códigos de recuperación. */
@Component
public final class MfaCrypto {
    private static final int NONCE_BYTES = 12;
    private final SecureRandom random = new SecureRandom();
    private final SecretKeySpec key;

    /** Compatibilidad para tests y despliegues locales que montan un archivo. */
    public MfaCrypto(String keyPath) {
        this(keyPath, "");
    }

    /**
     * Preferencia: variable secreta en Railway; en Docker local, archivo protegido.
     * Nunca genera una clave nueva, pues invalidaría los factores TOTP existentes.
     */
    @Autowired
    public MfaCrypto(@Value("${security.mfa.key-path}") String keyPath,
                     @Value("${security.mfa.key-base64:}") String base64Key) {
        try {
            String encoded = base64Key == null || base64Key.isBlank()
                    ? Files.readString(Path.of(keyPath)).strip()
                    : base64Key.strip();
            byte[] bytes = Base64.getDecoder().decode(encoded);
            if (bytes.length != 32) throw new IllegalArgumentException("Tamaño de clave incorrecto");
            key = new SecretKeySpec(bytes, "AES");
            Arrays.fill(bytes, (byte) 0);
        } catch (IOException | IllegalArgumentException e) {
            throw new IllegalStateException("Configura AUTH_MFA_KEY_BASE64 o AUTH_MFA_KEY_PATH "
                + "con una clave privada de 32 bytes codificada en Base64.");
        }
    }

    /** Genera un reto de 256 bits. Solo su huella se guarda. */
    public String challenge() {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes(32));
    }

    /** Genera una semilla TOTP individual. */
    public byte[] seed() {
        return randomBytes(20);
    }

    /** Genera un código de recuperación imprimible de 128 bits. */
    public String recoveryCode() {
        String value = HexFormat.of().formatHex(randomBytes(16));
        return value.replaceAll("(.{8})(?!$)", "$1-");
    }

    /** Calcula una huella para un código aleatorio de activación o recuperación. */
    public static byte[] codeHash(String code) {
        return digest(code.replace("-", "").replace(" ", "").toLowerCase(Locale.ROOT));
    }

    /** Calcula SHA-256 para identificadores aleatorios y vínculos de credenciales. */
    public static byte[] digest(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no está disponible", e);
        }
    }

    /** Cifra la semilla con nonce nuevo y la vincula criptográficamente a la cuenta. */
    public byte[] encrypt(long user, byte[] seed) {
        byte[] nonce = randomBytes(NONCE_BYTES);
        byte[] encrypted = crypt(Cipher.ENCRYPT_MODE, user, nonce, seed);
        return ByteBuffer.allocate(nonce.length + encrypted.length).put(nonce).put(encrypted).array();
    }

    /** Descifra la semilla de una cuenta y verifica su integridad. */
    public byte[] decrypt(long user, byte[] encrypted) {
        byte[] nonce = Arrays.copyOfRange(encrypted, 0, NONCE_BYTES);
        byte[] ciphertext = Arrays.copyOfRange(encrypted, NONCE_BYTES, encrypted.length);
        return crypt(Cipher.DECRYPT_MODE, user, nonce, ciphertext);
    }

    private byte[] crypt(int mode, long user, byte[] nonce, byte[] value) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(mode, key, new GCMParameterSpec(128, nonce));
            cipher.updateAAD(ByteBuffer.allocate(Long.BYTES).putLong(user).array());
            return cipher.doFinal(value);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo procesar la semilla del segundo factor", e);
        }
    }

    private byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        random.nextBytes(bytes);
        return bytes;
    }
}

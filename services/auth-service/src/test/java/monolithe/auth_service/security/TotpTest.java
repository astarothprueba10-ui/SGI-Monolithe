package monolithe.auth_service.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class TotpTest {
    private final byte[] seed = "12345678901234567890".getBytes(StandardCharsets.US_ASCII);

    @ParameterizedTest
    @CsvSource({"59,287082", "1111111109,081804", "1111111111,050471",
            "1234567890,005924", "2000000000,279037", "20000000000,353130"})
    void matchesRfc6238Sha1VectorsTruncatedToSixDigits(long seconds, String code) {
        assertEquals(seconds / 30, Totp.verify(seed, code, Instant.ofEpochSecond(seconds), -1).orElseThrow());
    }

    @Test
    void acceptsOnePreviousStepButRejectsReplayAndOlderCodes() {
        Instant now = Instant.ofEpochSecond(92);
        String previous = Totp.codeAt(seed, 2);
        assertEquals(2, Totp.verify(seed, previous, now, -1).orElseThrow());
        assertTrue(Totp.verify(seed, previous, now, 2).isEmpty());
        assertTrue(Totp.verify(seed, "287082", now, -1).isEmpty());
        assertTrue(Totp.verify(seed, "abc123", now, -1).isEmpty());
    }

    @Test
    void encodesTheManualKeyWithBase32() {
        assertEquals("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", Totp.base32(seed));
    }
}

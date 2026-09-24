package monolithe.auth_service.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Configuration
public class JwtConfig {

        @Value("${security.jwt.private-key-path}")
        private String privateKeyPath;

        @Value("${security.jwt.public-key-path}")
        private String publicKeyPath;

        @Bean
        public RSAPrivateKey jwtPrivateKey() throws Exception {

                String key = Files.readString(
                                Path.of(privateKeyPath));

                key = key
                                .replace("-----BEGIN PRIVATE KEY-----", "")
                                .replace("-----END PRIVATE KEY-----", "")
                                .replaceAll("\\s", "");

                byte[] decoded = Base64.getDecoder().decode(key);

                PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(decoded);

                KeyFactory keyFactory = KeyFactory.getInstance("RSA");

                return (RSAPrivateKey) keyFactory.generatePrivate(keySpec);
        }

        @Bean
        public RSAPublicKey jwtPublicKey() throws Exception {

                String key = Files.readString(
                                Path.of(publicKeyPath));

                key = key
                                .replace("-----BEGIN PUBLIC KEY-----", "")
                                .replace("-----END PUBLIC KEY-----", "")
                                .replaceAll("\\s", "");

                byte[] decoded = Base64.getDecoder().decode(key);

                X509EncodedKeySpec keySpec = new X509EncodedKeySpec(decoded);

                KeyFactory keyFactory = KeyFactory.getInstance("RSA");

                return (RSAPublicKey) keyFactory.generatePublic(keySpec);
        }

        @Bean
        public JwtEncoder jwtEncoder(
                        RSAPublicKey publicKey,
                        RSAPrivateKey privateKey) {

                RSAKey rsaKey = new RSAKey.Builder(publicKey)
                                .privateKey(privateKey)
                                .build();

                JWKSource<SecurityContext> jwkSource = new ImmutableJWKSet<>(
                                new JWKSet(rsaKey));

                return new NimbusJwtEncoder(jwkSource);
        }

        @Bean
        public JwtDecoder jwtDecoder(
                        RSAPublicKey publicKey,
                        @Value("${security.jwt.issuer}") String issuer) {

                NimbusJwtDecoder decoder = NimbusJwtDecoder
                                .withPublicKey(publicKey)
                                .build();

                decoder.setJwtValidator(
                                JwtValidators.createDefaultWithIssuer(issuer));

                return decoder;
        }
}
package monolithe.auth_service.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtEncoder jwtEncoder;

    @Value("${security.jwt.issuer}")
    private String issuer;

    @Value("${security.jwt.access-token-expiration}")
    private long accessTokenExpiration;

    public String generarAccessToken(UserPrincipal principal) {

        Instant ahora = Instant.now();
        Instant expiracion = ahora.plusSeconds(accessTokenExpiration);

        List<String> autoridades = principal.getAuthorities()
                .stream()
                .map(authority -> authority.getAuthority())
                .toList();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .subject(principal.getIdUsuario().toString())
                .issuedAt(ahora)
                .expiresAt(expiracion)
                .id(UUID.randomUUID().toString())
                .claim("username", principal.getUsername())
                .claim("authorities", autoridades)
                .claim("password_change_required", principal.isRequiereCambioPassword())
                .build();

        JwsHeader header = JwsHeader
                .with(SignatureAlgorithm.RS256)
                .build();

        JwtEncoderParameters parametros = JwtEncoderParameters.from(header, claims);

        return jwtEncoder
                .encode(parametros)
                .getTokenValue();
    }
}
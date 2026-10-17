package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import monolithe.auth_service.repository.LoginAttemptProcedureRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class LoginSecurityService {

        private final UserRepository userRepository;
        private final LoginAttemptProcedureRepository loginAttemptProcedureRepository;

        @Value("${security.auth.max-failed-attempts}")
        private int maxFailedAttempts;

        @Value("${security.auth.lock-duration}")
        private long lockDuration;

        @Transactional
        public Long registrarIntentoFallido(String usuarioLogin) {

                return loginAttemptProcedureRepository.registrarIntentoFallido(
                                usuarioLogin,
                                maxFailedAttempts,
                                lockDuration);
        }

        @Transactional
        public void registrarAccesoExitoso(Long idUsuario) {

                userRepository.registrarAccesoExitoso(idUsuario);
        }

        public long getLockDurationMinutes() {
                return (long) Math.ceil((double) lockDuration / 60.0);
        }

        public long calcularMinutosRestantes(LocalDateTime bloqueadoHasta) {
                if (bloqueadoHasta == null) {
                        return getLockDurationMinutes();
                }
                LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);
                if (!bloqueadoHasta.isAfter(ahora)) {
                        return 1L;
                }
                long segundos = Duration.between(ahora, bloqueadoHasta).getSeconds();
                long minutos = (long) Math.ceil((double) segundos / 60.0);
                return Math.max(1L, minutos);
        }
}
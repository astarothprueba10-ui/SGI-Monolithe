package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class LoginSecurityService {

        private final UserRepository userRepository;

        @Value("${security.auth.max-failed-attempts}")
        private int maxFailedAttempts;

        @Value("${security.auth.lock-duration}")
        private long lockDuration;

        @Transactional
        public Long registrarIntentoFallido(String usuarioLogin) {

                User usuario = userRepository.findByUsuarioLogin(usuarioLogin)
                                .orElse(null);

                if (usuario == null) {
                        return null;
                }

                LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);

                int intentosActuales = usuario.getIntentosFallidos() != null
                                ? usuario.getIntentosFallidos()
                                : 0;

                if (usuario.getBloqueadoHasta() != null
                                && !usuario.getBloqueadoHasta().isAfter(ahora)) {

                        intentosActuales = 0;
                        usuario.setBloqueadoHasta(null);
                }

                int nuevosIntentos = intentosActuales + 1;

                usuario.setIntentosFallidos(nuevosIntentos);

                boolean bloqueadoAhora = false;

                if (nuevosIntentos >= maxFailedAttempts) {

                        usuario.setBloqueadoHasta(
                                        ahora.plusSeconds(lockDuration));

                        bloqueadoAhora = true;
                }

                userRepository.save(usuario);

                return bloqueadoAhora
                                ? usuario.getIdUsuario()
                                : null;
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
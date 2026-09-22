package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

                /*
                 * Si existía un bloqueo anterior pero ya venció,
                 * comienza un nuevo ciclo de intentos.
                 */
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

                User usuario = userRepository.findById(idUsuario)
                                .orElseThrow(() -> new IllegalStateException(
                                                "Usuario no encontrado"));

                usuario.setIntentosFallidos(0);
                usuario.setBloqueadoHasta(null);
                usuario.setUltimoAcceso(
                                LocalDateTime.now(ZoneOffset.UTC));

                userRepository.save(usuario);
        }
}
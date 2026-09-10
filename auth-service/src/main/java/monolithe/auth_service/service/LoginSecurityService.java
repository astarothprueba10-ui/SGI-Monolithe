package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class LoginSecurityService {

    private final UserRepository userRepository;

    @Value("${security.auth.max-failed-attempts}")
    private int maxFailedAttempts;

    @Value("${security.auth.lock-duration}")
    private long lockDuration;

    @Transactional
    public void registrarIntentoFallido(String usuarioLogin) {

        userRepository.findByUsuarioLogin(usuarioLogin)
                .ifPresent(usuario -> {

                    LocalDateTime ahora = LocalDateTime.now();

                    int intentosActuales =
                            usuario.getIntentosFallidos() != null
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

                    int nuevosIntentos =
                            intentosActuales + 1;

                    usuario.setIntentosFallidos(
                            nuevosIntentos
                    );

                    if (nuevosIntentos >= maxFailedAttempts) {

                        usuario.setBloqueadoHasta(
                                ahora.plusSeconds(lockDuration)
                        );
                    }

                    userRepository.save(usuario);
                });
    }

    @Transactional
    public void registrarAccesoExitoso(Long idUsuario) {

        User usuario = userRepository.findById(idUsuario)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Usuario no encontrado"
                        )
                );

        usuario.setIntentosFallidos(0);
        usuario.setBloqueadoHasta(null);
        usuario.setUltimoAcceso(
                LocalDateTime.now()
        );

        userRepository.save(usuario);
    }
}
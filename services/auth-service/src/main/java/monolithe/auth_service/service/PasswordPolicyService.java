package monolithe.auth_service.service;

import org.springframework.stereotype.Service;

@Service
public class PasswordPolicyService {

    public void validar(String contrasena) {

        if (contrasena == null
                || contrasena.length() < 8
                || contrasena.length() > 72) {

            throw new IllegalArgumentException(
                    "La contraseña debe tener entre 8 y 72 caracteres");
        }

        boolean tieneMayuscula = contrasena.chars()
                .anyMatch(Character::isUpperCase);

        boolean tieneMinuscula = contrasena.chars()
                .anyMatch(Character::isLowerCase);

        boolean tieneNumero = contrasena.chars()
                .anyMatch(Character::isDigit);

        boolean tieneEspecial = contrasena.chars()
                .anyMatch(caracter -> !Character.isLetterOrDigit(caracter));

        if (!tieneMayuscula
                || !tieneMinuscula
                || !tieneNumero
                || !tieneEspecial) {

            throw new IllegalArgumentException(
                    "La contraseña debe contener mayúscula, minúscula, número y carácter especial");
        }
    }
}
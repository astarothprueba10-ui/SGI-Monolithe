package monolithe.auth_service.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PasswordPolicyServiceTest {

    private PasswordPolicyService passwordPolicyService;

    @BeforeEach
    void setUp() {
        passwordPolicyService = new PasswordPolicyService();
    }

    @Test
    void debeAceptarContrasenaValida() {

        assertDoesNotThrow(() ->
                passwordPolicyService.validar(
                        "Segura123*"
                )
        );
    }

    @Test
    void debeRechazarContrasenaDemasiadoCorta() {

        assertThrows(
                IllegalArgumentException.class,
                () -> passwordPolicyService.validar(
                        "Aa1*"
                )
        );
    }

    @Test
    void debeRechazarContrasenaSinMayuscula() {

        assertThrows(
                IllegalArgumentException.class,
                () -> passwordPolicyService.validar(
                        "segura123*"
                )
        );
    }

    @Test
    void debeRechazarContrasenaSinMinuscula() {

        assertThrows(
                IllegalArgumentException.class,
                () -> passwordPolicyService.validar(
                        "SEGURA123*"
                )
        );
    }

    @Test
    void debeRechazarContrasenaSinNumero() {

        assertThrows(
                IllegalArgumentException.class,
                () -> passwordPolicyService.validar(
                        "SeguraClave*"
                )
        );
    }

    @Test
    void debeRechazarContrasenaSinCaracterEspecial() {

        assertThrows(
                IllegalArgumentException.class,
                () -> passwordPolicyService.validar(
                        "Segura123"
                )
        );
    }
}
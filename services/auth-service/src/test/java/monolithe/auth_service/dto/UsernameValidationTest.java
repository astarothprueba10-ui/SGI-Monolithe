package monolithe.auth_service.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class UsernameValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @ParameterizedTest
    @ValueSource(strings = { "admin", "juan.perez", "logistica_01", "juan-perez", " Juan.Perez " })
    void creationAndEditingAcceptNormalizedNames(String value) {
        CreateUserRequest create = new CreateUserRequest();
        create.setIdPersona(1L);
        create.setUsuarioLogin(value);
        create.setCodigosRol(java.util.List.of("CLIENTE"));
        UpdateUserRequest update = new UpdateUserRequest();
        update.setUsuarioLogin(value);
        assertTrue(validator.validate(create).isEmpty());
        assertTrue(validator.validate(update).isEmpty());
        assertEquals(value.trim().toLowerCase(java.util.Locale.ROOT), create.getUsuarioLogin());
        assertEquals(create.getUsuarioLogin(), update.getUsuarioLogin());
    }

    @ParameterizedTest
    @ValueSource(strings = { "ab", "juan perez", "josé", "juan@monolithe.pe", "" })
    void creationAndEditingRejectInvalidNames(String value) {
        CreateUserRequest create = new CreateUserRequest();
        create.setIdPersona(1L);
        create.setUsuarioLogin(value);
        create.setCodigosRol(java.util.List.of("CLIENTE"));
        UpdateUserRequest update = new UpdateUserRequest();
        update.setUsuarioLogin(value);
        assertFalse(validator.validate(create).isEmpty());
        assertFalse(validator.validate(update).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = { "admin", "cliente@sigi.pe" })
    void passwordRecoveryRetainsLegacyIdentifierCompatibility(String value) {
        ForgotPasswordRequest recovery = new ForgotPasswordRequest();
        recovery.setUsuario(value);

        assertTrue(validator.validateProperty(recovery, "usuario").isEmpty());
    }
}

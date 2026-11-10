package monolithe.core_service.service;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber.PhoneNumber;
import monolithe.core_service.exception.ReglaNegocioException;

/** Valida celulares del CRM según los planes de numeración internacionales. */
public final class ValidacionTelefonoLead {
    private static final PhoneNumberUtil PHONES = PhoneNumberUtil.getInstance();

    private ValidacionTelefonoLead() {
    }

    /** Acepta Perú nacional o números internacionales sin modificar el formato almacenado. */
    public static void validar(String value) {
        if (value == null || !(value.matches("9[0-9]{8}") || value.matches("\\+[1-9][0-9]{6,14}")))
            throw invalido();
        try {
            PhoneNumber number = PHONES.parse(value, "PE");
            var type = PHONES.getNumberType(number);
            if (!PHONES.isValidNumber(number) || (type != PhoneNumberUtil.PhoneNumberType.MOBILE
                    && type != PhoneNumberUtil.PhoneNumberType.FIXED_LINE_OR_MOBILE)) throw invalido();
            if (number.getCountryCode() == 51 && !PHONES.getNationalSignificantNumber(number).matches("9[0-9]{8}"))
                throw invalido();
        } catch (NumberParseException ex) {
            throw invalido();
        }
    }

    private static ReglaNegocioException invalido() {
        return new ReglaNegocioException("Ingresa un celular válido: Perú requiere 9 dígitos y comenzar por 9; "
                + "para otros países incluye el prefijo internacional.");
    }
}

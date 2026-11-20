package monolithe.auth_service.dto;

/** Datos de vinculación entregados una vez y asociados a un reto nuevo. */
public record MfaEnrollment(String reto, int venceEn, String qr, String claveManual,
                            String codigoRecuperacion) {

    @Override
    public String toString() {
        return "MfaEnrollment[datos omitidos]";
    }
}

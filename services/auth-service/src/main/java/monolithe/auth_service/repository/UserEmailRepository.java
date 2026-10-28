package monolithe.auth_service.repository;

import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Persistencia del correo principal asociado a una cuenta del sistema. */
@Repository
@RequiredArgsConstructor
public class UserEmailRepository {
    private final JdbcTemplate jdbc;

    /** Identidad obtenida en el servidor, independiente de datos del formulario. */
    public record TargetUser(Long idPersona, String usuarioLogin) {}

    /** Consulta los mismos permisos y protecciones usados para editar el login. */
    public boolean puedeEditar(Long actor, Long usuario) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT COALESCE(public.fn_usuario_tiene_permiso_seguridad(?, 'users.edit'), FALSE)
                   AND COALESCE(public.fn_usuario_objetivo_gestionable(?, ?), FALSE)
                """, Boolean.class, actor, actor, usuario));
    }

    /** Bloquea la persona y su cuenta durante toda la actualización. */
    public Optional<TargetUser> bloquearUsuario(Long usuario) {
        return jdbc.query("""
                SELECT p.id_persona, u.usuario_login
                FROM public.seg_usuarios u
                JOIN public.core_personas p ON p.id_persona = u.id_persona
                WHERE u.id_usuario = ? AND p.activo = TRUE
                LIMIT 1 FOR UPDATE OF p, u
                """, (rs, row) -> new TargetUser(rs.getLong("id_persona"), rs.getString("usuario_login")), usuario)
                .stream().findFirst();
    }

    /** Obtiene EMAIL por código, sin asumir identificadores fijos del catálogo. */
    public Optional<Integer> obtenerTipoEmail() {
        return jdbc.query("""
                SELECT id_tipo_contacto FROM public.cfg_tipos_contacto
                WHERE codigo = 'EMAIL' AND activo = TRUE
                ORDER BY id_tipo_contacto LIMIT 1
                """, (rs, row) -> rs.getInt("id_tipo_contacto")).stream().findFirst();
    }

    /** Serializa altas administrativas concurrentes de la misma dirección. */
    public void bloquearDireccion(String correo) {
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(CAST(? AS text), 0))",
                (rs, row) -> Boolean.TRUE, correo.toLowerCase(Locale.ROOT));
    }

    /** Evita asignar a otra persona un correo activo ya registrado. */
    public boolean perteneceAOtraPersona(Long persona, Integer tipo, String correo) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM public.core_personas_contactos
                    WHERE id_tipo_contacto = ? AND id_persona <> ? AND activo = TRUE
                      AND LOWER(BTRIM(valor)) = LOWER(?) LIMIT 1
                )
                """, Boolean.class, tipo, persona, correo));
    }

    /** Mantiene un único EMAIL principal y reutiliza contactos históricos coincidentes. */
    public void guardarCorreo(Long persona, Integer tipo, String correo) {
        Optional<Long> contacto = buscarContacto(persona, tipo, correo);
        desmarcarPrincipales(persona, tipo);
        if (contacto.isPresent()) promoverContacto(contacto.get(), correo);
        else insertarContacto(persona, tipo, correo);
    }

    private Optional<Long> buscarContacto(Long persona, Integer tipo, String correo) {
        return jdbc.query("""
                SELECT id_persona_contacto FROM public.core_personas_contactos
                WHERE id_persona = ? AND id_tipo_contacto = ? AND LOWER(BTRIM(valor)) = LOWER(?)
                ORDER BY activo DESC, principal DESC, id_persona_contacto DESC LIMIT 1
                """, (rs, row) -> rs.getLong("id_persona_contacto"), persona, tipo, correo)
                .stream().findFirst();
    }

    private void desmarcarPrincipales(Long persona, Integer tipo) {
        jdbc.update("""
                UPDATE public.core_personas_contactos
                SET principal = FALSE, fecha_actualizacion = timezone('utc', NOW())
                WHERE id_persona = ? AND id_tipo_contacto = ? AND principal = TRUE
                """, persona, tipo);
    }

    private void promoverContacto(Long contacto, String correo) {
        jdbc.update("""
                UPDATE public.core_personas_contactos
                SET valor = ?, principal = TRUE, verificado = TRUE, activo = TRUE,
                    fecha_actualizacion = timezone('utc', NOW())
                WHERE id_persona_contacto = ?
                """, correo, contacto);
    }

    private void insertarContacto(Long persona, Integer tipo, String correo) {
        jdbc.update("""
                INSERT INTO public.core_personas_contactos
                    (id_persona, id_tipo_contacto, valor, principal, verificado,
                     permite_notificaciones, activo, fecha_creacion, fecha_actualizacion)
                VALUES (?, ?, ?, TRUE, TRUE, TRUE, TRUE, timezone('utc', NOW()), timezone('utc', NOW()))
                """, persona, tipo, correo);
    }

    /** Registra la acción y su destino sin incluir direcciones ni credenciales. */
    public void registrarAuditoria(Long actor, Long usuario, Long persona) {
        jdbc.queryForObject("""
                SELECT public.sp_registrar_auditoria(
                    ?, 'SEGURIDAD', 'ACTUALIZAR_CORREO_USUARIO', 'USUARIO', CAST(? AS text),
                    'EXITOSO', 'Correo de contacto actualizado administrativamente.',
                    jsonb_build_object('id_persona', CAST(? AS bigint))
                )
                """, Long.class, actor, usuario.toString(), persona);
    }
}

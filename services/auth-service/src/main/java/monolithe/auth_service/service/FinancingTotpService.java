package monolithe.auth_service.service;

import monolithe.auth_service.entity.User;
import monolithe.auth_service.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Segundo factor financiero exclusivamente para GERENCIA.
 * Enrolamiento = JWT + password actual + código por correo corporativo verificado.
 * Nunca persiste secretos en claro ni emite permisos generales de publicación.
 */
@Service
public class FinancingTotpService {
    private final JdbcTemplate db;
    private final UserRepository usuarios;
    private final PasswordEncoder passwords;
    private final EmailService correo;
    private final FinancingTotpCrypto crypto;
    private final RefreshTokenService sesiones;

    public FinancingTotpService(JdbcTemplate db, UserRepository usuarios,
        PasswordEncoder passwords, EmailService correo, FinancingTotpCrypto crypto,
        RefreshTokenService sesiones) {
        this.db = db;
        this.usuarios = usuarios;
        this.passwords = passwords;
        this.correo = correo;
        this.crypto = crypto;
        this.sesiones = sesiones;
    }

    private record Cuenta(String secreto, String pendiente, OffsetDateTime pendienteHasta,
        String pendienteJti, String emailHash, OffsetDateTime emailHasta, String emailJti,
        int emailIntentos, int emailEnvios, OffsetDateTime ventanaInicio,
        OffsetDateTime ultimoEnvio, long ultimoPaso, int intentos,
        OffsetDateTime bloqueo, OffsetDateTime habilitado) {}

    private static ResponseStatusException fallo(HttpStatus status, String mensaje) {
        return new ResponseStatusException(status, mensaje);
    }

    private long actor(Jwt jwt) {
        if (jwt == null || jwt.getId() == null || jwt.getId().length() > 128
            || Boolean.TRUE.equals(jwt.getClaim("password_change_required"))) {
            throw fallo(HttpStatus.FORBIDDEN, "Sesión no válida para seguridad financiera.");
        }
        long id;
        try { id = Long.parseLong(jwt.getSubject()); }
        catch (RuntimeException e) { throw fallo(HttpStatus.FORBIDDEN, "Actor no válido."); }
        Object versionJwt = jwt.getClaim("session_version");
        if (!(versionJwt instanceof Number)) {
            throw fallo(HttpStatus.FORBIDDEN, "Sesión sin versión de seguridad.");
        }
        Boolean autorizado = db.queryForObject("""
            SELECT EXISTS(
              SELECT 1 FROM public.seg_usuarios u
              JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
              JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario
              JOIN public.seg_roles r ON r.id_rol=ur.id_rol
              WHERE u.id_usuario=? AND eu.codigo='ACTIVO' AND eu.activo AND eu.permite_acceso
                AND NOT u.requiere_cambio_password
                AND (u.bloqueado_hasta IS NULL OR u.bloqueado_hasta<=now())
                AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo
                AND r.codigo='GERENCIA'
                AND u.version_sesiones=?
                AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'financing.configure'::varchar)
            )
            """, Boolean.class, id, ((Number)versionJwt).longValue());
        if (!Boolean.TRUE.equals(autorizado)) {
            throw fallo(HttpStatus.FORBIDDEN, "Solo Gerencia activa puede gestionar el factor financiero.");
        }
        return id;
    }

    private Cuenta fila(long actor, boolean bloquear) {
        String sql = """
          SELECT secreto_cifrado,secreto_pendiente,pendiente_expira_en,pendiente_jti,
            email_otp_hash,email_otp_expira_en,email_otp_jti,email_otp_intentos,
            email_envios_ventana,email_ventana_inicio,email_ultimo_envio,
            ultimo_paso_totp,intentos_fallidos,bloqueo_hasta,habilitado_en
          FROM public.seg_fin_totp_cuentas WHERE id_usuario=?
          """ + (bloquear ? " FOR UPDATE" : "");
        List<Cuenta> rows = db.query(sql, (rs, row) -> new Cuenta(
            rs.getString(1),rs.getString(2),rs.getObject(3,OffsetDateTime.class),
            rs.getString(4),rs.getString(5),rs.getObject(6,OffsetDateTime.class),
            rs.getString(7),rs.getInt(8),rs.getInt(9),
            rs.getObject(10,OffsetDateTime.class),rs.getObject(11,OffsetDateTime.class),
            rs.getLong(12),rs.getInt(13),rs.getObject(14,OffsetDateTime.class),
            rs.getObject(15,OffsetDateTime.class)),actor);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private static boolean vigente(OffsetDateTime valor) {
        return valor != null && valor.toInstant().isAfter(Instant.now());
    }

    private void desbloqueado(Cuenta c) {
        if (c != null && vigente(c.bloqueo)) {
            throw fallo(HttpStatus.TOO_MANY_REQUESTS, "Protección activa. Intente de nuevo más tarde.");
        }
    }

    private void falla(long id, Cuenta c) {
        int n = c.intentos() + 1;
        db.update("""
          UPDATE public.seg_fin_totp_cuentas SET intentos_fallidos=?,
            bloqueo_hasta=CASE WHEN ?>=5 THEN now()+interval '15 minutes' ELSE NULL END,
            actualizado_en=now() WHERE id_usuario=?
          """, n>=5?0:n, n, id);
        throw fallo(HttpStatus.BAD_REQUEST, "Código de autenticación inválido, caducado o reutilizado.");
    }

    private void fallaCorreo(long id, Cuenta c) {
        int n = c.emailIntentos()+1;
        db.update("""
          UPDATE public.seg_fin_totp_cuentas
          SET email_otp_intentos=?,
              email_otp_hash=CASE WHEN ?>=5 THEN NULL ELSE email_otp_hash END,
              bloqueo_hasta=CASE WHEN ?>=5 THEN now()+interval '15 minutes' ELSE bloqueo_hasta END,
              actualizado_en=now() WHERE id_usuario=?
          """, n>=5?0:n, n, n, id);
        throw fallo(HttpStatus.BAD_REQUEST,"Código de correo inválido o expirado.");
    }

    private void validarCorreo(Cuenta c,long id,Jwt jwt,String codigo) {
        desbloqueado(c);
        if (c.emailHash()==null || !vigente(c.emailHasta())
           || !jwt.getId().equals(c.emailJti()) || c.emailIntentos()>=5
           || codigo==null || !codigo.matches("[0-9]{6}")
           || !passwords.matches(codigo,c.emailHash())) {
            fallaCorreo(id,c);
        }
    }

    private String emailVerificado(long id) {
        List<String> emails = db.query("""
          SELECT lower(c.valor)
          FROM public.seg_usuarios u
          JOIN public.core_personas_contactos c ON c.id_persona=u.id_persona
          JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto=c.id_tipo_contacto
          WHERE u.id_usuario=? AND tc.codigo='EMAIL' AND tc.activo
            AND c.activo AND c.verificado AND c.principal
            AND lower(c.valor) LIKE '%@monolithe.pe'
          ORDER BY c.id_persona_contacto LIMIT 1
          """,(rs,n)->rs.getString(1),id);
        if (emails.isEmpty()) throw fallo(HttpStatus.CONFLICT,
            "Verifique primero su correo corporativo principal con RR. HH.");
        return emails.getFirst();
    }

    private void auditar(long id,String accion,String descripcion) {
        db.queryForObject("""
          SELECT public.sp_registrar_auditoria(
            CAST(? AS bigint),'SEGURIDAD'::varchar,CAST(? AS varchar),
            'USUARIO'::varchar,CAST(? AS varchar),'EXITOSO'::varchar,
            CAST(? AS varchar),jsonb_build_object('origen','MFA_FINANCIERO'))
          """,Long.class,id,accion,Long.toString(id),descripcion);
    }

    public Map<String,Object> estado(Jwt jwt) {
        long id=actor(jwt);
        Cuenta c=fila(id,false);
        return Map.of("configurado",crypto.configurado(),
           "habilitado",c!=null && c.secreto()!=null,
           "enrolamientoPendiente",c!=null && c.pendiente()!=null && vigente(c.pendienteHasta()),
           "publicacionHabilitada",false,
           "requiereTotp",true);
    }

    /** Persistir intentos fallidos incluso cuando HTTP indica rechazo. */
    @Transactional(noRollbackFor=ResponseStatusException.class)
    public Map<String,String> iniciar(Jwt jwt,String password) {
        long id=actor(jwt);
        if (!crypto.configurado()) throw fallo(HttpStatus.SERVICE_UNAVAILABLE,
            "La clave de cifrado TOTP no está configurada en Auth Service.");
        db.update("INSERT INTO public.seg_fin_totp_cuentas(id_usuario) VALUES (?) ON CONFLICT DO NOTHING",id);
        Cuenta c=fila(id,true);
        desbloqueado(c);
        User u=usuarios.findById(id).orElseThrow(() -> fallo(HttpStatus.FORBIDDEN,"Cuenta no disponible."));
        if (password==null || !passwords.matches(password,u.getPasswordHash())) {
            int n=c.intentos()+1;
            db.update("""
              UPDATE public.seg_fin_totp_cuentas SET intentos_fallidos=?,
                bloqueo_hasta=CASE WHEN ?>=5 THEN now()+interval '15 minutes' ELSE NULL END,
                actualizado_en=now() WHERE id_usuario=?
              """,n>=5?0:n,n,id);
            throw fallo(HttpStatus.FORBIDDEN,"No se pudo comprobar la identidad.");
        }
        String destino=emailVerificado(id);
        Instant now=Instant.now();
        boolean ventana=c.ventanaInicio()!=null &&
            c.ventanaInicio().toInstant().isAfter(now.minusSeconds(3600));
        int enviados=ventana?c.emailEnvios():0;
        if ((c.ultimoEnvio()!=null && c.ultimoEnvio().toInstant().isAfter(now.minusSeconds(60)))
           || enviados>=5) {
            throw fallo(HttpStatus.TOO_MANY_REQUESTS,"Espere antes de solicitar otro código.");
        }
        String codigo=crypto.nuevoCodigoCorreo();
        db.update("""
          UPDATE public.seg_fin_totp_cuentas
          SET email_otp_hash=?,email_otp_expira_en=now()+interval '5 minutes',
            email_otp_jti=?,email_otp_intentos=0,email_envios_ventana=?,
            email_ventana_inicio=CASE WHEN ? THEN email_ventana_inicio ELSE now() END,
            email_ultimo_envio=now(),actualizado_en=now() WHERE id_usuario=?
          """,passwords.encode(codigo),jwt.getId(),enviados+1,ventana,id);
        correo.enviarCodigoMfaFinanciero(destino,codigo);
        auditar(id,"MFA_FIN_EMAIL_ENVIADO","Envío de desafío de correo para protección financiera.");
        return Map.of("mensaje","Código enviado al correo corporativo verificado.");
    }

    @Transactional(noRollbackFor=ResponseStatusException.class)
    public Map<String,String> enrolar(Jwt jwt,String emailCodigo) {
        long id=actor(jwt);
        Cuenta c=fila(id,true);
        if (c==null) throw fallo(HttpStatus.CONFLICT,"Solicite primero la verificación.");
        if (c.secreto()!=null) throw fallo(HttpStatus.CONFLICT,"El factor ya está activo.");
        validarCorreo(c,id,jwt,emailCodigo);
        String secreto=crypto.nuevoSecreto();
        db.update("""
          UPDATE public.seg_fin_totp_cuentas
          SET secreto_pendiente=?,pendiente_expira_en=now()+interval '10 minutes',
          pendiente_jti=?,email_otp_hash=NULL,email_otp_expira_en=NULL,email_otp_jti=NULL,
          email_otp_intentos=0,actualizado_en=now() WHERE id_usuario=?
          """,crypto.cifrar(secreto,id),jwt.getId(),id);
        auditar(id,"MFA_FIN_ENROLAMIENTO_INICIADO","Identidad y correo verificados; factor aún pendiente.");
        String etiqueta="MONOLITHE:Gerencia-" + id;
        String uri="otpauth://totp/" + URLEncoder.encode(etiqueta,StandardCharsets.UTF_8)
          + "?secret="+secreto+"&issuer=MONOLITHE&algorithm=SHA1&digits=6&period=30";
        return Map.of("secreto",secreto,"otpauthUri",uri);
    }

    @Transactional(noRollbackFor=ResponseStatusException.class)
    public Map<String,Object> confirmar(Jwt jwt,String codigo) {
        long id=actor(jwt);
        Cuenta c=fila(id,true);
        if (c==null || c.secreto()!=null || c.pendiente()==null
          || !vigente(c.pendienteHasta()) || !jwt.getId().equals(c.pendienteJti())) {
            throw fallo(HttpStatus.CONFLICT,"El enrolamiento expiró; reinicie la verificación.");
        }
        desbloqueado(c);
        String secreto=crypto.descifrar(c.pendiente(),id);
        long paso=crypto.verificarPaso(secreto,codigo,-1,Instant.now());
        if(paso<0) { falla(id,c); }
        db.update("""
          UPDATE public.seg_fin_totp_cuentas SET secreto_cifrado=secreto_pendiente,
          secreto_pendiente=NULL,pendiente_expira_en=NULL,pendiente_jti=NULL,
          habilitado_en=now(),revocado_en=NULL,ultimo_paso_totp=?,
          intentos_fallidos=0,bloqueo_hasta=NULL,actualizado_en=now() WHERE id_usuario=?
          """,paso,id);
        db.update("DELETE FROM public.seg_fin_totp_recuperacion WHERE id_usuario=?",id);
        List<String> claves=new ArrayList<>();
        for(int i=0;i<10;i++) {
            String recovery=HexFormat.of().formatHex(crypto.aleatorio(16)).toUpperCase(Locale.ROOT);
            claves.add(recovery);
            db.update("INSERT INTO public.seg_fin_totp_recuperacion(id_usuario,codigo_hash) VALUES (?,?)",
              id,FinancingTotpCrypto.hash(recovery));
        }
        auditar(id,"MFA_FIN_ACTIVADO","Autenticador financiero habilitado; códigos de respaldo emitidos.");
        // Nunca registrar en logs ni reenviar los códigos de recuperación.
        return Map.of("habilitado",true,"codigosRecuperacion",claves);
    }

    private long validarTotp(Cuenta c,long id,String codigo) {
        if (c==null || c.secreto()==null) throw fallo(HttpStatus.CONFLICT,"Debe activar TOTP.");
        desbloqueado(c);
        long paso=crypto.verificarPaso(crypto.descifrar(c.secreto(),id),
                                      codigo,c.ultimoPaso(),Instant.now());
        if(paso<0) { falla(id,c); }
        db.update("""
          UPDATE public.seg_fin_totp_cuentas SET ultimo_paso_totp=?,
          intentos_fallidos=0,bloqueo_hasta=NULL,actualizado_en=now()
          WHERE id_usuario=?
          """,paso,id);
        return paso;
    }

    /** Un recibo de aprobación no publica políticas; Bloque 4 deberá consumirlo en su transacción. */
    @Transactional(noRollbackFor=ResponseStatusException.class)
    public Map<String,Object> autorizar(Jwt jwt,String codigo,Integer version,String hash,UUID nonce) {
        long id=actor(jwt);
        if(version==null || version<=0 || hash==null || !hash.matches("[0-9a-f]{64}") || nonce==null) {
            throw fallo(HttpStatus.BAD_REQUEST,"Propuesta financiera o nonce inválidos.");
        }
        Integer vigente=db.queryForObject("""
          SELECT p.version FROM public.cfg_fin_politica_activa a
          JOIN public.cfg_fin_politicas_versiones p ON p.id_politica=a.id_politica
          WHERE a.id=1
          """,Integer.class);
        if(!version.equals(vigente)) throw fallo(HttpStatus.CONFLICT,
            "La versión financiera cambió. Revalide la propuesta.");
        Integer previo=db.queryForObject("""
          SELECT count(*) FROM public.seg_fin_totp_autorizaciones
          WHERE id_usuario=? AND nonce=?
          """,Integer.class,id,nonce);
        if(previo!=null && previo>0) throw fallo(HttpStatus.CONFLICT,"Nonce ya utilizado.");
        Cuenta c=fila(id,true);
        validarTotp(c,id,codigo);
        UUID token=UUID.randomUUID();
        db.update("""
          INSERT INTO public.seg_fin_totp_autorizaciones
          (id_autorizacion,id_usuario,token_jti,version_esperada,hash_propuesta,nonce,expira_en)
          VALUES (?,?,?,?,?,?,now()+interval '120 seconds')
          """,token,id,jwt.getId(),version,hash,nonce);
        auditar(id,"MFA_FIN_AUTORIZACION_EMITIDA",
            "Autorización temporal emitida para propuesta financiera. Sin publicación.");
        return Map.of("autorizacionId",token.toString(),"expiraEnSegundos",120,
            "publicacionHabilitada",false);
    }

    @Transactional(noRollbackFor=ResponseStatusException.class)
    public Map<String,String> revocar(Jwt jwt,String codigoEmail,String codigoTotp) {
        long id=actor(jwt);
        Cuenta c=fila(id,true);
        if(c==null || c.secreto()==null) throw fallo(HttpStatus.CONFLICT,"El factor no está activo.");
        validarCorreo(c,id,jwt,codigoEmail);
        validarTotp(c,id,codigoTotp);
        limpiar(id);
        auditar(id,"MFA_FIN_REVOCADO","Autenticador financiero revocado mediante dos canales.");
        sesiones.revocarTodasLasSesiones(id,"REVOCACION_MFA_FINANCIERO");
        return Map.of("mensaje","Factor revocado. Inicie sesión nuevamente.");
    }

    @Transactional(noRollbackFor=ResponseStatusException.class)
    public Map<String,String> recuperar(Jwt jwt,String codigoEmail,String codigoRecuperacion) {
        long id=actor(jwt);
        Cuenta c=fila(id,true);
        if(c==null || c.secreto()==null) throw fallo(HttpStatus.CONFLICT,"El factor no está activo.");
        validarCorreo(c,id,jwt,codigoEmail);
        if(codigoRecuperacion==null || !codigoRecuperacion.matches("[A-Fa-f0-9]{32}")) falla(id,c);
        String hash=FinancingTotpCrypto.hash(codigoRecuperacion.toUpperCase(Locale.ROOT));
        int usados=db.update("""
          UPDATE public.seg_fin_totp_recuperacion SET usado_en=now()
          WHERE id_usuario=? AND codigo_hash=? AND usado_en IS NULL
          """,id,hash);
        if(usados!=1) falla(id,c);
        limpiar(id);
        auditar(id,"MFA_FIN_RECUPERACION",
            "Factor anterior invalidado tras contraseña, correo verificado y código de recuperación.");
        sesiones.revocarTodasLasSesiones(id,"RECUPERACION_MFA_FINANCIERO");
        return Map.of("mensaje","Factor restablecido. Inicie sesión y registre uno nuevo.");
    }

    private void limpiar(long id) {
        db.update("""
          UPDATE public.seg_fin_totp_cuentas SET secreto_cifrado=NULL,
          secreto_pendiente=NULL,pendiente_expira_en=NULL,pendiente_jti=NULL,
          email_otp_hash=NULL,email_otp_expira_en=NULL,email_otp_jti=NULL,
          email_otp_intentos=0,ultimo_paso_totp=-1,intentos_fallidos=0,
          bloqueo_hasta=NULL,habilitado_en=NULL,revocado_en=now(),actualizado_en=now()
          WHERE id_usuario=?
          """,id);
        db.update("DELETE FROM public.seg_fin_totp_recuperacion WHERE id_usuario=?",id);
        db.update("""
          UPDATE public.seg_fin_totp_autorizaciones SET consumido_en=now()
          WHERE id_usuario=? AND consumido_en IS NULL
          """,id);
    }
}

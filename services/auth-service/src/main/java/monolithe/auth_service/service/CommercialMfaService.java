package monolithe.auth_service.service;

import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.security.SecureRandom;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class CommercialMfaService {
    private static final Set<String> ACCIONES=Set.of("MATRIZ","TARIFA","DISPONIBILIDAD","IMPORTACION","PUBLICACION","ETAPAS","ASIGNACION");
    private final JdbcTemplate db;
    private final PasswordEncoder passwords;
    private final EmailService correo;
    private final SecureRandom random=new SecureRandom();
    public CommercialMfaService(JdbcTemplate db,PasswordEncoder passwords,EmailService correo){
        this.db=db;this.passwords=passwords;this.correo=correo;
    }
    private ResponseStatusException fallo(HttpStatus status,String mensaje){return new ResponseStatusException(status,mensaje);}
    private long actor(Jwt jwt){
        if(jwt==null||jwt.getId()==null||jwt.getId().length()>128||!(jwt.getClaim("session_version") instanceof Number version)||Boolean.TRUE.equals(jwt.getClaim("password_change_required")))
            throw fallo(HttpStatus.FORBIDDEN,"Sesión no válida para la confirmación comercial.");
        long id;
        try{id=Long.parseLong(jwt.getSubject());}catch(RuntimeException e){throw fallo(HttpStatus.FORBIDDEN,"Identidad inválida.");}
        Boolean ok=db.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM public.seg_usuarios u
              JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
              JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario
              JOIN public.seg_roles r ON r.id_rol=ur.id_rol
              WHERE u.id_usuario=? AND eu.codigo='ACTIVO' AND eu.activo AND eu.permite_acceso
                AND NOT u.requiere_cambio_password AND (u.bloqueado_hasta IS NULL OR u.bloqueado_hasta<=now())
                AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo AND r.codigo='GERENCIA'
                AND u.version_sesiones=?
                AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'projects.view'::varchar)
                AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'projects.edit'::varchar)
                AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'lots.edit'::varchar))
            """,Boolean.class,id,version.longValue());
        if(!Boolean.TRUE.equals(ok))throw fallo(HttpStatus.FORBIDDEN,"No tienes autorización comercial vigente.");
        return id;
    }
    private String email(long id){
        return db.query("""
          SELECT lower(btrim(c.valor)) FROM public.seg_usuarios u
          JOIN public.core_personas_contactos c ON c.id_persona=u.id_persona
          JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto=c.id_tipo_contacto
          WHERE u.id_usuario=? AND tc.codigo='EMAIL' AND tc.activo AND c.activo AND c.verificado AND c.principal
            AND nullif(btrim(c.valor),'') IS NOT NULL
          ORDER BY c.id_persona_contacto LIMIT 1
          """,(rs,n)->rs.getString(1),id).stream().findFirst().orElseThrow(()->fallo(HttpStatus.CONFLICT,"Verifica primero el correo principal de tu cuenta."));
    }
    private static String hash(String v){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(v.getBytes(StandardCharsets.UTF_8)));}
        catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
    private record Fila(String sesion,String email,String codigo,int intentos,boolean vigente,boolean consumido,String aprobado,boolean aprobacionVigente,long proyecto,String accion,String huella){}
    private Fila fila(UUID id,long actor){
        return db.query("""
            SELECT sesion,correo_huella,codigo_hash,intentos,vence>now(),consumido,aprobado_hash,
              coalesce(aprobado_hasta>now(),false),proyecto,accion,huella
            FROM public.seg_mfa_comercial WHERE id=? AND actor=? FOR UPDATE
            """,(r,n)->new Fila(r.getString(1),r.getString(2),r.getString(3),r.getInt(4),r.getBoolean(5),r.getBoolean(6),r.getString(7),r.getBoolean(8),r.getLong(9),r.getString(10),r.getString(11)),id,actor)
            .stream().findFirst().orElseThrow(()->fallo(HttpStatus.BAD_REQUEST,"La confirmación no existe o expiró."));
    }
    private void validarContexto(Fila f,Jwt jwt,long actor){
        if(f.consumido()||!f.sesion().equals(jwt.getId())||!f.email().equals(hash(email(actor))))
            throw fallo(HttpStatus.BAD_REQUEST,"La confirmación ya no es válida. Solicita un nuevo código.");
    }
    @Transactional
    public Map<String,Object> iniciar(Jwt jwt,long proyecto,String accion,String huella){
        long actor=actor(jwt);
        if(proyecto<=0||!ACCIONES.contains(accion)||huella==null||!huella.matches("[a-f0-9]{64}"))throw fallo(HttpStatus.BAD_REQUEST,"Operación inválida.");
        db.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended('mfa-comercial:'||CAST(? AS text),0))",(r,n)->Boolean.TRUE,actor);
        int recientes=db.queryForObject("SELECT count(*) FROM public.seg_mfa_comercial WHERE actor=? AND creado>now()-interval '15 minutes'",Integer.class,actor);
        Boolean inmediato=db.queryForObject("SELECT EXISTS(SELECT 1 FROM public.seg_mfa_comercial WHERE actor=? AND creado>now()-interval '60 seconds')",Boolean.class,actor);
        if(recientes>=5||Boolean.TRUE.equals(inmediato))throw fallo(HttpStatus.TOO_MANY_REQUESTS,"Espera antes de solicitar otro código (máximo cinco cada 15 minutos).");
        String destino=email(actor);
        UUID id=UUID.randomUUID();
        String codigo=String.format(Locale.ROOT,"%06d",random.nextInt(1_000_000));
        db.update("UPDATE public.seg_mfa_comercial SET consumido=true WHERE actor=? AND NOT consumido",actor);
        db.update("""
            INSERT INTO public.seg_mfa_comercial(id,actor,sesion,proyecto,accion,huella,correo_huella,codigo_hash,vence)
            VALUES(?,?,?,?,?,?,?,?,now()+interval '5 minutes')
            """,id,actor,jwt.getId(),proyecto,accion,huella,hash(destino),passwords.encode(codigo));
        db.update("DELETE FROM public.seg_mfa_comercial WHERE actor=? AND creado<now()-interval '7 days'",actor);
        try{correo.enviarCodigoMfaComercial(destino,codigo,accion,proyecto);}
        catch(RuntimeException e){throw fallo(HttpStatus.SERVICE_UNAVAILABLE,"No se pudo enviar el código de confirmación.");}
        int arroba=destino.indexOf('@');
        String oculto=destino.substring(0,1)+"***"+(arroba>0?destino.substring(arroba):"");
        return Map.of("challengeId",id.toString(),"correo",oculto,"expiraEn",300,"reenviarEn",60);
    }
    @Transactional(noRollbackFor=ResponseStatusException.class)
    public Map<String,String> verificar(Jwt jwt,UUID id,String codigo){
        long actor=actor(jwt);Fila f=fila(id,actor);validarContexto(f,jwt,actor);
        if(!f.vigente()||f.intentos()>=5||f.aprobado()!=null)throw fallo(HttpStatus.BAD_REQUEST,"El código expiró, fue utilizado o superó los intentos permitidos.");
        if(codigo==null||!codigo.matches("[0-9]{6}")||!passwords.matches(codigo,f.codigo())){
            db.update("UPDATE public.seg_mfa_comercial SET intentos=intentos+1 WHERE id=?",id);
            throw fallo(HttpStatus.BAD_REQUEST,f.intentos()>=4?"Has superado los intentos permitidos. Solicita otro código.":"El código es incorrecto.");
        }
        byte[] bytes=new byte[32];random.nextBytes(bytes);
        String secreto=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        db.update("UPDATE public.seg_mfa_comercial SET aprobado_hash=?,aprobado_hasta=least(vence,now()+interval '60 seconds') WHERE id=?",hash(secreto),id);
        return Map.of("approvalToken",id+"."+secreto);
    }
    @Transactional
    public void consumir(Jwt jwt,long proyecto,String accion,String huella,String token){
        long actor=actor(jwt);
        if(token==null||!token.matches("[0-9a-f-]{36}\\.[A-Za-z0-9_-]{43}"))throw fallo(HttpStatus.PRECONDITION_REQUIRED,"Confirma primero la operación mediante el código enviado a tu correo.");
        String[] partes=token.split("\\.",2);
        UUID id;
        try{id=UUID.fromString(partes[0]);}catch(IllegalArgumentException e){throw fallo(HttpStatus.BAD_REQUEST,"Confirmación inválida.");}
        Fila f=fila(id,actor);validarContexto(f,jwt,actor);
        if(!f.aprobacionVigente()||f.aprobado()==null||!MessageDigest.isEqual(f.aprobado().getBytes(StandardCharsets.US_ASCII),hash(partes[1]).getBytes(StandardCharsets.US_ASCII))||f.proyecto()!=proyecto||!f.accion().equals(accion)||!f.huella().equals(huella))
            throw fallo(HttpStatus.PRECONDITION_REQUIRED,"La autorización expiró o no corresponde a esta operación.");
        db.update("UPDATE public.seg_mfa_comercial SET consumido=true,aprobado_hash=NULL WHERE id=?",id);
    }
}

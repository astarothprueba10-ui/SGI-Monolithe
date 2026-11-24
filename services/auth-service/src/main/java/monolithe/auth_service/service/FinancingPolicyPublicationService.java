package monolithe.auth_service.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.Map;
import java.util.UUID;

/** Previsualización y publicación en BD; la firma MFA solo la autoriza FinancingTotpService. */
@Service
@Slf4j
public class FinancingPolicyPublicationService {
    private final JdbcTemplate db;
    private final JsonMapper jsonMapper;
    private final EmailService emailService;

    public FinancingPolicyPublicationService(JdbcTemplate db, JsonMapper jsonMapper, EmailService emailService) {
        this.db = db;
        this.jsonMapper = jsonMapper;
        this.emailService = emailService;
    }

    private static ResponseStatusException error(HttpStatus estado,String mensaje) {
        return new ResponseStatusException(estado,mensaje);
    }

    private long actor(Jwt jwt) {
        if (jwt == null || jwt.getId()==null || jwt.getId().length()>128
                || Boolean.TRUE.equals(jwt.getClaim("password_change_required"))) {
            throw error(HttpStatus.FORBIDDEN,"Sesión no válida para publicar políticas.");
        }
        try { return Long.parseLong(jwt.getSubject()); }
        catch (RuntimeException ex) { throw error(HttpStatus.FORBIDDEN,"Actor no válido."); }
    }

    private long versionSesion(Jwt jwt) {
        Object version=jwt.getClaim("session_version");
        if (!(version instanceof Number)) throw error(HttpStatus.FORBIDDEN,"Versión de sesión no válida.");
        return ((Number)version).longValue();
    }

    private String json(Map<String,Object> borrador) {
        if (borrador==null || borrador.isEmpty() || borrador.size()>16)
            throw error(HttpStatus.BAD_REQUEST,"La propuesta está incompleta.");
        try { return jsonMapper.writeValueAsString(borrador); }
        catch (JacksonException ex) { throw error(HttpStatus.BAD_REQUEST,"Propuesta con formato incorrecto."); }
    }

    private JsonNode parsear(String respuesta) {
        try { return jsonMapper.readTree(respuesta); }
        catch (JacksonException ex) { throw new IllegalStateException("Respuesta SQL inválida.",ex); }
    }

    /** Alternativa de consulta para staging con solo Auth Service y Backoffice.
     * Usa el mismo SP que Core, con autorización de Gerencia validada por PostgreSQL.
     */
    @Transactional(readOnly = true)
    public JsonNode consultarActual(Jwt jwt) {
        long id = actor(jwt);
        versionSesion(jwt);
        try {
            String resultado = db.queryForObject("""
                SELECT public.sp_fin_consultar_politicas_v1(CAST(? AS bigint))::text
                """, String.class, id);
            return parsear(resultado);
        } catch (DataAccessException ex) { throw traducir(ex); }
    }

    @Transactional(readOnly=true)
    public JsonNode consultarProyecto(Jwt jwt,Long idProyecto) {
        long id=actor(jwt);
        versionSesion(jwt);
        if(idProyecto==null || idProyecto<1) throw error(HttpStatus.BAD_REQUEST,"Proyecto inválido.");
        try {
            return parsear(db.queryForObject("""
                SELECT public.sp_fin_consultar_politicas_proyecto_v2(CAST(? AS bigint),CAST(? AS bigint))::text
                """,String.class,id,idProyecto));
        } catch (DataAccessException ex) { throw traducir(ex); }
    }

    /** No se transfiere el hash del cliente: el motor canónico está centralizado en SQL. */
    @Transactional(readOnly=true)
    public JsonNode previsualizar(Jwt jwt, Integer version, Map<String,Object> borrador) {
        long id=actor(jwt);
        versionSesion(jwt);
        if (version==null || version<1) throw error(HttpStatus.BAD_REQUEST,"Versión esperada inválida.");
        try {
            String resultado=db.queryForObject("""
              SELECT public.sp_fin_previsualizar_borrador_v1(
                 CAST(? AS bigint),CAST(? AS integer),CAST(? AS jsonb))::text
              """,String.class,id,version,json(borrador));
            return parsear(resultado);
        } catch (DataAccessException ex) { throw traducir(ex); }
    }

    /** Este llamado revalida hash, sesión, nonce y TOTP en PostgreSQL dentro de una sola transacción. */
    @Transactional
    public JsonNode publicar(Jwt jwt,Integer version,Map<String,Object> borrador,
                             UUID autorizacionId,UUID nonce,Boolean confirmacionExplicita) {
        long id=actor(jwt);
        long sesion=versionSesion(jwt);
        if (!Boolean.TRUE.equals(confirmacionExplicita) || version==null || version<1
                || autorizacionId==null || nonce==null) {
            throw error(HttpStatus.BAD_REQUEST,"Requiere confirmar expresamente la propuesta y su versión.");
        }
        try {
            String resultado=db.queryForObject("""
              SELECT public.sp_fin_publicar_politica_v1(
                 CAST(? AS bigint),CAST(? AS bigint),CAST(? AS text),
                 CAST(? AS uuid),CAST(? AS uuid),CAST(? AS integer),
                 CAST(? AS jsonb))::text
              """,String.class,id,sesion,jwt.getId(),autorizacionId,nonce,version,json(borrador));
            JsonNode respuesta=parsear(resultado);
            String versionNueva=respuesta.path("version").asText();
            avisarPostCommit(id,"PUBLICACIÓN DE POLÍTICA FINANCIERA V"+versionNueva);
            return respuesta;
        } catch (DataAccessException ex) { throw traducir(ex); }
    }

    /** Leer el correo en el servidor; jamás recibir un destinatario controlado por el cliente. */
    private void avisarPostCommit(long id,String evento) {
        var emails=db.query("""
          SELECT lower(c.valor) FROM public.seg_usuarios u
          JOIN public.core_personas_contactos c ON c.id_persona=u.id_persona
          JOIN public.cfg_tipos_contacto t ON t.id_tipo_contacto=c.id_tipo_contacto
          WHERE u.id_usuario=? AND t.codigo='EMAIL' AND t.activo AND c.principal
            AND c.verificado AND c.activo AND nullif(btrim(c.valor),'') IS NOT NULL
          ORDER BY c.id_persona_contacto LIMIT 1
          """,(rs,n)->rs.getString(1),id);
        if (emails.isEmpty()) throw error(HttpStatus.CONFLICT,"Falta el correo verificado.");
        String destino=emails.getFirst();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                try { emailService.enviarAvisoMfaFinanciero(destino,evento); }
                catch (RuntimeException ex) { log.warn("Aviso de publicación financiera no entregado."); }
            }
        });
    }

    /** Errores públicos sin incluir consultas SQL ni valores privados del motor. */
    private ResponseStatusException traducir(DataAccessException ex) {
        String msg=ex.getMostSpecificCause()!=null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if(msg==null) msg="";
        if(msg.contains("PUBLICACION_BLOQUEADA|"))
            return error(HttpStatus.LOCKED,"La publicación está bloqueada hasta cerrar las pruebas de MFA.");
        if(msg.contains("POLITICA_CAMBIO|"))
            return error(HttpStatus.CONFLICT,"La política cambió. Recargue y confirme la nueva versión.");
        if(msg.contains("POLITICA_SIN_CAMBIOS|"))
            return error(HttpStatus.BAD_REQUEST,"Modifique al menos una condición financiera.");
        if(msg.contains("BORRADOR_INVALIDO|"))
            return error(HttpStatus.BAD_REQUEST,"La propuesta financiera no supera las validaciones.");
        if(msg.contains("AUTORIZACION_INVALIDA|"))
            return error(HttpStatus.CONFLICT,"La autorización TOTP expiró, se utilizó o no corresponde al borrador.");
        if(msg.contains("MFA_REQUERIDA|"))
            return error(HttpStatus.FORBIDDEN,"Active TOTP y verifique el correo principal registrado.");
        if(msg.contains("ACCESO_DENEGADO|"))
            return error(HttpStatus.FORBIDDEN,"No tiene permisos vigentes de Gerencia.");
        if(msg.contains("POLITICA_NO_DISPONIBLE|"))
            return error(HttpStatus.SERVICE_UNAVAILABLE,"No está disponible la política financiera.");
        log.warn("No se completó la operación SQL financiera: {}",
            ex.getClass().getSimpleName());
        return error(HttpStatus.SERVICE_UNAVAILABLE,"No se pudo confirmar la operación financiera.");
    }
}

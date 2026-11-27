package monolithe.auth_service.service;

import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import java.sql.ResultSet;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CommercialMfaServiceTest {
    private final JdbcTemplate db=mock(JdbcTemplate.class);
    private final PasswordEncoder passwords=mock(PasswordEncoder.class);
    private final EmailService mail=mock(EmailService.class);
    private final CommercialMfaService mfa=new CommercialMfaService(db,passwords,mail);
    private final Jwt jwt=mock(Jwt.class);
    private final UUID id=UUID.randomUUID();
    private final String huella="a".repeat(64);
    private final String secreto="A".repeat(43);
    private ResultSet rs;
    private static String hash(String s)throws Exception{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));}
    @BeforeEach @SuppressWarnings({"unchecked","rawtypes"})
    void preparar()throws Exception{
        when(jwt.getSubject()).thenReturn("5");when(jwt.getId()).thenReturn("jti-1");
        when(jwt.getClaim("session_version")).thenReturn(1L);
        when(db.queryForObject(contains("SELECT EXISTS(SELECT 1 FROM public.seg_usuarios"),eq(Boolean.class),eq(5L),eq(1L))).thenReturn(true);
        when(db.query(contains("SELECT lower(btrim(c.valor))"),any(RowMapper.class),eq(5L))).thenReturn(List.of("gerencia@example.test"));
        rs=mock(ResultSet.class);
        when(rs.getString(1)).thenReturn("jti-1");when(rs.getString(2)).thenReturn(hash("gerencia@example.test"));when(rs.getString(3)).thenReturn("hash-code");
        when(rs.getInt(4)).thenReturn(0);when(rs.getBoolean(5)).thenReturn(true);when(rs.getBoolean(6)).thenReturn(false);
        when(rs.getString(7)).thenReturn(null);when(rs.getBoolean(8)).thenReturn(true);when(rs.getLong(9)).thenReturn(2L);when(rs.getString(10)).thenReturn("MATRIZ");when(rs.getString(11)).thenReturn(huella);
        when(db.query(contains("FROM public.seg_mfa_comercial WHERE id=? AND actor=? FOR UPDATE"),any(RowMapper.class),eq(id),eq(5L)))
            .thenAnswer(inv->List.of(((RowMapper)inv.getArgument(1)).mapRow(rs,0)));
    }
    @Test void nombreRealDelProyectoSeUsaEnCorreoYRespuesta(){
        when(db.query(contains("SELECT nombre FROM public.inm_proyectos"),any(RowMapper.class),eq(2L))).thenReturn(List.of("Residencial Campestre Los Cocos"));
        when(db.queryForObject(contains("SELECT count(*)>=5"),eq(Boolean.class),eq(5L))).thenReturn(false);
        when(passwords.encode(anyString())).thenReturn("hash-code");
        var resultado=mfa.iniciar(jwt,2,"MATRIZ",huella);
        assertEquals("Residencial Campestre Los Cocos",resultado.get("proyectoNombre"));
        verify(mail).enviarCodigoMfaComercial(eq("gerencia@example.test"),matches("[0-9]{6}"),eq("MATRIZ"),eq("Residencial Campestre Los Cocos"));
    }
    @Test void manzanasNoGeneranDesafio(){
        assertThrows(ResponseStatusException.class,()->mfa.iniciar(jwt,2,"MANZANA",huella));
        assertThrows(ResponseStatusException.class,()->mfa.iniciar(jwt,2,"ASIGNACION",huella));
        verifyNoInteractions(mail);
    }
    @Test void codigoIncorrectoCuentaIntentoYQuintoBloquea()throws Exception{
        when(passwords.matches("123456","hash-code")).thenReturn(false);
        var err=assertThrows(ResponseStatusException.class,()->mfa.verificar(jwt,id,"123456"));
        assertEquals(400,err.getStatusCode().value());
        verify(db).update("UPDATE public.seg_mfa_comercial SET intentos=intentos+1 WHERE id=?",id);
        when(rs.getInt(4)).thenReturn(5);
        assertThrows(ResponseStatusException.class,()->mfa.verificar(jwt,id,"123456"));
        verify(db,times(1)).update("UPDATE public.seg_mfa_comercial SET intentos=intentos+1 WHERE id=?",id);
    }
    @Test void noApruebaCodigoExpirado()throws Exception{
        when(rs.getBoolean(5)).thenReturn(false);
        assertThrows(ResponseStatusException.class,()->mfa.verificar(jwt,id,"123456"));
        verifyNoInteractions(passwords);
    }
    @Test void autorizacionVinculadaAAccionProyectoDatosYUnSoloUso()throws Exception{
        when(rs.getString(7)).thenReturn(hash(secreto));
        String token=id+"."+secreto;
        assertThrows(ResponseStatusException.class,()->mfa.consumir(jwt,3,"MATRIZ",huella,token));
        assertThrows(ResponseStatusException.class,()->mfa.consumir(jwt,2,"TARIFA",huella,token));
        assertThrows(ResponseStatusException.class,()->mfa.consumir(jwt,2,"MATRIZ","b".repeat(64),token));
        verify(db,never()).update("UPDATE public.seg_mfa_comercial SET consumido=true,aprobado_hash=NULL WHERE id=?",id);
        mfa.consumir(jwt,2,"MATRIZ",huella,token);
        verify(db).update("UPDATE public.seg_mfa_comercial SET consumido=true,aprobado_hash=NULL WHERE id=?",id);
        when(rs.getBoolean(6)).thenReturn(true);
        assertThrows(ResponseStatusException.class,()->mfa.consumir(jwt,2,"MATRIZ",huella,token));
        verify(db,times(1)).update("UPDATE public.seg_mfa_comercial SET consumido=true,aprobado_hash=NULL WHERE id=?",id);
    }
    @Test void autorizacionNoSeTrasladaAOtraSesion()throws Exception{
        when(rs.getString(7)).thenReturn(hash(secreto));when(jwt.getId()).thenReturn("otra-sesion");
        assertThrows(ResponseStatusException.class,()->mfa.consumir(jwt,2,"MATRIZ",huella,id+"."+secreto));
    }
}

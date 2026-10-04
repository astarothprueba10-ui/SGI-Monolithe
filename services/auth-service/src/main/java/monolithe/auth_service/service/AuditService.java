package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final JdbcClient jdbcClient;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(
            Long idUsuario,
            String accion,
            String resultado,
            String descripcion,
            String ipOrigen,
            String userAgent,
            String metodoHttp,
            String ruta) {

       jdbcClient.sql("""
        SELECT public.sp_registrar_auditoria(
            :idUsuario,
            'SEGURIDAD',
            :accion,
            'USUARIO',
            :idEntidad,
            :resultado,
            :descripcion,
            jsonb_build_object(
                'ip_origen', :ipOrigen,
                'user_agent', :userAgent,
                'metodo_http', :metodoHttp,
                'ruta', :ruta
            )
        )
        """)
        .param("idUsuario", idUsuario)
        .param("accion", accion)
        .param(
                "idEntidad",
                idUsuario != null ? idUsuario.toString() : null)
        .param("resultado", resultado)
        .param("descripcion", limitar(descripcion, 1000))
        .param("ipOrigen", limitar(ipOrigen, 45))
        .param("userAgent", limitar(userAgent, 500))
        .param("metodoHttp", limitar(metodoHttp, 10))
        .param("ruta", limitar(ruta, 500))
        .query(Long.class)
        .single();
    }

    private String limitar(String texto, int maximo) {

        if (texto == null) {
            return null;
        }

        return texto.length() <= maximo
                ? texto
                : texto.substring(0, maximo);
    }
}
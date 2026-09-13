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

        try {

            jdbcClient.sql("""
                    INSERT INTO aud_eventos (
                        id_usuario,
                        modulo,
                        accion,
                        entidad,
                        id_entidad,
                        resultado,
                        descripcion,
                        ip_origen,
                        user_agent,
                        metodo_http,
                        ruta
                    )
                    VALUES (
                        :idUsuario,
                        'SEGURIDAD',
                        :accion,
                        'USUARIO',
                        :idEntidad,
                        :resultado,
                        :descripcion,
                        :ipOrigen,
                        :userAgent,
                        :metodoHttp,
                        :ruta
                    )
                    """)
                    .param("idUsuario", idUsuario)
                    .param("accion", accion)
                    .param("idEntidad",
                            idUsuario != null ? idUsuario.toString() : null)
                    .param("resultado", resultado)
                    .param("descripcion", limitar(descripcion, 1000))
                    .param("ipOrigen", limitar(ipOrigen, 45))
                    .param("userAgent", limitar(userAgent, 500))
                    .param("metodoHttp", limitar(metodoHttp, 10))
                    .param("ruta", limitar(ruta, 500))
                    .update();

        } catch (RuntimeException e) {

            log.error(
                    "No fue posible registrar evento de auditoría. accion={}, idUsuario={}",
                    accion,
                    idUsuario);
        }
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
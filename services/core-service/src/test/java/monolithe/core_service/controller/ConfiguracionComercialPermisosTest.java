package monolithe.core_service.controller;

import monolithe.core_service.service.ConfiguracionProyectoService;
import monolithe.core_service.service.PublicacionComercialService;
import monolithe.core_service.service.SimulacionComercialService;
import monolithe.core_service.service.CommercialMfaClient;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Arrays;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ConfiguracionComercialPermisosTest {
    @Configuration
    @EnableMethodSecurity
    static class Seguridad {}

    private void autenticar(String... permisos) {
        var auth = UsernamePasswordAuthenticationToken.authenticated("1",null,
                Arrays.stream(permisos).map(SimpleGrantedAuthority::new).toList());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test void lecturaSupervisorNoConcedeEscrituraNiHistorial() {
        var config=mock(ConfiguracionProyectoService.class);
        var publicacion=mock(PublicacionComercialService.class);
        var simulacion=mock(SimulacionComercialService.class);
        var mfa=mock(CommercialMfaClient.class);
        try(var ctx=new AnnotationConfigApplicationContext()) {
            ctx.register(Seguridad.class);
            ctx.registerBean(ConfiguracionProyectoController.class,
                ()->new ConfiguracionProyectoController(config,simulacion,publicacion,mfa));
            ctx.refresh();
            var api=ctx.getBean(ConfiguracionProyectoController.class);
            autenticar("ROLE_SUPERVISOR_COMERCIAL","projects.view","lots.view");
            assertDoesNotThrow(()->{api.obtener(2L);api.estadoPublicacion(2L);api.gestion(2L);});
            verify(config).obtener(2L);
            verify(publicacion).gestion(2L);
            // Incluso con permisos de edición añadidos, el rol supervisor no puede mutar.
            autenticar("ROLE_SUPERVISOR_COMERCIAL","projects.view","lots.view","projects.edit","lots.edit");
            assertThrows(AccessDeniedException.class,()->api.guardar(2L,null,null,null));
            assertThrows(AccessDeniedException.class,()->api.publicar(2L,null,null,null));
            assertThrows(AccessDeniedException.class,()->api.revisarPublicacion(2L,null));
            assertThrows(AccessDeniedException.class,()->api.disponibilidad(2L,null,null,null));
            assertThrows(AccessDeniedException.class,()->api.asignacion(2L,null,null));
            assertThrows(AccessDeniedException.class,()->api.etapas(2L,null,null,null));
            assertThrows(AccessDeniedException.class,()->api.matriz(2L,null,null,null));
            assertThrows(AccessDeniedException.class,()->api.tarifa(2L,null,null,null));
            assertThrows(AccessDeniedException.class,()->api.historial(2L));
            assertThrows(AccessDeniedException.class,()->api.simular(2L,1L,1,"PEN"));
            verifyNoInteractions(mfa,simulacion);
            autenticar("ROLE_ASESOR","projects.view","lots.view");
            assertThrows(AccessDeniedException.class,()->api.obtener(2L));
            assertThrows(AccessDeniedException.class,()->api.estadoPublicacion(2L));
            assertThrows(AccessDeniedException.class,()->api.gestion(2L));
            autenticar("ROLE_SUPERVISOR_COMERCIAL","projects.view");
            assertThrows(AccessDeniedException.class,()->api.obtener(2L));
            autenticar("ROLE_GERENCIA","projects.view","projects.edit","lots.edit");
            assertDoesNotThrow(()->{api.obtener(2L);api.estadoPublicacion(2L);api.gestion(2L);});
        }finally{SecurityContextHolder.clearContext();}
    }
}

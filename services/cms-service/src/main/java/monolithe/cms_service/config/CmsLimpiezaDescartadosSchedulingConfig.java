package monolithe.cms_service.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** No se activa sin consentimiento explicito por configuracion del entorno. */
@Configuration
@EnableScheduling
@ConditionalOnProperty(prefix = "cms.borradores.limpieza-descartados",
        name = "enabled", havingValue = "true")
public class CmsLimpiezaDescartadosSchedulingConfig { }

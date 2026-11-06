package monolithe.auth_service.config;

import monolithe.auth_service.service.AppsScriptJavaMailSender;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import tools.jackson.databind.json.JsonMapper;

/**
 * Cuando se configura Apps Script, todos los correos de Auth viajan por HTTPS.
 * Sin el endpoint se conserva SMTP para entornos que sí lo permiten.
 */
@Configuration(proxyBeanMethods = false)
public class AppsScriptMailConfiguration {
    @Bean
    @ConditionalOnProperty(name = "APPS_SCRIPT_MAIL_URL")
    JavaMailSender appsScriptJavaMailSender(
            JsonMapper jsonMapper,
            @Value("${APPS_SCRIPT_MAIL_URL}") String url,
            @Value("${APPS_SCRIPT_MAIL_SECRET:}") String secret) {
        return new AppsScriptJavaMailSender(jsonMapper, url, secret);
    }
}

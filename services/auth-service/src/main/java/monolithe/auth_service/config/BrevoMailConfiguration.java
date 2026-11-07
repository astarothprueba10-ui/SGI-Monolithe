package monolithe.auth_service.config;

import monolithe.auth_service.service.BrevoJavaMailSender;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * Con BREVO_API_KEY, toda la aplicación usa HTTPS/443.
 * Sin ella, se conserva el SMTP existente para desarrollo local.
 */
@Configuration(proxyBeanMethods = false)
public class BrevoMailConfiguration {

    @Bean
    @ConditionalOnProperty(name = "BREVO_API_KEY")
    JavaMailSender brevoJavaMailSender(@Value("${BREVO_API_KEY}") String apiKey) {
        return new BrevoJavaMailSender(apiKey);
    }
}

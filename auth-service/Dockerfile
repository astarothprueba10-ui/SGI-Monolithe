# Build Stage
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

COPY pom.xml .
RUN mvn dependency:go-offline -B || true

COPY src ./src
RUN mvn clean package -DskipTests -B

# Runtime Stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /build/target/*.jar app.jar
COPY keys ./keys

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8081

ENV SERVER_PORT=8081 \
    JWT_PRIVATE_KEY_PATH=/app/keys/private_key.pem \
    JWT_PUBLIC_KEY_PATH=/app/keys/public_key.pem

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

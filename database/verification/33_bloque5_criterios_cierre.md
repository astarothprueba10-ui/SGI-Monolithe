# Cierre técnico pendiente — Bloque 5

Rama: `feature/adpr-crm-separaciones-ventas-integracion`. Fecha de auditoría: 2026-11-05.

## Aplicado en Supabase
- 4 tablas principales (separaciones, ventas, contratos y titulares): acceso directo `anon` y `authenticated` revocado.
- 23 tablas comerciales: privilegios `TRUNCATE`, `REFERENCES` y `TRIGGER` revocados de roles públicos.
- Función `sp_crm_listar_operaciones_v1` creada y probada: Gerencia (actor 5) obtuvo 7 operaciones; Administrador (actor 16), 7; Asesor activo (actor 19), 2.
- No se modificó ninguna venta, separación o pago.

## Código incluido en este paquete
- Listado de ventas trasladado desde SQL embebido en Java a la función almacenada.
- Eliminados métodos de RPC antiguos y usuarios/asesores predeterminados del frontend.
- Añadidos siete tests unitarios Java.
- GitHub Actions preparado para probar `core-service` y reglas de CRM en ramas feature/fix.

## Requisitos antes de marcar 100 %
1. Ejecutar compilación Java y pruebas Java/Node después de aplicar el paquete.
2. Probar respuestas HTTP 401/403 con cuentas de ensayo y operaciones de cartera ajena.
3. Probar en entorno de ensayo separación, voucher, conciliación, venta, firma, cancelación y concurrencia.
4. Resolver o clasificar formalmente las cuatro observaciones históricas del informe del Bloque 1.
5. Subir los cambios verificados a GitHub, sin incluir archivos secretos.

No se consideran pruebas completas hasta registrar sus resultados reales.

# Validaciones de Inicio y Contacto en Monolithe Web

## Comportamiento

| Formulario | Campo | Regla |
| --- | --- | --- |
| Inicio | Nombre | Letras con tildes, ñ y espacios. |
| Inicio | Teléfono | Solo dígitos, máximo nueve y primer dígito 9. Para enviar exige nueve. |
| Contacto | Nombres y apellidos | Letras con tildes, ñ y espacios. |
| Contacto | DNI | Opcional; si se completa exige exactamente ocho dígitos. Conserva los ceros iniciales. |
| Contacto | Teléfono | Solo dígitos, máximo nueve y primer dígito 9. Para enviar exige nueve. |

Las reglas se aplican al escribir, pegar y antes de enviar. Al pegar números con espacios, se limpia el texto completo antes de limitar su longitud. Si un celular comienza con otro dígito, se conserva el valor anterior. Los campos muestran las instrucciones y señalan los datos incompletos al enviar.

La validación compartida está en `apps/pagina-web/src/lib/publicContactPolicy.ts`. También se aplica a los formularios de información de proyectos que reutilizan `LeadForm`.

## Pruebas

Pruebas unitarias y compilación:

```powershell
npm --prefix apps/pagina-web ci
npm --prefix apps/pagina-web run test:contact
npm --prefix apps/pagina-web run build
```

La prueba de navegador se integra con la suite del paquete de adaptación móvil. Para ejecutarla en Chromium:

```powershell
npm --prefix tests/responsive ci
npm --prefix tests/responsive run install:browser
npm --prefix tests/responsive test -- --config=publicContact.config.ts
```

Cubre escritura, pegado, prefijos, límites, DNI opcional, ceros iniciales y bloqueo de solicitudes con datos incompletos. Las respuestas de la API son simuladas; no se registran consultas reales. Los anchos son 320, 390, 640, 768, 1024 y 1365 píxeles.

## Resultado de la revisión del 5 de noviembre de 2026

- 20 pruebas unitarias aprobadas.
- 36 pruebas de navegador aprobadas en seis anchos de pantalla.
- Verificación de que los datos incompletos no generan solicitudes a la API.
- Compilación de TypeScript y Vite correcta.

## Aplicación

El parche contiene las nuevas validaciones y sus pruebas. Se preparó con los formularios de `main` en `a59c46069c3058e6842bd76901de6b326ffd9480` y se comprobó junto con la adaptación móvil entregada previamente.

Desde la raíz del proyecto, reconstruir la página pública:

```powershell
docker compose up -d --build pagina-web-frontend
```

Recargar la página. No requiere consultas SQL ni cambios de configuración.

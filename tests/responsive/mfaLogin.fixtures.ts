import { expect, type Page, type Route } from '@playwright/test';

/** Portales que comparten el servicio de autenticación. */
export const portals = [
  { name: 'Backoffice', port: 6181, portal: 'BACKOFFICE', role: 'ROLE_ADMINISTRADOR', next: '/' },
  { name: 'Portal Cliente', port: 6183, portal: 'CLIENTE', role: 'ROLE_CLIENTE', next: '/portal' }
] as const;

/** Credenciales de prueba de la respuesta de vinculación. */
export const enrollment = {
  reto: 'B'.repeat(43), venceEn: 300,
  qr: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+WmfoAAAAASUVORK5CYII=',
  claveManual: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
  codigoRecuperacion: '01234567-abcdef01-23456789-abcd0123'
};

type Portal = typeof portals[number];
type AuthStep = 'ACTIVACION' | 'CODIGO';
type Overrides = { phase?: AuthStep; old?: boolean; expired?: boolean; temporary?: boolean; invitationFailure?: boolean };

function session(portal: Portal, temporary: boolean) {
  return { idUsuario: 14, usuario: 'persona', nombreMostrar: 'Persona de prueba', iniciales: 'PP',
    autoridades: [portal.role], requiereCambioPassword: temporary, accessToken: 'prueba-access', refreshToken: 'prueba-refresh' };
}

async function verify(route: Route, portal: Portal, options: Overrides) {
  if (options.expired) return route.fulfill({ status: 401, json: { message: 'La verificación expiró.' } });
  const { codigo } = route.request().postDataJSON();
  if (codigo !== '654321') return route.fulfill({ status: 422, json: { message: 'Código incorrecto o ya usado.' } });
  return route.fulfill({ json: session(portal, options.temporary ?? false) });
}

/** Simula las respuestas del servidor y abre el login sin una sesión previa. */
export async function openLogin(page: Page, portal: Portal, options: Overrides = {}) {
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  await page.context().route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (/\/(?:api|supabase)\//.test(url.pathname) && !url.pathname.startsWith('/api/auth/')) {
      return route.fulfill({ status: 503, json: { message: 'Sin datos de prueba' } });
    }
    if (!url.pathname.startsWith('/api/auth/')) return route.continue();
    requests.push({ path: url.pathname, body: route.request().postDataJSON() });
    if (url.pathname.endsWith('/login')) return options.old ? route.fulfill({ json: session(portal, false) })
      : route.fulfill({ status: 202, json: { reto: 'A'.repeat(43), paso: options.phase ?? 'CODIGO', venceEn: 300 } });
    if (url.pathname.endsWith('/mfa/activacion/enviar')) return options.invitationFailure
      ? route.fulfill({ status: 503, json: { message: 'Correo no disponible temporalmente.' } })
      : route.fulfill({ json: { mensaje: 'Invitación enviada al correo principal verificado.', segundosEspera: 60 } });
    if (url.pathname.endsWith('/preparar')) return route.fulfill({ json: enrollment });
    if (url.pathname.endsWith('/verificar')) return verify(route, portal, options);
    return route.fulfill({ status: 204 });
  });
  await page.goto(`http://127.0.0.1:${portal.port}/login`);
  return requests;
}

/** Completa únicamente el primer factor del formulario. */
export async function submitPassword(page: Page) {
  await page.locator('#usuario').fill('00000001');
  await page.locator('#password').fill('contrasena-sintetica');
  await page.getByRole('button', { name: /^Iniciar sesi[oó]n$/i }).click();
}

/** Comprueba que todavía no hay JWT ni credenciales de renovación. */
export async function assertNoSession(page: Page) {
  const data = await page.evaluate(() => [localStorage, sessionStorage].flatMap(store =>
    ['monolithe_access_token', 'monolithe_refresh_token', 'monolithe_user'].map(key => store.getItem(key))));
  expect(data).toEqual(Array(6).fill(null));
}

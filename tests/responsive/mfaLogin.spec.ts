import { expect, test } from '@playwright/test';
import { assertPageWidth } from './assertions';
import { assertNoSession, enrollment, openLogin, portals, submitPassword } from './mfaLogin.fixtures';

for (const portal of portals) {
  test.describe(portal.name, () => {
    test('no inicia sesión con la contraseña ni con un código erróneo', async ({ page }) => {
      const requests = await openLogin(page, portal);
      await submitPassword(page);
      const code = page.getByLabel('Código del autenticador', { exact: true });
      await expect(code).toBeVisible();
      expect(requests[0].body.portal).toBe(portal.portal);
      await assertNoSession(page);
      await code.fill('abc'); await expect(code).toHaveValue('');
      await code.fill('123456'); await page.getByRole('button', { name: 'Verificar e ingresar' }).click();
      await expect(page.getByRole('alert')).toContainText('Código incorrecto o ya usado.');
      await assertNoSession(page);
      await code.fill('654321'); await page.getByRole('button', { name: 'Verificar e ingresar' }).click();
      await expect(page).toHaveURL(new RegExp(`:${portal.port}${portal.next}$`));
      expect(await page.evaluate(() => localStorage.getItem('monolithe_access_token'))).toBe('prueba-access');
    });

    test('solicita invitación MFA por correo sin recibir secretos ni abrir sesión', async ({ page }) => {
      const requests = await openLogin(page, portal, { phase: 'ACTIVACION' });
      await submitPassword(page);
      await expect(page.getByRole('button', { name: 'Enviar código a mi correo' })).toBeVisible();
      await page.getByRole('button', { name: 'Enviar código a mi correo' }).click();
      await expect(page.getByRole('status')).toContainText('Invitación enviada al correo principal verificado.');
      const invited = requests.find(request => request.path.endsWith('/mfa/activacion/enviar'));
      expect(invited?.body).toEqual({ reto: 'A'.repeat(43) });
      await expect(page.getByLabel('Código de activación')).toHaveValue('');
      await assertNoSession(page);
      await assertPageWidth(page);
    });

    test('explica los problemas de correo sin saltarse MFA', async ({ page }) => {
      await openLogin(page, portal, { phase: 'ACTIVACION', invitationFailure: true });
      await submitPassword(page);
      await page.getByRole('button', { name: 'Enviar código a mi correo' }).click();
      await expect(page.getByRole('alert')).toContainText('Correo no disponible temporalmente.');
      await assertNoSession(page);
      await expect(page.getByLabel('Código de activación')).toHaveValue('');
    });

    test('vincula el primer autenticador con QR y confirma el código de recuperación guardado', async ({ page }) => {
      const requests = await openLogin(page, portal, { phase: 'ACTIVACION', temporary: true });
      await submitPassword(page);
      await page.getByLabel('Código de activación', { exact: true }).fill('prueba-activacion');
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await expect(page.getByRole('img', { name: /Código QR para configurar/ })).toBeVisible();
      await assertNoSession(page);
      await assertPageWidth(page);
      await page.getByLabel('Código del autenticador', { exact: true }).fill('654321');
      const verify = page.getByRole('button', { name: 'Verificar e ingresar' });
      await expect(verify).toBeDisabled();
      await page.getByLabel('Guardé mi código de recuperación').check();
      await verify.click();
      await expect(page).toHaveURL(/\/cambiar-contrasena$/);
      expect(requests.find(request => request.path.endsWith('/verificar'))?.body.reto).toBe(enrollment.reto);
    });

    test('la recuperación solo abre la vinculación y volver al login limpia los datos', async ({ page }) => {
      await openLogin(page, portal);
      await submitPassword(page);
      await page.getByRole('button', { name: 'Usar código de recuperación' }).click();
      await page.getByLabel('Código de recuperación', { exact: true }).fill(enrollment.codigoRecuperacion);
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Vincula tu aplicación autenticadora' })).toBeVisible();
      await assertNoSession(page);
      await page.getByRole('button', { name: 'Volver al inicio' }).click();
      await expect(page.locator('#password')).toHaveValue('');
      await expect(page.getByText(enrollment.codigoRecuperacion, { exact: true })).toHaveCount(0);
    });

    test('un reto vencido vuelve al formulario de contraseña', async ({ page }) => {
      await openLogin(page, portal, { expired: true });
      await submitPassword(page);
      await page.getByLabel('Código del autenticador', { exact: true }).fill('654321');
      await page.getByRole('button', { name: 'Verificar e ingresar' }).click();
      await expect(page.locator('#password')).toHaveValue('');
      await expect(page.getByRole('alert')).toContainText('La verificación expiró.');
      await assertNoSession(page);
    });

    test('un servidor antiguo no permite continuar solo con contraseña', async ({ page }) => {
      await openLogin(page, portal, { old: true });
      await submitPassword(page);
      await expect(page.getByRole('alert')).toContainText('El servicio de autenticación debe actualizarse');
      await assertNoSession(page);
    });
  });
}

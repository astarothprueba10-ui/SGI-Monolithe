import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { origins, prepareContext } from './fixtures';
import { assertPageWidth } from './assertions';

type Submission = { nombre: string; telefono: string; correo: string; mensaje: string };

async function openForm(context: BrowserContext, page: Page, pathname: string) {
  await prepareContext(context, 'pagina-web');
  const submitted: Submission[] = [];
  await page.route('**/api/public/consultas', async route => {
    submitted.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
      idConsulta: 1, codigo: 'CW-TEST-001', nombre: submitted[submitted.length - 1].nombre,
      fechaRecepcion: '2026-11-05T15:00:00Z', mensaje: 'Consulta de prueba recibida'
    }) });
  });
  await page.goto(origins['pagina-web'] + pathname);
  return submitted;
}

async function paste(input: Locator, text: string) {
  await input.evaluate((element, value) => {
    const field = element as HTMLInputElement;
    field.focus(); field.setSelectionRange(0, field.value.length);
    const clipboard = new DataTransfer(); clipboard.setData('text/plain', value);
    field.dispatchEvent(new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true }));
  }, text);
}

async function fillQuick(page: Page) {
  await page.locator('#lead-name').fill('María José');
  await page.locator('#lead-phone').fill('987654321');
  await page.locator('#lead-email').fill('maria+web@utp.edu.pe');
  await page.locator('#lead-project').selectOption('otro');
}

async function fillContact(page: Page) {
  await page.locator('#nombres').fill('María José');
  await page.locator('#apellidos').fill('Muñoz Peña');
  await page.locator('#telefono').fill('987654321');
  await page.locator('#correo').fill('maria+web@utp.edu.pe');
  await page.locator('#proyecto').selectOption('otro');
  await page.locator('#motivo').selectOption({ index: 1 });
  await page.getByRole('checkbox').check();
}

test('Inicio: solo letras, celular con nueve inicial y límite al escribir y pegar', async ({ context, page }) => {
  await openForm(context, page, '/');
  await page.locator('#lead-name').fill('María123 @Peña!');
  await expect(page.locator('#lead-name')).toHaveValue('María Peña');
  await page.locator('#lead-phone').fill('8');
  await expect(page.locator('#lead-phone')).toHaveValue('');
  await paste(page.locator('#lead-phone'), '9abc876 543 21000');
  await expect(page.locator('#lead-phone')).toHaveValue('987654321');
  await paste(page.locator('#lead-phone'), '887654321');
  await expect(page.locator('#lead-phone')).toHaveValue('987654321');
  await expect(page.locator('#lead-phone')).toHaveAttribute('maxlength', '9');
  await expect(page.locator('#lead-phone')).toHaveAttribute('inputmode', 'numeric');
  await assertPageWidth(page);
});

test('Inicio: bloquea el teléfono incompleto y envía únicamente el dato válido', async ({ context, page }) => {
  const submitted = await openForm(context, page, '/'); await fillQuick(page);
  await page.locator('#lead-phone').fill('98765432');
  await page.getByRole('button', { name: 'Quiero recibir información', exact: true }).click();
  await expect(page.locator('#lead-phone')).toHaveAttribute('aria-invalid', 'true');
  expect(submitted).toHaveLength(0);
  await page.locator('#lead-phone').fill('987654321');
  await page.getByRole('button', { name: 'Quiero recibir información', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¡Gracias, María!' })).toBeVisible();
  expect(submitted).toHaveLength(1);
  expect(submitted[0]).toMatchObject({ nombre: 'María José', telefono: '987654321', correo: 'maria+web@utp.edu.pe' });
});

test('Contacto: nombres y apellidos solo con letras y DNI solo con ocho dígitos', async ({ context, page }) => {
  await openForm(context, page, '/contacto');
  await page.locator('#nombres').fill('María123'); await page.locator('#apellidos').fill('Muñoz456 @Peña');
  await expect(page.locator('#nombres')).toHaveValue('María'); await expect(page.locator('#apellidos')).toHaveValue('Muñoz Peña');
  await paste(page.locator('#dni'), '0a123 456789');
  await expect(page.locator('#dni')).toHaveValue('01234567');
  await page.locator('#telefono').fill('8'); await expect(page.locator('#telefono')).toHaveValue('');
  await paste(page.locator('#telefono'), '987 654 321'); await expect(page.locator('#telefono')).toHaveValue('987654321');
  await expect(page.locator('#dni')).toHaveAttribute('maxlength', '8');
  await expect(page.getByText('No pudimos enviar tu solicitud', { exact: true })).not.toBeVisible();
  await assertPageWidth(page);
});

test('Contacto: DNI y celular incompletos impiden enviar la consulta', async ({ context, page }) => {
  const submitted = await openForm(context, page, '/contacto'); await fillContact(page);
  await page.locator('#dni').fill('1234567'); await page.locator('#telefono').fill('98765432');
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click();
  await expect(page.locator('#dni')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#telefono')).toHaveAttribute('aria-invalid', 'true'); expect(submitted).toHaveLength(0);
  await page.locator('#telefono').fill('987654321');
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click(); expect(submitted).toHaveLength(0);
  await page.locator('#dni').fill('01234567');
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click();
  await expect(page.getByText('CW-TEST-001', { exact: true })).toBeVisible();
  expect(submitted).toHaveLength(1); expect(submitted[0].mensaje).toContain('DNI: 01234567');
});

test('Contacto: el DNI sigue siendo opcional y conserva las reglas del resto del formulario', async ({ context, page }) => {
  const submitted = await openForm(context, page, '/contacto'); await fillContact(page);
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click();
  await expect(page.getByText('CW-TEST-001', { exact: true })).toBeVisible();
  expect(submitted).toHaveLength(1); expect(submitted[0].mensaje).toContain('DNI: N/A');
  expect(submitted[0]).toMatchObject({ nombre: 'María José Muñoz Peña', telefono: '987654321' });
});

test('Contacto: no permite enviar nombres vacíos después de filtrar números', async ({ context, page }) => {
  const submitted = await openForm(context, page, '/contacto'); await fillContact(page);
  await page.locator('#nombres').fill('1234'); await page.locator('#apellidos').fill('5678');
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click();
  await expect(page.locator('#nombres')).toHaveValue(''); await expect(page.locator('#apellidos')).toHaveValue('');
  await expect(page.locator('#nombres')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#apellidos')).toHaveAttribute('aria-invalid', 'true'); expect(submitted).toHaveLength(0);
});

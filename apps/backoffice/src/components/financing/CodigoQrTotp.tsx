import { useMemo } from 'react';
import qrcode from '../../vendor/qrcode-generator';

/**
 * QR de aprovisionamiento TOTP, construido EN EL NAVEGADOR a partir del otpauthUri
 * del backend. Nunca enviar el secreto a un servidor externo ni incluirlo en URLs HTTP.
 */
export function CodigoQrTotp({ otpauthUri }: { otpauthUri: string }) {
  const matrix = useMemo(() => {
    // Aceptar exclusivamente URIs TOTP emitidos por Auth Service.
    try {
      const uri = new URL(otpauthUri);
      if (uri.protocol !== 'otpauth:' || uri.hostname !== 'totp' ||
          !/^[A-Z2-7]{32}$/.test(uri.searchParams.get('secret') ?? '') ||
          uri.searchParams.get('issuer') !== 'MONOLITHE') return null;
      const qr = qrcode(0, 'M');
      qr.addData(otpauthUri, 'Byte');
      qr.make();
      const quietZone = 4;
      const size = qr.getModuleCount();
      const path: string[] = [];
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          if (qr.isDark(row, col)) {
            path.push(`M${col + quietZone} ${row + quietZone}h1v1h-1z`);
          }
        }
      }
      return { side: size + 2 * quietZone, path: path.join('') };
    } catch {
      return null;
    }
  }, [otpauthUri]);

  if (!matrix) {
    return <p className="text-xs text-red-700" role="alert">
      No se pudo generar el QR. Utilice la clave de configuración manual.
    </p>;
  }

  return <div className="inline-flex flex-col items-center gap-2">
    <svg aria-label="Código QR para configurar el autenticador de MONOLITHE"
      role="img" viewBox={`0 0 ${matrix.side} ${matrix.side}`}
      width="240" height="240"
      className="h-56 w-56 rounded-lg border border-brand-100 bg-white p-1 sm:h-60 sm:w-60">
      <rect width={matrix.side} height={matrix.side} fill="white" />
      <path fill="#111827" d={matrix.path} />
    </svg>
    <p className="text-center text-xs text-brand-600">
      Escanee este QR con Google Authenticator o Microsoft Authenticator.
    </p>
  </div>;
}

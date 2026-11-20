/**
 * API mínima de QR Code Generator (Kazuhiko Arase, MIT).
 * Declaraciones locales para el motor empaquetado con Backoffice.
 */
export interface QrCodeMatrix {
  addData(value: string, mode?: 'Byte' | 'Alphanumeric' | 'Numeric'): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, column: number): boolean;
}
export default function qrcode(typeNumber: number, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'): QrCodeMatrix;

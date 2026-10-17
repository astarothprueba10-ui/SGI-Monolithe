export function enlaceConsultaWhatsapp(telefono: string, referencia: string): string {
  const numero = telefono.replace(/[^0-9]/g, '');
  const mensaje = `Hola, envié una solicitud a MONOLITHE. Mi referencia es ${referencia}. Quisiera continuar la atención.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

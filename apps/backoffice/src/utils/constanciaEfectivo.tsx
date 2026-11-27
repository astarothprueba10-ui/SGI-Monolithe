// Registro interno de la declaración, no evidencia bancaria ni recibo de caja confirmado.
export async function crearConstanciaEfectivo(prospecto:number,principal:number,centavos:number,lotes:number[]):Promise<File>{
  if(!Number.isSafeInteger(centavos)||centavos<=0||!Number.isSafeInteger(prospecto)||prospecto<=0||!lotes.includes(principal))throw new Error('Datos de efectivo inválidos.');
  const {Document,Page,Text,View,pdf}=await import('@react-pdf/renderer');
  const referencia=crypto.randomUUID();
  const fecha=new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'medium',timeZone:'America/Lima'}).format(new Date());
  const blob=await pdf(<Document title="Declaración interna de efectivo - pendiente">
    <Page size="A4" style={{padding:42,fontSize:12,color:'#14283e'}}>
      <Text style={{fontSize:19,marginBottom:16}}>SIGI MONOLITHE</Text>
      <Text style={{fontSize:16,marginBottom:12}}>Declaración interna de abono en efectivo</Text>
      <View style={{backgroundColor:'#f1f5f9',padding:14,marginBottom:16}}>
        <Text>Estado: PENDIENTE DE VERIFICACIÓN POR FINANZAS</Text>
        <Text style={{marginTop:8}}>No es un comprobante bancario, recibo de caja ni acredita la recepción del dinero.</Text>
      </View>
      <Text>Importe declarado: S/ {(centavos/100).toFixed(2)}</Text>
      <Text>Prospecto: {prospecto}</Text>
      <Text>Lote principal: {principal}</Text>
      <Text>Lotes de la operación: {lotes.join(', ')}</Text>
      <Text>Fecha de declaración (Lima): {fecha}</Text>
      <Text>Referencia interna: {referencia}</Text>
      <Text style={{marginTop:20}}>Documento generado al registrar una declaración de efectivo. Finanzas debe verificar el ingreso real en caja antes de acreditar el abono.</Text>
    </Page>
  </Document>).toBlob();
  return new File([blob],`DECLARACION-EFECTIVO-PENDIENTE-${referencia}.pdf`,{type:'application/pdf'});
}

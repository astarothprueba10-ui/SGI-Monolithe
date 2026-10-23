import {
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from '@react-pdf/renderer';
import type {
  CatalogosTrabajadorResponse,
  InformacionLaboralTrabajador,
  InformacionPersonalTrabajador,
  TrabajadorResponse
} from '../../types/workers';

export interface WorkerFichaPDFProps {
  worker: TrabajadorResponse;
  catalogs?: CatalogosTrabajadorResponse | null;
  emissionDate: string;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0f172a',
    backgroundColor: '#ffffff'
  },
  headerContainer: {
    marginBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f2744',
    paddingBottom: 8
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6
  },
  companyTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  docTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f2744',
    letterSpacing: 0.5
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryCol: {
    flex: 1
  },
  summaryLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  summaryName: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#0f2744',
    marginTop: 2
  },
  summaryMetaCol: {
    alignItems: 'flex-end'
  },
  summaryMeta: {
    fontSize: 8,
    color: '#334155',
    marginTop: 1
  },
  section: {
    marginBottom: 11
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f2744',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 2.5,
    marginBottom: 5
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4.5
  },
  fieldCol: {
    width: '48%'
  },
  fieldFull: {
    width: '100%'
  },
  fieldLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1
  },
  fieldValue: {
    fontSize: 8.5,
    color: '#1e293b'
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerText: {
    fontSize: 7.5,
    color: '#64748b'
  }
});

function formatPdfDate(value: string | null | undefined): string {
  if (!value) return 'No registrado';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No registrado';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatPdfText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'No registrado';
}

function formatFullName(personal: InformacionPersonalTrabajador): string {
  const parts = [personal.nombres, personal.apellidoPaterno, personal.apellidoMaterno];
  const full = parts.filter(Boolean).map((part) => part?.trim()).join(' ');
  return formatPdfText(full);
}

function formatFullAddress(personal: InformacionPersonalTrabajador): string {
  const ubigeo = [personal.distrito, personal.provincia, personal.departamento].filter(Boolean).join(', ');
  const ref = personal.referencia ? `(Ref: ${personal.referencia})` : null;
  const parts = [personal.direccion, ref, ubigeo].filter(Boolean);
  return parts.length > 0 ? parts.join(' - ') : 'No registrado';
}

function resolveDocumentTypeName(
  idTipoDocumento: number | null | undefined,
  catalogs?: CatalogosTrabajadorResponse | null
): string {
  if (!idTipoDocumento || !catalogs?.tiposDocumento) return 'No registrado';
  const found = catalogs.tiposDocumento.find((t) => t.idTipoDocumento === idTipoDocumento);
  return formatPdfText(found?.nombre);
}

function resolveVerificationLabel(value: boolean | null | undefined): string | null {
  if (value === true) return 'Verificado';
  if (value === false) return 'Pendiente de verificación';
  return null;
}

function PdfField({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <View style={fullWidth ? styles.fieldFull : styles.fieldCol}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function PdfHeaderSummary({ fullName, codigo, estado }: { fullName: string; codigo: string; estado: string }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryCol}>
        <Text style={styles.summaryLabel}>TRABAJADOR</Text>
        <Text style={styles.summaryName}>{fullName}</Text>
      </View>
      <View style={styles.summaryMetaCol}>
        <Text style={styles.summaryMeta}>Código: {codigo || 'No registrado'}</Text>
        <Text style={styles.summaryMeta}>Estado: {estado || 'No registrado'}</Text>
      </View>
    </View>
  );
}

function PdfHeader({
  worker,
  personal,
  labor
}: {
  worker: TrabajadorResponse;
  personal: InformacionPersonalTrabajador;
  labor: InformacionLaboralTrabajador;
}) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerTop}>
        <Text style={styles.companyTitle}>MONOLITHE — Sistema de Gestión Integral</Text>
        <Text style={styles.docTitle}>FICHA DEL TRABAJADOR</Text>
      </View>
      <PdfHeaderSummary
        fullName={formatFullName(personal)}
        codigo={worker.codigo}
        estado={labor.estadoTrabajador}
      />
    </View>
  );
}

function PdfDocumentSection({
  personal,
  catalogs
}: {
  personal: InformacionPersonalTrabajador;
  catalogs?: CatalogosTrabajadorResponse | null;
}) {
  const docType = resolveDocumentTypeName(personal.idTipoDocumento, catalogs);
  const docVerif = resolveVerificationLabel(personal.documentoVerificado);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Documento</Text>
      <View style={styles.row}>
        <PdfField label="Tipo de documento" value={docType} />
        <PdfField label="Número de documento" value={formatPdfText(personal.numeroDocumento)} />
      </View>
      {docVerif ? (
        <View style={styles.row}>
          <PdfField label="Verificación documental" value={docVerif} />
        </View>
      ) : null}
    </View>
  );
}

function PdfPersonalSection({ personal }: { personal: InformacionPersonalTrabajador }) {
  const apellidos = [personal.apellidoPaterno, personal.apellidoMaterno].filter(Boolean).join(' ');
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Información Personal</Text>
      <View style={styles.row}>
        <PdfField label="Nombres" value={formatPdfText(personal.nombres)} />
        <PdfField label="Apellidos" value={formatPdfText(apellidos)} />
      </View>
      <View style={styles.row}>
        <PdfField label="Fecha de nacimiento" value={formatPdfDate(personal.fechaNacimiento)} />
        <PdfField label="Teléfono" value={formatPdfText(personal.telefono)} />
      </View>
      <View style={styles.row}>
        <PdfField label="Correo electrónico" value={formatPdfText(personal.correoElectronico)} />
      </View>
      <View style={styles.row}>
        <PdfField label="Dirección completa" value={formatFullAddress(personal)} fullWidth />
      </View>
    </View>
  );
}

function PdfLaborSection({
  worker,
  labor
}: {
  worker: TrabajadorResponse;
  labor: InformacionLaboralTrabajador;
}) {
  const fechaCese = labor.fechaCese ? formatPdfDate(labor.fechaCese) : null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Información Laboral</Text>
      <View style={styles.row}>
        <PdfField label="Área" value={formatPdfText(labor.area)} />
        <PdfField label="Cargo" value={formatPdfText(labor.cargo)} />
      </View>
      <View style={styles.row}>
        <PdfField label="Vínculo laboral" value={formatPdfText(labor.tipoVinculoLaboral)} />
        <PdfField label="Horario" value={formatPdfText(labor.horario)} />
      </View>
      <View style={styles.row}>
        <PdfField label="Fecha de creación" value={formatPdfDate(worker.fechaCreacion)} />
        <PdfField label="Fecha de ingreso" value={formatPdfDate(labor.fechaIngreso)} />
      </View>
      {fechaCese ? (
        <View style={styles.row}>
          <PdfField label="Fecha de cese" value={fechaCese} />
        </View>
      ) : null}
      <View style={styles.row}>
        <PdfField label="Observaciones" value={formatPdfText(labor.observaciones)} fullWidth />
      </View>
    </View>
  );
}

function PdfFooter({ emissionDate }: { emissionDate: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Información confidencial — Uso interno  |  Emisión: {emissionDate}
      </Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}

export function WorkerFichaPDF({
  worker,
  catalogs,
  emissionDate
}: WorkerFichaPDFProps) {
  const personal = worker.informacionPersonal;
  const labor = worker.informacionLaboral;
  return (
    <Document title={`Ficha_${worker.codigo}`} author="MONOLITHE">
      <Page size="A4" style={styles.page}>
        <PdfHeader worker={worker} personal={personal} labor={labor} />
        <PdfDocumentSection personal={personal} catalogs={catalogs} />
        <PdfPersonalSection personal={personal} />
        <PdfLaborSection worker={worker} labor={labor} />
        <PdfFooter emissionDate={emissionDate} />
      </Page>
    </Document>
  );
}


export type TipoDocumentoLead =
    | ''
    | 'DNI'
    | 'RUC'
    | 'CE'
    | 'PASAPORTE';

export interface LeadFormValues {
    names: string;
    paternalSurname: string;
    maternalSurname: string;
    phone: string;
    email: string;
    idProyecto: number | '';
    origenCodigo: string;
    motivoContacto: string;
    mensaje: string;
    idAsesor: number | '';
    tipoDocumento: string;
    numeroDocumento: string;
    direccion: string;
}

export type LeadField = keyof LeadFormValues;
export type LeadErrors = Partial<Record<LeadField, string>>;

const LETRAS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';

const NOMBRE_REGEX = new RegExp(
    `^[${LETRAS}]+(?:[ -][${LETRAS}]+)*$`,
    'u'
);

const EMAIL_REGEX =
    /^[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}$/i;

const PHONE_REGEX =
    /^(?:[0-9]{7,15}|\+[1-9][0-9]{6,14})$/;

export function sanitizarLead(
    campo: LeadField,
    valor: string,
    tipoDocumento = ''
): string {
    if (
        campo === 'names' ||
        campo === 'paternalSurname' ||
        campo === 'maternalSurname'
    ) {
        return valor
            .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ -]/gu, '')
            .replace(/ {2,}/g, ' ');
    }

    if (campo === 'phone') {
        const internacional = valor.startsWith('+');
        const numeros = valor.replace(/\D/g, '').slice(0, 15);
        return internacional ? `+${numeros}` : numeros;
    }

    if (campo === 'numeroDocumento') {
        const documento = valor.toUpperCase();

        if (tipoDocumento === 'PASAPORTE') {
            return documento.replace(/[^A-Z0-9]/g, '').slice(0, 20);
        }

        const limite =
            tipoDocumento === 'DNI' ? 8 :
                tipoDocumento === 'RUC' ? 11 :
                    tipoDocumento === 'CE' ? 12 : 30;

        return documento.replace(/\D/g, '').slice(0, limite);
    }

    return valor;
}

export function validarNuevoLead(
    form: LeadFormValues
): LeadErrors {
    const errores: LeadErrors = {};

    const validarNombre = (
        campo: 'names' | 'paternalSurname' | 'maternalSurname',
        etiqueta: string,
        requerido: boolean,
        maximo: number
    ) => {
        const valor = form[campo].trim();

        if (!valor) {
            if (requerido) {
                errores[campo] = `${etiqueta} es obligatorio.`;
            }
            return;
        }

        if (
            valor.length < 2 ||
            valor.length > maximo ||
            !NOMBRE_REGEX.test(valor)
        ) {
            errores[campo] =
                `${etiqueta}: utiliza solo letras, espacios y guiones.`;
        }
    };

    validarNombre('names', 'Nombres', true, 120);
    validarNombre('paternalSurname', 'Apellido paterno', true, 80);
    validarNombre('maternalSurname', 'Apellido materno', false, 80);

    const nombreCompleto = [
        form.names,
        form.paternalSurname,
        form.maternalSurname
    ].filter(Boolean).join(' ').trim();

    if (nombreCompleto.length > 150) {
        errores.names = 'El nombre completo supera los 150 caracteres.';
    }

    if (!PHONE_REGEX.test(form.phone.trim())) {
        errores.phone =
            'Ingresa de 7 a 15 dígitos. Usa + solo al inicio para números internacionales.';
    }

    if (
        !EMAIL_REGEX.test(form.email.trim()) ||
        form.email.trim().length > 180
    ) {
        errores.email =
            'El correo no cumple el formato persona@example.com';
    }

    if (!form.idProyecto) {
        errores.idProyecto = 'Selecciona un proyecto de interés.';
    }

    if (!form.origenCodigo.trim()) {
        errores.origenCodigo = 'Selecciona un canal de origen.';
    }

    const tipo = form.tipoDocumento;
    const numero = form.numeroDocumento.trim();

    if (!tipo) {
        errores.tipoDocumento = 'Selecciona un tipo de documento.';
    } else if (!numero) {
        errores.numeroDocumento = 'El número de documento es obligatorio.';
    } else {
        const reglas: Record<string, {
            patron: RegExp;
            mensaje: string;
        }> = {
            DNI: {
                patron: /^[0-9]{8}$/,
                mensaje: 'El DNI debe contener exactamente 8 dígitos.'
            },
            RUC: {
                patron: /^[0-9]{11}$/,
                mensaje: 'El RUC debe contener exactamente 11 dígitos.'
            },
            CE: {
                patron: /^[0-9]{9,12}$/,
                mensaje: 'El carné de extranjería debe contener entre 9 y 12 dígitos.'
            },
            PASAPORTE: {
                patron: /^[A-Z0-9]{6,20}$/,
                mensaje: 'El pasaporte debe contener entre 6 y 20 letras o números, sin símbolos.'
            }
        };

        const regla = reglas[tipo];

        if (!regla) {
            errores.tipoDocumento = 'Selecciona un tipo de documento válido.';
        } else if (!regla.patron.test(numero)) {
            errores.numeroDocumento = regla.mensaje;
        }
    }

    const motivo = form.motivoContacto.trim();

    if (!motivo || motivo.length > 150) {
        errores.motivoContacto =
            'El motivo de contacto es obligatorio (máximo 150 caracteres).';
    }

    if (form.mensaje.length > 4000) {
        errores.mensaje =
            'El mensaje no puede superar los 4000 caracteres.';
    }

    if (form.direccion.trim().length > 255) {
        errores.direccion =
            'La dirección no puede superar los 255 caracteres.';
    }

    return errores;
}

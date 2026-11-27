import JSZip from 'jszip';
import { SaxesParser } from 'saxes';

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const MAX_XML_BYTES = 24 * 1024 * 1024;
const MAX_ENTRIES = 500;

// JSZip 3.x expone este método documentado en runtime, pero JSZipObject no lo declara.
// Conservar la lectura incremental para limitar la expansión antes de procesar el XLSX.
interface FlujoZip {
  on(event: 'data', callback: (chunk: Uint8Array) => void): FlujoZip;
  on(event: 'error', callback: (error: Error) => void): FlujoZip;
  on(event: 'end', callback: () => void): FlujoZip;
  pause(): FlujoZip;
  resume(): FlujoZip;
}
interface EntradaZipIncremental {
  internalStream(type: 'uint8array'): FlujoZip;
}

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;').replace(/\t/g, '&#9;').replace(/\n/g, '&#10;').replace(/\r/g, '&#13;');

/** ExcelJS espera nombres de elementos sin prefijo y rutas relativas en las relaciones del libro. */
export function normalizarXmlProyecto(xml: string, ruta: string): string {
  const parser = new SaxesParser({ xmlns: true });
  const out: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
  const stack: { name: string; defaultNs: string }[] = [];
  let cambiado = false;
  parser.on('doctype', () => { throw new Error('No se admiten declaraciones DTD en XLSX.'); });
  parser.on('error', error => { throw error; });
  parser.on('opentag', tag => {
    const sinPrefijo = tag.uri === MAIN || tag.uri === REL;
    const name = sinPrefijo ? tag.local : tag.name;
    if (name !== tag.name) cambiado = true;
    const attrs = new Map(Object.values(tag.attributes).map(a => [a.name, a.value]));
    const inherited = stack[stack.length - 1]?.defaultNs ?? '';
    let defaultNs = attrs.get('xmlns') ?? inherited;
    if (!name.includes(':') && defaultNs !== tag.uri) {
      attrs.set('xmlns', tag.uri);
      defaultNs = tag.uri;
      cambiado = true;
    }
    if (tag.uri === REL && tag.local === 'Relationship' && attrs.get('TargetMode') !== 'External') {
      const target = attrs.get('Target');
      if (target?.startsWith('/xl/') && ruta === 'xl/_rels/workbook.xml.rels') {
        attrs.set('Target', target.slice(4));
        cambiado = true;
      } else if (target?.startsWith('/') && ruta === '_rels/.rels') {
        attrs.set('Target', target.slice(1));
        cambiado = true;
      }
    }
    out.push('<', name);
    for (const [key, value] of attrs) out.push(' ', key, '="', escapeAttr(value), '"');
    out.push('>');
    stack.push({ name, defaultNs });
  });
  parser.on('closetag', () => { out.push('</', stack.pop()!.name, '>'); });
  parser.on('text', s => out.push(escapeText(s)));
  parser.on('cdata', s => out.push(escapeText(s)));
  parser.write(xml).close();
  return cambiado ? out.join('') : xml;
}

/** Mantiene el archivo original intacto y solo reempaqueta variantes OOXML incompatibles. */
export async function normalizarXlsxProyecto(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(bytes);
  const entries = Object.values(zip.files).filter(e => !e.dir);
  if (entries.length > MAX_ENTRIES) throw new Error('El XLSX contiene demasiados componentes.');
  let total = 0;
  let cambiado = false;
  for (const entry of entries) {
    // Limitar la expansión del ZIP antes de que ExcelJS procese el libro.
    const data = await new Promise<Uint8Array>((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      let size = 0;
      const incremental = entry as unknown as Partial<EntradaZipIncremental>;
      if (typeof incremental.internalStream !== 'function') {
        reject(new Error('No se puede validar el tamaño descomprimido de este XLSX.'));
        return;
      }
      const stream = incremental.internalStream('uint8array');
      stream.on('data', (chunk: Uint8Array) => {
        total += chunk.length;
        size += chunk.length;
        if (total > MAX_XML_BYTES) {
          stream.pause();
          reject(new Error('El XLSX supera el límite de contenido descomprimido (24 MB).'));
          return;
        }
        chunks.push(chunk);
      }).on('error', reject).on('end', () => {
        const result = new Uint8Array(size);
        let pos = 0;
        for (const chunk of chunks) { result.set(chunk, pos); pos += chunk.length; }
        resolve(result);
      }).resume();
    });
    const path = entry.name;
    if (!/^(?:xl\/(?:workbook\.xml|styles\.xml|sharedStrings\.xml|worksheets\/[^/]+\.xml|_rels\/workbook\.xml\.rels)|_rels\/\.rels)$/.test(path)) continue;
    const xml = new TextDecoder('utf-8').decode(data);
    const normalized = normalizarXmlProyecto(xml, path);
    if (normalized !== xml) { zip.file(path, normalized); cambiado = true; }
  }
  return cambiado ? zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' }) : bytes;
}

// Text aus PDF und Word: Diese Tests halten fest, was pdf.js, mammoth und turndown heute liefern,
// damit ein Update dieser Pakete keine Änderung unbemerkt einschleppt.
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import { describe, expect, it } from 'vitest';
import { processFile, validateFile } from '../src/utils/fileProcessor.js';

// In der App kommt der Worker aus /vendor; unter Node direkt aus node_modules (die Tests laufen
// mit der legacy-Fassung von pdf.js, siehe test.alias in vite.config.js)
pdfjsLib.GlobalWorkerOptions.workerSrc = fileURLToPath(
    new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url),
);

/** Kleinste gültige PDF-Datei: eine Seite pro Eintrag, jede mit den angegebenen Zeilen. */
function makePdf(pages) {
    const objects = [];
    const add = body => objects.push(body) && objects.length;
    const catalog = add(null);
    const pagesObj = add(null);
    const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const kids = pages.map(lines => {
        const ops = lines.map((line, i) => `BT /F1 12 Tf 72 ${720 - i * 20} Td (${line}) Tj ET`).join('\n');
        const content = add(`<< /Length ${Buffer.byteLength(ops, 'latin1')} >>\nstream\n${ops}\nendstream`);
        return add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] `
            + `/Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`);
    });
    objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;

    let out = '%PDF-1.4\n';
    const offsets = objects.map((body, i) => {
        const offset = Buffer.byteLength(out, 'latin1');
        out += `${i + 1} 0 obj\n${body}\nendobj\n`;
        return offset;
    });
    const xref = Buffer.byteLength(out, 'latin1');
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    out += offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
    out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, 'latin1');
}

/** Kleinste gültige DOCX-Datei mit den angegebenen Absätzen ({ text, style?, bold? }). */
async function makeDocx(paragraphs) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const body = paragraphs.map(({ text, style, bold }) => '<w:p>'
        + (style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '')
        + `<w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`).join('');
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?>'
        + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
        + '</Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        + '</Relationships>');
    zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        + '</Relationships>');
    zip.file('word/styles.xml', '<?xml version="1.0" encoding="UTF-8"?>'
        + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        + '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>'
        + '</w:styles>');
    zip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8"?>'
        + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        + `<w:body>${body}</w:body></w:document>`);
    return zip.generateAsync({ type: 'uint8array' });
}

const file = (data, name, type = '') => new File([data], name, { type });

describe('Text aus Dateien', () => {
    it('liest TXT als UTF-8', async () => {
        const result = await processFile(file('Grüezi Frau Müller', 'brief.txt', 'text/plain'));
        expect(result).toEqual({ success: true, text: 'Grüezi Frau Müller', html: undefined });
    });

    it('fällt bei TXT auf Latin-1 zurück, wenn UTF-8 nicht passt', async () => {
        const result = await processFile(file(Buffer.from('Grüezi Frau Müller', 'latin1'), 'brief.txt'));
        expect(result.text).toBe('Grüezi Frau Müller');
    });

    it('liest PDF Seite für Seite', async () => {
        const pdf = makePdf([
            ['Urteil vom 3. Mai 2024', 'Max Muster wohnt in Luzern.'],
            ['Seite zwei: Anna Beispiel'],
        ]);
        const result = await processFile(file(pdf, 'urteil.pdf', 'application/pdf'));
        expect(result.success).toBe(true);
        expect(result.text).toBe('Urteil vom 3. Mai 2024 Max Muster wohnt in Luzern.\nSeite zwei: Anna Beispiel');
    });

    it('liest DOCX als reinen Text', async () => {
        const docx = await makeDocx([
            { text: 'Verfügung', style: 'Heading1' },
            { text: 'Max Muster, ' },
            { text: 'Pilatusstrasse 1, 6003 Luzern', bold: true },
        ]);
        const result = await processFile(file(docx, 'verfuegung.docx'));
        expect(result).toEqual({
            success: true,
            text: 'Verfügung\n\nMax Muster, \n\nPilatusstrasse 1, 6003 Luzern\n\n',
            html: undefined,
        });
    });

    it('wandelt DOCX auf Wunsch in Markdown um', async () => {
        const docx = await makeDocx([
            { text: 'Verfügung', style: 'Heading1' },
            { text: 'Pilatusstrasse 1', bold: true },
        ]);
        const result = await processFile(file(docx, 'verfuegung.docx'), { convertWordToMarkdown: true });
        expect(result).toEqual({
            success: true,
            text: '# Verfügung\n\n**Pilatusstrasse 1**',
            html: '<h1>Verfügung</h1><p><strong>Pilatusstrasse 1</strong></p>',
        });
    });

    it('meldet leere Dateien und fremde Formate', async () => {
        expect(await processFile(file('   ', 'leer.txt'))).toEqual({ success: false, error: 'Kein Text in der Datei gefunden.' });
        expect(validateFile(file('x', 'bild.png', 'image/png')).valid).toBe(false);
    });
});

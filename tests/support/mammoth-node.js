// mammoth liest im Browser { arrayBuffer }, unter Node nur { buffer } oder { path } (das Paket
// tauscht seine Zip-Anbindung über das «browser»-Feld aus). Für die Tests wird nur diese Übergabe
// angepasst; die eigentliche Umwandlung ist dieselbe.
import mammoth from 'mammoth/lib/index.js';

const toNode = input => (input?.arrayBuffer ? { ...input, buffer: Buffer.from(input.arrayBuffer) } : input);

export default {
    ...mammoth,
    convertToHtml: (input, options) => mammoth.convertToHtml(toNode(input), options),
    extractRawText: input => mammoth.extractRawText(toNode(input)),
};

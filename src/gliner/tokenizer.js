import { Tokenizer } from '@huggingface/tokenizers';

/**
 * Tokenizer für GLiNER aus tokenizer.json und tokenizer_config.json des Modells.
 * GLiNER zerlegt jedes Wort einzeln und setzt [CLS] und [SEP] selbst um die ganze Eingabe.
 *
 * @param {object} tokenizerJson Inhalt von tokenizer.json
 * @param {object} tokenizerConfig Inhalt von tokenizer_config.json
 */
export function createTokenizer(tokenizerJson, tokenizerConfig) {
    const tokenizer = new Tokenizer(tokenizerJson, tokenizerConfig);
    const idOf = name => {
        const token = tokenizerConfig[name];
        const id = tokenizer.token_to_id(typeof token === 'string' ? token : token?.content);
        if (id === undefined) throw new Error(`Tokenizer: ${name} fehlt`);
        return id;
    };
    return {
        clsId: idOf('cls_token'),
        sepId: idOf('sep_token'),
        encodeWord: word => tokenizer.encode(word, { add_special_tokens: false }).ids,
    };
}

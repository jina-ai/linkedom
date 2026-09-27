export class HTMLTokenizer extends Tokenizer {
    constructor(...args: any[]);
    script: {
        start: number;
        index: number;
        state: number;
    };
    stateInSpecialTag(c: any): void;
    scriptState(end: any): number;
}
import { Tokenizer } from 'htmlparser2';

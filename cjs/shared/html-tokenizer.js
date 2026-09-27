'use strict';
const {Tokenizer} = require('htmlparser2');

// htmlparser2 ends a <script> at the very first `</script`, but the HTML
// standard also defines "escaped" and "double escaped" script data states:
// after a `<!--`, a nested `<script>` turns the next `</script>` into text.
// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-state
//
//  <script>var s = "<!--<script>";</script>alert(1)</script>
//                               ^ not an end tag  ^ actual end tag

const DATA = 0;
const ESCAPED = 1;
const DOUBLE_ESCAPED = 2;

const SCRIPT_END = '</script';
const TOKENS = /<!--|-->|<(\/?)script[\t\n\f\r />]/gi;

const isScriptEnd = sequence => {
  if (sequence.length !== SCRIPT_END.length)
    return false;
  for (let i = 0; i < SCRIPT_END.length; i++) {
    if (sequence[i] !== SCRIPT_END.charCodeAt(i))
      return false;
  }
  return true;
};

class HTMLTokenizer extends Tokenizer {
  constructor(...args) {
    super(...args);
    // state of the script data scanned so far
    this.script = {start: -1, index: 0, state: DATA};
  }

  stateInSpecialTag(c) {
    if (
      this.sequenceIndex === SCRIPT_END.length &&
      // same end tag condition used by htmlparser2: `>` or whitespace
      (c === 0x3E || c === 0x20 || (c >= 0x09 && c <= 0x0D)) &&
      isScriptEnd(this.currentSequence) &&
      this.scriptState(this.index - SCRIPT_END.length) === DOUBLE_ESCAPED
    ) {
      // not an end tag: keep going as script data
      this.sequenceIndex = 0;
    }
    super.stateInSpecialTag(c);
  }

  // returns the script data state right before `end`
  scriptState(end) {
    const {script, sectionStart, offset} = this;
    if (script.start !== sectionStart) {
      script.start = script.index = sectionStart;
      script.state = DATA;
    }
    const text = this.buffer.slice(script.index - offset, end - offset);
    let {state} = script, match;
    TOKENS.lastIndex = 0;
    while ((match = TOKENS.exec(text))) {
      const [token, slash] = match;
      if (token === '<!--') {
        if (state === DATA)
          state = ESCAPED;
        // `<!-->` and `<!--->` get back to data right away
        TOKENS.lastIndex = match.index + 2;
      }
      else if (token === '-->')
        state = DATA;
      else if (!slash && state === ESCAPED)
        state = DOUBLE_ESCAPED;
      else if (slash && state === DOUBLE_ESCAPED)
        state = ESCAPED;
    }
    script.index = end;
    script.state = state;
    return state;
  }
}
exports.HTMLTokenizer = HTMLTokenizer

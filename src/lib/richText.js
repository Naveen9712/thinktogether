// Turns an AI reply into blocks for the point-by-point layout. Pure and safe: it only splits text, it never
// produces HTML. Lines starting with "- " (also "* ", "• " or "1. ") become list items; other lines become paragraphs.
// Works on half-streamed text too.

const BULLET = /^\s*(?:[-*•–]|\d{1,2}[.)])\s+(.*)$/;

export function parseRichText(text) {
  const blocks = [];
  let para = [];
  let list = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join('\n') });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ type: 'ul', items: list });
      list = null;
    }
  };

  String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .forEach((raw) => {
      const line = raw.replace(/\s+$/, '');
      const m = line.match(BULLET);
      if (m && m[1].trim() !== '') {
        flushPara();
        if (!list) list = [];
        list.push(m[1].trim());
      } else if (line.trim() === '') {
        flushPara();
        flushList();
      } else if (list && /^\s{2,}\S/.test(raw)) {
        // An indented continuation line belongs to the previous point.
        list[list.length - 1] += ` ${line.trim()}`;
      } else {
        flushList();
        para.push(line.trim());
      }
    });
  flushPara();
  flushList();
  return blocks;
}

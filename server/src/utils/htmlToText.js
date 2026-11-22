const NAMED_ENTITIES = {
  amp: '&', apos: "'", gt: '>', lt: '<', quot: '"', nbsp: ' ',
  copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—', ndash: '–',
};

const decodeEntities = (input) => {
  let output = '';
  for (let i = 0; i < input.length; i += 1) {
    if (input[i] !== '&') {
      output += input[i];
      continue;
    }
    const end = input.indexOf(';', i + 1);
    if (end === -1 || end - i > 12) {
      output += input[i];
      continue;
    }
    const entity = input.slice(i + 1, end);
    let decoded;
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        decoded = String.fromCodePoint(codePoint);
      }
    } else {
      decoded = NAMED_ENTITIES[entity];
    }
    if (decoded === undefined) {
      output += input.slice(i, end + 1);
    } else {
      output += decoded;
    }
    i = end;
  }
  return output;
};

/**
 * Convert stored rich-text HTML into safe plain text for excerpts and feeds.
 * This is a small tokenizer, not an HTML sanitizer; never use its output as HTML.
 */
const htmlToText = (html = '') => {
  const source = String(html);
  const lower = source.toLowerCase();
  let output = '';
  let index = 0;

  while (index < source.length) {
    if (source.startsWith('<!--', index)) {
      const commentEnd = source.indexOf('-->', index + 4);
      index = commentEnd === -1 ? source.length : commentEnd + 3;
      continue;
    }

    if (source[index] === '<') {
      let cursor = index + 1;
      while (cursor < source.length && /\\s/.test(source[cursor])) cursor += 1;
      const closing = source[cursor] === '/';
      if (closing) cursor += 1;
      const nameStart = cursor;
      while (cursor < source.length && /[a-zA-Z0-9:-]/.test(source[cursor])) cursor += 1;
      const tagName = source.slice(nameStart, cursor).toLowerCase();
      const tagEnd = source.indexOf('>', cursor);
      if (tagName && tagEnd !== -1) {
        if (!closing && (tagName === 'script' || tagName === 'style')) {
          const closeStart = lower.indexOf(`</${tagName}`, tagEnd + 1);
          if (closeStart === -1) break;
          const closeEnd = source.indexOf('>', closeStart);
          index = closeEnd === -1 ? source.length : closeEnd + 1;
          output += ' ';
          continue;
        }
        if (['br', 'p', 'div', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'pre', 'tr'].includes(tagName)) {
          output += ' ';
        }
        index = tagEnd + 1;
        continue;
      }
    }

    output += source[index];
    index += 1;
  }

  return decodeEntities(output).replace(/\\s+/g, ' ').trim();
};

module.exports = { htmlToText };

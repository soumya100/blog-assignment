const { htmlToText } = require('../../src/utils/htmlToText');

describe('htmlToText', () => {
  it('converts rich text markup to readable plain text', () => {
    expect(htmlToText('<h2>Hello</h2><p>World<br>again</p>')).toBe('Hello World again');
  });

  it('removes script and style element contents, not only their tags', () => {
    expect(htmlToText('<p>Safe</p><script>alert(1)</script><style>.x{color:red}</style>text')).toBe('Safe text');
  });

  it('decodes common and numeric HTML entities', () => {
    expect(htmlToText('A&amp;B&nbsp;&#x1F680;&#65;')).toBe('A&B 🚀A');
  });

  it('removes comments and tolerates malformed tags', () => {
    expect(htmlToText('before<!-- hidden --> <strong>after')).toBe('before after');
  });

  it('returns plain text for non-string input', () => {
    expect(htmlToText(null)).toBe('null');
  });
});

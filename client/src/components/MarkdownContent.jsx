import React from 'react';

const headingId = (value) => value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

const renderInline = (text, keyPrefix) => {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  const parts = text.split(pattern);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(part)) return <code key={key} className="article-inline-code">{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
};

const MarkdownContent = ({ content = '' }) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];
  let listType = 'ul';
  let code = [];
  let inCode = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={`p-${blocks.length}`}>{renderInline(paragraph.join(' '), `p-${blocks.length}`)}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      const ListTag = listType;
      blocks.push(<ListTag key={`list-${blocks.length}`}>{list.map((item, index) => <li key={index}>{renderInline(item, `li-${blocks.length}-${index}`)}</li>)}</ListTag>);
      list = [];
    }
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      flushParagraph(); flushList();
      if (inCode) {
        blocks.push(<pre key={`code-${blocks.length}`}><code>{code.join('\n')}</code></pre>);
        code = [];
        inCode = false;
      } else inCode = true;
      return;
    }
    if (inCode) { code.push(line); return; }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const Tag = `h${heading[1].length}`;
      blocks.push(<Tag id={headingId(heading[2])} key={`h-${index}`}>{renderInline(heading[2], `h-${index}`)}</Tag>);
    } else if (bullet || numbered) {
      flushParagraph();
      const nextType = numbered ? 'ol' : 'ul';
      if (list.length && listType !== nextType) flushList();
      listType = nextType;
      list.push((bullet || numbered)[1]);
    } else if (/^>\s?/.test(line)) {
      flushParagraph(); flushList();
      blocks.push(<blockquote key={`q-${index}`}>{renderInline(line.replace(/^>\s?/, ''), `q-${index}`)}</blockquote>);
    } else if (/^---+$/.test(line.trim())) {
      flushParagraph(); flushList();
      blocks.push(<hr key={`hr-${index}`} />);
    } else if (!line.trim()) {
      flushParagraph(); flushList();
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  });
  flushParagraph(); flushList();
  if (inCode) blocks.push(<pre key="code-final"><code>{code.join('\n')}</code></pre>);
  return <div className="markdown-content">{blocks}</div>;
};

export default MarkdownContent;

import React, { useRef, useState } from 'react';
import { Eye, Pencil, Bold, Italic, Heading2, List, ListOrdered, Quote, Code, Link as LinkIcon } from 'lucide-react';
import MarkdownContent from './MarkdownContent';

const toolbar = [
  { label: 'Bold', icon: Bold, before: '**', after: '**', placeholder: 'bold text' },
  { label: 'Italic', icon: Italic, before: '*', after: '*', placeholder: 'italic text' },
  { label: 'Heading', icon: Heading2, before: '## ', after: '', placeholder: 'Heading' },
  { label: 'Bullet list', icon: List, before: '- ', after: '', placeholder: 'List item' },
  { label: 'Numbered list', icon: ListOrdered, before: '1. ', after: '', placeholder: 'List item' },
  { label: 'Quote', icon: Quote, before: '> ', after: '', placeholder: 'Quote' },
  { label: 'Code', icon: Code, before: '`', after: '`', placeholder: 'code' },
  { label: 'Link', icon: LinkIcon, before: '[', after: '](https://example.com)', placeholder: 'link text' },
];

const MarkdownEditor = ({ value, onChange, error }) => {
  const textareaRef = useRef(null);
  const [preview, setPreview] = useState(false);

  const applyFormat = (format) => {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = value.slice(start, end) || format.placeholder;
    const next = value.slice(0, start) + format.before + selected + format.after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      input.focus();
      const selectionStart = start + format.before.length;
      input.setSelectionRange(selectionStart, selectionStart + selected.length);
    });
  };

  return (
    <div className={`markdown-editor ${error ? 'markdown-editor-error' : ''}`}>
      <div className="markdown-editor-topbar">
        <div className="markdown-toolbar" role="toolbar" aria-label="Article formatting">
          {toolbar.map(({ label, icon: Icon, ...format }) => (
            <button key={label} type="button" className="markdown-tool" title={label} aria-label={label} onClick={() => applyFormat(format)}>
              <Icon size={16} />
            </button>
          ))}
        </div>
        <div className="markdown-editor-tabs">
          <button type="button" className={!preview ? 'active' : ''} onClick={() => setPreview(false)}><Pencil size={14} /> Write</button>
          <button type="button" className={preview ? 'active' : ''} onClick={() => setPreview(true)}><Eye size={14} /> Preview</button>
        </div>
      </div>
      {preview ? (
        <div className="markdown-preview"><MarkdownContent content={value} />{!value.trim() && <p className="markdown-empty">Your article preview will appear here.</p>}</div>
      ) : (
        <textarea
          ref={textareaRef}
          className="markdown-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Start writing your article... Markdown formatting is supported."
          aria-label="Article content"
          spellCheck="true"
        />
      )}
      <div className="markdown-editor-footer">
        <span>Markdown supported · Formatting toolbar</span>
        <span>{value.trim() ? value.trim().split(/\s+/).length : 0} words · {value.length} characters</span>
      </div>
    </div>
  );
};

export default MarkdownEditor;

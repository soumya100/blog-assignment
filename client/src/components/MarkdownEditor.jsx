import React, { useRef, useState } from 'react';
import {
  Eye,
  Pencil,
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  FileText,
} from 'lucide-react';
import MarkdownContent from './MarkdownContent';

const toolbar = [
  { label: 'Bold', icon: Bold, before: '**', after: '**', placeholder: 'bold text', shortcut: 'B' },
  { label: 'Italic', icon: Italic, before: '*', after: '*', placeholder: 'italic text', shortcut: 'I' },
  { label: 'Heading', icon: Heading2, before: '## ', after: '', placeholder: 'Heading' },
  { label: 'Bullet list', icon: List, before: '- ', after: '', placeholder: 'List item' },
  { label: 'Numbered list', icon: ListOrdered, before: '1. ', after: '', placeholder: 'List item' },
  { label: 'Quote', icon: Quote, before: '> ', after: '', placeholder: 'Quote' },
  { label: 'Code', icon: Code, before: '`', after: '`', placeholder: 'code' },
  { label: 'Link', icon: LinkIcon, before: '[', after: '](https://example.com)', placeholder: 'link text' },
];

const MarkdownEditor = ({ value = '', onChange, error }) => {
  const textareaRef = useRef(null);
  const [preview, setPreview] = useState(false);
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

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
    <section className={`markdown-editor ${error ? 'markdown-editor-error' : ''}`} aria-label="Article editor">
      <div className="markdown-editor-chrome">
        <div className="markdown-editor-toolbar-row">
          <div className="markdown-editor-toolbar-label">
            <FileText size={15} aria-hidden="true" />
            <span>EDITOR</span>
            <span className="markdown-editor-format">Markdown</span>
          </div>
          <div className="markdown-editor-tabs" role="tablist" aria-label="Editor view">
            <button
              type="button"
              role="tab"
              aria-selected={!preview}
              className={`markdown-editor-tab ${!preview ? 'active' : ''}`}
              onClick={() => setPreview(false)}
            >
              <Pencil size={14} /> Write
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={preview}
              className={`markdown-editor-tab ${preview ? 'active' : ''}`}
              onClick={() => setPreview(true)}
            >
              <Eye size={14} /> Preview
            </button>
          </div>
        </div>

        <div className="markdown-editor-toolbar" role="toolbar" aria-label="Article formatting">
          {toolbar.map(({ label, icon: Icon, ...format }) => (
            <button
              key={label}
              type="button"
              className="markdown-tool"
              title={label}
              aria-label={label}
              onClick={() => applyFormat(format)}
              disabled={preview}
            >
              <Icon size={16} strokeWidth={2} />
            </button>
          ))}
          <span className="markdown-toolbar-divider" aria-hidden="true" />
          <span className="markdown-toolbar-hint">Select text to format</span>
        </div>
      </div>

      {preview ? (
        <div className="markdown-preview" role="tabpanel" aria-label="Article preview">
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <div className="markdown-empty">
              <FileText size={24} />
              <strong>Your preview will appear here</strong>
              <span>Start writing to see how your article will look.</span>
            </div>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          className="markdown-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Start writing your article... Use Markdown to format headings, lists, code, and links."
          aria-label="Article content"
          aria-invalid={Boolean(error)}
          spellCheck="true"
        />
      )}

      <div className="markdown-editor-footer">
        <span className="markdown-editor-footer-hint">
          <span className="markdown-status-dot" />
          Markdown supported
        </span>
        <span className="markdown-editor-counts">
          <strong>{wordCount}</strong> words
          <span className="markdown-count-separator">·</span>
          <strong>{value.length}</strong> characters
        </span>
      </div>
    </section>
  );
};

export default MarkdownEditor;

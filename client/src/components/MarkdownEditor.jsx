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
  ImagePlus,
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

const MarkdownEditor = ({ value = '', onChange, error, onImageUpload }) => {
  const textareaRef = useRef(null);
  const [preview, setPreview] = useState(false);
  const imageInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const insertImage = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file || !onImageUpload) return;
    setUploadingImage(true);
    try {
      const url = await onImageUpload(file);
      const input = textareaRef.current;
      if (input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const markdown = '![' + file.name.split('.').slice(0, -1).join('.') || file.name + '](' + url + ')';
        onChange(value.slice(0, start) + markdown + value.slice(end));
        requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + markdown.length, start + markdown.length); });
      }
    } catch (error) { window.alert(error.message || 'Image upload failed'); }
    finally { setUploadingImage(false); }
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
          {onImageUpload && <><button type="button" className="markdown-tool" title="Upload image" aria-label="Upload image" disabled={preview || uploadingImage} onClick={() => imageInputRef.current && imageInputRef.current.click()}><ImagePlus size={16} /></button><input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={insertImage} hidden /></>}
          <button type="button" className="markdown-tool" title="Insert table" aria-label="Insert table" disabled={preview} onClick={() => { const input = textareaRef.current; const start = input ? input.selectionStart : value.length; const end = input ? input.selectionEnd : start; const table = "\n| Column 1 | Column 2 |\n| --- | --- |\n| Value | Value |\n"; onChange(value.slice(0, start) + table + value.slice(end)); }}><span aria-hidden="true">▦</span></button>
          <button type="button" className="markdown-tool" title="Insert divider" aria-label="Insert divider" disabled={preview} onClick={() => onChange(value + "\n\n---\n\n")}><span aria-hidden="true">—</span></button>
          <span className="markdown-toolbar-hint">{uploadingImage ? "Uploading image…" : "Select text to format"}</span>
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
          onKeyDown={(event) => { if (!(event.ctrlKey || event.metaKey)) return; const key = event.key.toLowerCase(); if (key === "b" || key === "i") { event.preventDefault(); applyFormat(toolbar[key === "b" ? 0 : 1]); } }}
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

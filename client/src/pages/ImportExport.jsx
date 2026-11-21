import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, FileJson, UploadCloud } from 'lucide-react';
import apiClient from '../api/client';
import FeedbackDialog from '../components/FeedbackDialog';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const importSchema = z.object({
  file: z.custom((value) => typeof File !== 'undefined' && value instanceof File, 'Choose a DevLog JSON export file.')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'The JSON file must be 5 MB or smaller.')
    .refine((file) => file.name.toLowerCase().endsWith('.json') || file.type === 'application/json', 'Choose a .json file.'),
});

export default function ImportExport() {
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState({ open: false, tone: 'info', title: '', message: '' });
  const inputRef = useRef(null);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(importSchema), defaultValues: { file: undefined }, mode: 'onSubmit',
  });
  const selectedFile = watch('file');
  const closeDialog = () => setDialog((current) => ({ ...current, open: false }));
  const showDialog = (tone, title, message) => setDialog({ open: true, tone, title, message });

  const exportArticles = async () => {
    setBusy(true);
    try {
      const response = await apiClient.get('/posts/export');
      const posts = Array.isArray(response?.posts) ? response.posts : [];
      if (!posts.length) { showDialog('info', 'Nothing to export yet', 'Your account does not have any published articles to export.'); return; }
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'devlog-articles-export.json';
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      showDialog('success', 'Export ready', `${posts.length} published article(s), including content and metadata, were exported to devlog-articles-export.json.`);
    } catch (error) { showDialog('error', 'Export failed', error.message || 'DevLog could not export your articles. Please try again.'); }
    finally { setBusy(false); }
  };

  const importArticles = async ({ file }) => {
    setBusy(true);
    try {
      let payload;
      try { payload = JSON.parse(await file.text()); }
      catch { showDialog('error', 'Invalid JSON file', 'The selected file is not valid JSON. Choose a DevLog export file and try again.'); return; }
      const schema = z.object({
        format: z.literal('devlog-post-export-v1'),
        posts: z.array(z.object({ title: z.string().trim().min(3).max(200), content: z.string().trim().min(10).max(200000) }).passthrough()).min(1).max(5),
      }).passthrough();
      const parsed = schema.safeParse(payload);
      if (!parsed.success) { showDialog('error', 'Unsupported export format', 'Choose a DevLog export JSON containing 1–5 articles. Each article must include a valid title and content.'); return; }
      const total = parsed.data.posts.reduce((sum, post) => sum + post.content.length, 0);
      if (total > 500000) { showDialog('error', 'Import is too large', 'The combined article content exceeds the 500,000 character import limit.'); return; }
      const response = await apiClient.post('/posts/import', parsed.data);
      const count = response?.data?.count ?? response?.count ?? 0;
      showDialog('success', 'Import completed', `${count} article(s) were imported. Existing articles were not overwritten.`);
      setValue('file', undefined, { shouldValidate: false });
      if (inputRef.current) inputRef.current.value = '';
    } catch (error) { showDialog('error', 'Import failed', error.message || 'DevLog could not import this file. Check the file and try again.'); }
    finally { setBusy(false); }
  };

  const fileRegistration = register('file');
  return (
    <main className="container-narrow import-export-page" style={{ padding: '3rem 0', maxWidth: 760 }}>
      <header className="publishing-heading">
        <div className="publishing-icon"><FileJson size={22} /></div>
        <div><h1>Import and export</h1><p>Move your published writing with the DevLog JSON format.</p><small>Exports include article content, tags, SEO metadata and cover-image references.</small></div>
      </header>
      <section className="publishing-card import-export-card">
        <div className="import-export-card-heading"><span className="publishing-icon"><Download size={20} /></span><div><h2>Export your articles</h2><p>Download a portable copy of your published articles.</p></div></div>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={exportArticles}>{busy ? 'Please wait…' : 'Export published articles'}</button>
      </section>
      <section className="publishing-card import-export-card">
        <div className="import-export-card-heading"><span className="publishing-icon"><UploadCloud size={20} /></span><div><h2>Import articles</h2><p>Restore a DevLog export. Imports create new articles and never overwrite existing content.</p></div></div>
        <form onSubmit={handleSubmit(importArticles)} noValidate>
          <input {...fileRegistration} ref={(element) => { fileRegistration.ref(element); inputRef.current = element; }}
            type="file" accept=".json,application/json" className="import-file-input" aria-label="Choose DevLog JSON export"
            onChange={(event) => setValue('file', event.target.files?.[0], { shouldValidate: true, shouldDirty: true })} />
          <div className="import-file-control">
            <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()} disabled={busy}>Choose JSON file</button>
            <span className="import-file-name">{selectedFile?.name || 'No file selected'}</span>
          </div>
          <p className="import-file-help">DevLog JSON export · Maximum 5 MB · 1–5 articles per import</p>
          {errors.file && <p className="form-error" role="alert">{errors.file.message}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy || !selectedFile} style={{ marginTop: '1rem' }}>{busy ? 'Importing…' : 'Import articles'}</button>
        </form>
      </section>
      <FeedbackDialog {...dialog} onClose={closeDialog} />
    </main>
  );
}

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../api/client';

export default function ImportExport() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const exportArticles = async () => {
    setBusy(true);
    try {
      const response = await apiClient.get('/posts/export');
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'devlog-articles-export.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Your articles were exported.');
    } catch (error) { toast.error(error.message || 'Export failed'); }
    finally { setBusy(false); }
  };
  const importArticles = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Import file must be 5 MB or smaller.'); return; }
    setBusy(true);
    try {
      const parsed = JSON.parse(await file.text());
      const response = await apiClient.post('/posts/import', parsed);
      setResult('Imported ' + (response.data?.count || 0) + ' article(s).');
      toast.success('Import completed.');
    } catch (error) { toast.error(error.message || 'Import failed. Check the export file format.'); }
    finally { setBusy(false); }
  };
  return <main className="container-narrow" style={{ padding: '3rem 0', maxWidth: 760 }}>
    <h1>Import and export</h1>
    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem' }}>Move your published articles using the DevLog JSON export format. Imports create new articles and do not overwrite existing content.</p>
    <section className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
      <h2 style={{ fontSize: '1.15rem' }}>Export your articles</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1rem' }}>Downloads your published articles, metadata, tags and cover-image references.</p>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={exportArticles}>Export JSON</button>
    </section>
    <section className="card" style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.15rem' }}>Import articles</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1rem' }}>Select a DevLog export JSON file (up to 5 MB; maximum 20 articles per import).</p>
      <input type="file" accept="application/json,.json" onChange={importArticles} disabled={busy} />
      {result && <p role="status" style={{ marginTop: '1rem' }}>{result}</p>}
    </section>
  </main>;
}

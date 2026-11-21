import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../api/client';

const statuses = ['open', 'reviewing', 'resolved', 'dismissed'];

export default function ModerationQueue() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/reports', { params: statusFilter ? { status: statusFilter } : {} });
      setReports(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load moderation reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, [statusFilter]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await apiClient.patch('/admin/reports/' + id, { status });
      setReports((current) => current.filter((report) => report._id !== id || statusFilter === ''));
      toast.success('Moderation status updated');
      if (statusFilter) loadReports();
    } catch (error) {
      toast.error(error.message || 'Unable to update report');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="admin-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div><h2>Content moderation queue</h2><p style={{ color: 'var(--text-secondary)' }}>Review reader-submitted reports and record a moderation outcome.</p></div>
        <label>Filter status <select className="form-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
      </div>
      {loading ? <p role="status">Loading reports…</p> : reports.length === 0 ? <div className="card" style={{ padding: '2rem' }}>No reports in this queue.</div> : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {reports.map((report) => (
            <article className="card" key={report._id} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <strong>{report.targetType} · {report.reason}</strong>
                <span className="badge badge-secondary">{report.status}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>Reported by {report.reporter?.username || 'Unknown'} · {new Date(report.createdAt).toLocaleString()}</p>
              {report.details && <p>{report.details}</p>}
              <code style={{ fontSize: '0.8rem' }}>Target: {String(report.target)}</code>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {statuses.filter((status) => status !== report.status).map((status) => (
                  <button key={status} type="button" className="btn btn-secondary btn-sm" disabled={updatingId === report._id} onClick={() => updateStatus(report._id, status)}>{status === 'reviewing' ? 'Start review' : status[0].toUpperCase() + status.slice(1)}</button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

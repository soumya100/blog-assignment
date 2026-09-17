import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Pagination from '../../components/Pagination';
import { Activity, Shield } from 'lucide-react';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/activity', {
        params: { page: pagination.page, limit: 15 },
      });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [pagination.page]);

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>System Audit & Security Trail</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Chronological record of authentication events, content mutations, and administrative interventions.
        </p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Action Key</th>
              <th>Triggered By</th>
              <th>Resource Type</th>
              <th>IP Address</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Retrieving activity logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No audit logs recorded.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td>
                    <span className="badge badge-primary" style={{ fontSize: '0.725rem' }}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <strong>{log.user?.username || 'Unauthenticated / System'}</strong>
                  </td>
                  <td>{log.resourceType}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {log.ipAddress || '127.0.0.1'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
      />
    </div>
  );
};

export default ActivityLogs;

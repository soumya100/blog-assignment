import React, { useState } from 'react';
import Pagination from '../../components/Pagination';
import { Activity, Shield } from 'lucide-react';
import { useAdminActivity } from '../../hooks/useBlogApi';

const ActivityLogs = () => {
  const [page, setPage] = useState(1);

  // TanStack Query server data store
  const { data, isLoading: loading } = useAdminActivity({
    page,
    limit: 15,
  });
  const logs = data?.logs || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

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
        onPageChange={(newPage) => setPage(newPage)}
      />
    </div>
  );
};

export default ActivityLogs;

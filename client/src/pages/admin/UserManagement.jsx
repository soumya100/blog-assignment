import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import { Search, UserX, Shield, CheckCircle, XCircle, Trash2 } from 'lucide-react';

const UserManagement = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/users', {
        params: { page: pagination.page, limit: 10, search },
      });
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search]);

  const handleRoleChange = async (targetUser, newRole) => {
    try {
      await apiClient.patch(`/admin/users/${targetUser._id}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update role');
    }
  };

  const handleStatusToggle = async (targetUser) => {
    const newStatus = targetUser.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    try {
      await apiClient.patch(`/admin/users/${targetUser._id}/status`, { status: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update user status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await apiClient.delete(`/admin/users/${selectedUser._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== selectedUser._id));
      setDeleteModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
      setSelectedUser(null);
    }
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem' }}>User Directory & Permissions</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Manage user roles, toggle account deactivation, and inspect authentication metadata.
          </p>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.25rem', height: '2.4rem', fontSize: '0.875rem' }}
            placeholder="Search username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Assigned Role</th>
              <th>Account Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading user accounts...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No users found matching query.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isCurrent = u._id === currentAdmin?._id;
                return (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div
                          style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                          }}
                        >
                          {u.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <strong>{u.username}</strong>
                          {isCurrent && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginLeft: '0.4rem' }}>
                              (You)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>

                    <td>
                      <select
                        className="form-select"
                        style={{ padding: '0.25rem 0.5rem', width: 'auto', fontSize: '0.8rem' }}
                        value={u.role}
                        disabled={isCurrent}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    <td>
                      <button
                        onClick={() => handleStatusToggle(u)}
                        disabled={isCurrent}
                        className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}
                        style={{ cursor: isCurrent ? 'default' : 'pointer', border: 'none' }}
                        title={isCurrent ? 'Cannot deactivate self' : 'Click to toggle status'}
                      >
                        {u.status === 'ACTIVE' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {u.status}
                      </button>
                    </td>

                    <td>
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setDeleteModalOpen(true);
                        }}
                        disabled={isCurrent}
                        className="btn btn-outline-danger btn-sm"
                        style={{ padding: '0.25rem 0.5rem' }}
                        title={isCurrent ? 'Cannot delete self' : 'Delete user'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete user "${selectedUser?.username}"? Their active refresh tokens will be terminated and their posts soft-deleted.`}
        confirmText="Confirm Deletion"
        isDanger={true}
        isLoading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
};

export default UserManagement;

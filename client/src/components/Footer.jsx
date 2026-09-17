import React from 'react';
import { Shield, Lock, Cpu } from 'lucide-react';

const Footer = () => {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        padding: '3rem 0 2rem 0',
        marginTop: '5rem',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
            paddingBottom: '2rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>DevLog Architecture</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Enterprise Secure MERN Platform with Role-Based Access Control & VAPT Hardening.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="badge badge-success" style={{ padding: '0.35rem 0.75rem' }}>
              <Shield size={13} />
              OWASP Top 10 Hardened
            </span>
            <span className="badge badge-primary" style={{ padding: '0.35rem 0.75rem' }}>
              <Lock size={13} />
              JWT Family Rotation
            </span>
            <span className="badge badge-warning" style={{ padding: '0.35rem 0.75rem' }}>
              <Cpu size={13} />
              BOLA / IDOR Protected
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <p>© {new Date().getFullYear()} DevLog Secure Systems Inc. Built for Engineering Hiring Assignment.</p>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <span>REST API v1</span>
            <span>Socket.io Real-Time</span>
            <span>Mongoose Soft Deletes</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

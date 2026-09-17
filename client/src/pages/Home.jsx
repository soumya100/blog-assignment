import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { PostCardSkeleton } from '../components/SkeletonLoader';
import Pagination from '../components/Pagination';
import { Search, Tag, MessageSquare, Clock, User as UserIcon, Sparkles } from 'lucide-react';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const params = {
          page: pagination.page,
          limit: 6,
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (selectedTag) params.tag = selectedTag;

        const res = await apiClient.get('/posts', { params });
        setPosts(res.data.data);
        setPagination(res.data.pagination);
      } catch (err) {
        console.error('Failed to load posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [pagination.page, debouncedSearch, selectedTag]);

  const popularTags = ['Architecture', 'Security', 'React', 'NodeJS', 'JWT', 'AppSec'];

  return (
    <div>
      {/* Hero Section */}
      <section
        style={{
          padding: '4.5rem 0 3.5rem 0',
          textAlign: 'center',
          background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="container-narrow">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: 'var(--accent-primary)',
              fontSize: '0.825rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
            }}
          >
            <Sparkles size={15} />
            Enterprise Engineering & AppSec Insights
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.25rem, 4vw, 3.25rem)',
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
            }}
          >
            Insights on Scalable Architecture & Web Security
          </h1>

          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--text-secondary)',
              maxWidth: '640px',
              margin: '0 auto 2.5rem auto',
            }}
          >
            Deep technical deep-dives into modern MERN architectures, defensive engineering, and robust identity workflows.
          </p>

          {/* Search Input */}
          <div
            style={{
              position: 'relative',
              maxWidth: '520px',
              margin: '0 auto',
            }}
          >
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{
                paddingLeft: '2.75rem',
                paddingRight: '1rem',
                height: '3rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '1rem',
                boxShadow: 'var(--shadow-md)',
              }}
              placeholder="Search articles by title, content, or technology..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter Tags */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '1.5rem',
            }}
          >
            <button
              onClick={() => {
                setSelectedTag('');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`btn btn-sm ${!selectedTag ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              All Topics
            </button>
            {popularTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTag(tag.toLowerCase() === selectedTag ? '' : tag.toLowerCase());
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`btn btn-sm ${
                  selectedTag === tag.toLowerCase() ? 'btn-primary' : 'btn-secondary'
                }`}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Articles Grid */}
      <div className="container" style={{ paddingTop: '3.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem' }}>
              {selectedTag ? `Articles tagged with #${selectedTag}` : 'Latest Publications'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {pagination.total || 0} technical articles published
            </p>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <Tag size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No articles match your criteria</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginBottom: '1.5rem' }}>
              Try searching with different keywords or reset your tag filters.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedTag('');
              }}
              className="btn btn-secondary btn-sm"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.75rem',
            }}
          >
            {posts.map((post) => (
              <article
                key={post._id}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                {/* Author Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                    }}
                  >
                    {post.author?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {post.author?.username || 'Anonymous'}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Clock size={12} />
                      {new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: '1.2rem',
                    marginBottom: '0.75rem',
                    lineHeight: 1.35,
                  }}
                >
                  <Link
                    to={`/posts/${post.slug || post._id}`}
                    style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                  >
                    {post.title}
                  </Link>
                </h3>

                {/* Excerpt */}
                <p
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    marginBottom: '1.25rem',
                    flex: 1,
                  }}
                >
                  {post.excerpt || post.content?.slice(0, 140) + '...'}
                </p>

                {/* Tags & Comments Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-subtle)',
                    marginTop: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {(post.tags || []).slice(0, 2).map((t, idx) => (
                      <span key={idx} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <MessageSquare size={14} />
                    <span>{post.commentsCount || 0}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          pagination={pagination}
          onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        />
      </div>
    </div>
  );
};

export default Home;

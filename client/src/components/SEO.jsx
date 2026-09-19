import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reusable SEO component for dynamic metadata management across React SPA routes.
 * Automatically updates document.title, meta descriptions, Open Graph, Twitter Cards,
 * and canonical link headers.
 */
export default function SEO({
  title,
  description = 'DevLog is a high-performance, secure engineering blog platform featuring technical articles, discussions, and developer insights.',
  keywords = 'MERN blog, software engineering, web development, React, Node.js, MongoDB, DevLog, tech articles',
  image = '/favicon.svg',
  type = 'website',
}) {
  const location = useLocation();

  useEffect(() => {
    // Update Page Title
    const fullTitle = title ? `${title} | DevLog` : 'DevLog | Enterprise Secure Blog Platform';
    document.title = fullTitle;

    // Helper to safely set or update <meta> tags in <head>
    const setMetaTag = (name, content, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Standard Meta Tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);

    // Open Graph / Facebook / LinkedIn
    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:site_name', 'DevLog', true);
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.origin + location.pathname;
      setMetaTag('og:url', currentUrl, true);
      setMetaTag('og:image', image.startsWith('http') ? image : window.location.origin + image, true);
    }

    // Twitter Cards
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', description);
    if (typeof window !== 'undefined') {
      setMetaTag('twitter:image', image.startsWith('http') ? image : window.location.origin + image);
    }

    // Canonical URL Link
    if (typeof window !== 'undefined') {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', window.location.origin + location.pathname);
    }
  }, [title, description, keywords, image, type, location.pathname]);

  return null;
}

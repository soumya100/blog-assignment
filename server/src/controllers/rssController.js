const Post = require('../models/Post');
const env = require('../config/env');

const escapeXml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const cdata = (value = '') => String(value).replace(/]]>/g, ']]]]><![CDATA[>');

const getFeed = async (req, res, next) => {
  try {
    const posts = await Post.find({ isDeleted: false, status: 'published', noIndex: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('author', 'username')
      .select('title slug content excerpt seoDescription author createdAt updatedAt')
      .lean();

    const baseUrl = (env.CLIENT_URL || '').split(',')[0].trim().replace(/\/$/, '');
    const origin = baseUrl || `${req.protocol}://${req.get('host')}`;
    const items = posts.map((post) => {
      const link = `${origin}/posts/${encodeURIComponent(post.slug)}`;
      const description = post.seoDescription || post.excerpt || post.content.replace(/<[^>]*>/g, '').slice(0, 500);
      return `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(link)}</link><guid isPermaLink="true">${escapeXml(link)}</guid><description><![CDATA[${cdata(description)}]]></description><author>${escapeXml(post.author?.username || 'Unknown')}</author><pubDate>${new Date(post.createdAt).toUTCString()}</pubDate></item>`;
    }).join('');

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>DevLog</title><link>${escapeXml(origin)}</link><description>Latest articles from DevLog</description><language>en-us</language>${items}</channel></rss>`);
  } catch (error) {
    return next(error);
  }
};

module.exports = { getFeed };

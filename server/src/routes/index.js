const express = require('express');
const authRoutes = require('./authRoutes');
const postRoutes = require('./postRoutes');
const commentRoutes = require('./commentRoutes');
const adminRoutes = require('./adminRoutes');
const savedPostRoutes = require('./savedPostRoutes');
const draftRoutes = require('./draftRoutes');
const readingHistoryRoutes = require('./readingHistoryRoutes');
const communityRoutes = require('./communityRoutes');
const rssRoutes = require('./rssRoutes');
const uploadRoutes = require('./uploadRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const { successResponse } = require('../utils/apiResponse');

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  return successResponse(res, 200, 'DevLog API is healthy', {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount Versioned Routes
router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/admin', adminRoutes);
router.use('/saved-posts', savedPostRoutes);
router.use('/drafts', draftRoutes);
router.use('/reading-history', readingHistoryRoutes);
router.use('/community', communityRoutes);
router.use('/rss.xml', rssRoutes);
router.use('/uploads', uploadRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;

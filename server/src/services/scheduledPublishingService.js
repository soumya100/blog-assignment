const Post = require('../models/Post');
const logger = require('../utils/logger');

let interval = null;
let running = false;

const publishDuePosts = async () => {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const duePosts = await Post.find({ status: 'scheduled', isDeleted: false, scheduledAt: { $lte: now } })
      .select('_id')
      .limit(100)
      .lean();
    for (const post of duePosts) {
      await Post.updateOne(
        { _id: post._id, status: 'scheduled', scheduledAt: { $lte: now }, isDeleted: false },
        { $set: { status: 'published', publishedAt: now, scheduledAt: null } }
      );
    }
    if (duePosts.length) logger.info(`Scheduled publishing processed ${duePosts.length} due article(s)`);
  } catch (error) {
    logger.error('Scheduled publishing worker failed', { error: error.message });
  } finally {
    running = false;
  }
};

const startScheduler = () => {
  if (interval) return;
  publishDuePosts();
  interval = setInterval(publishDuePosts, 30000);
  interval.unref?.();
};

const stopScheduler = () => {
  if (interval) clearInterval(interval);
  interval = null;
};

module.exports = { startScheduler, stopScheduler, publishDuePosts };

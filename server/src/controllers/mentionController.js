const Mention = require('../models/Mention');
const { successResponse } = require('../utils/apiResponse');

const listMine = async (req, res, next) => {
  try {
    const items = await Mention.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(50)
      .populate('actor', 'username avatar')
      .populate('post', 'title slug')
      .populate('comment', 'content')
      .lean();
    return successResponse(res, 200, 'Mentions retrieved', items);
  } catch (error) { next(error); }
};

const markRead = async (req, res, next) => {
  try {
    const item = await Mention.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Mention not found' });
    return successResponse(res, 200, 'Mention marked as read', item);
  } catch (error) { next(error); }
};

module.exports = { listMine, markRead };

const readingHistoryService = require('../services/readingHistoryService');
const { successResponse } = require('../utils/apiResponse');

const record = async (req, res, next) => {
  try {
    const result = await readingHistoryService.recordReading(req.user._id, req.params.postId, req.body || {});
    return successResponse(res, 200, 'Reading activity saved', result);
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const items = await readingHistoryService.getReadingHistory(req.user._id, req.query.limit);
    return successResponse(res, 200, 'Reading history retrieved', items.filter((item) => item.post));
  } catch (error) {
    next(error);
  }
};

const clear = async (req, res, next) => {
  try {
    await readingHistoryService.clearReadingHistory(req.user._id);
    return successResponse(res, 200, 'Reading history cleared');
  } catch (error) {
    next(error);
  }
};

module.exports = { record, list, clear };

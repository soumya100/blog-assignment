/**
 * Standardized API Response Utilities
 */

const successResponse = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const response = {
    success: true,
    message,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
};

const paginatedResponse = (res, statusCode = 200, message = 'Success', items = [], pagination = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: items,
    pagination: {
      total: pagination.total || 0,
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
      hasNextPage: (pagination.page * pagination.limit) < (pagination.total || 0),
      hasPrevPage: pagination.page > 1,
    },
  });
};

const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', errors = null, code = 'ERROR') => {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (errors) {
    response.error.details = errors;
  }
  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  paginatedResponse,
  errorResponse,
};

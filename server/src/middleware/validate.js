const { errorResponse } = require('../utils/apiResponse');

/**
 * Higher-order middleware to validate incoming request data using Zod
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} source 
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const formattedErrors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return errorResponse(res, 400, 'Validation Error', formattedErrors, 'VALIDATION_ERROR');
      }
      // Overwrite with sanitized / coerced values
      req[source] = result.data;
      next();
    } catch (err) {
      return errorResponse(res, 500, 'Internal Validation Error', null, 'INTERNAL_ERROR');
    }
  };
};

module.exports = validate;

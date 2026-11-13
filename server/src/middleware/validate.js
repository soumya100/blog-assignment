const { errorResponse } = require('../utils/apiResponse');

/**
 * Higher-order middleware to validate incoming request data using Zod.
 * Supports Zod 3 and Zod 4 issue collections during the dependency migration.
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // Zod 4 exposes validation details as "issues"; Zod 3 used "errors".
      const issues = result.error.issues || result.error.errors || [];
      const formattedErrors = issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return errorResponse(
        res,
        400,
        'Validation Error',
        formattedErrors,
        'VALIDATION_ERROR'
      );
    }

    // Overwrite with sanitized / coerced values.
    req[source] = result.data;
    return next();
  };
};

module.exports = validate;

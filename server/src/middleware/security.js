/**
 * Sanitize request objects against NoSQL Operator Injection
 * Recursively strips any keys starting with '$' or containing '.'
 */
const sanitizeNoSql = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeNoSql);
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      continue; // Strip potentially malicious MongoDB operator
    }
    clean[key] = sanitizeNoSql(obj[key]);
  }
  return clean;
};

const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = sanitizeNoSql(req.body);
  if (req.query) req.query = sanitizeNoSql(req.query);
  if (req.params) req.params = sanitizeNoSql(req.params);
  next();
};

module.exports = {
  sanitizeInput,
  sanitizeNoSql,
};

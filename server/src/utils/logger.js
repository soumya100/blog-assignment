const env = require('../config/env');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: '\x1b[31m', // Red
  warn: '\x1b[33m',  // Yellow
  info: '\x1b[36m',  // Cyan
  http: '\x1b[35m',  // Magenta
  debug: '\x1b[32m', // Green
  reset: '\x1b[0m',
};

const formatMessage = (level, message, meta = null) => {
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.reset;
  const metaStr = meta ? (typeof meta === 'object' ? ` ${JSON.stringify(meta)}` : ` ${meta}`) : '';
  return `${color}[${timestamp}] [${level.toUpperCase()}]${colors.reset}: ${message}${metaStr}`;
};

const logger = {
  error: (msg, meta) => console.error(formatMessage('error', msg, meta)),
  warn: (msg, meta) => console.warn(formatMessage('warn', msg, meta)),
  info: (msg, meta) => console.log(formatMessage('info', msg, meta)),
  http: (msg, meta) => {
    if (env.NODE_ENV !== 'test') console.log(formatMessage('http', msg, meta));
  },
  debug: (msg, meta) => {
    if (env.NODE_ENV === 'development') console.log(formatMessage('debug', msg, meta));
  },
};

module.exports = logger;

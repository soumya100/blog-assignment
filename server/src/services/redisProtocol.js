const net = require('node:net');
const tls = require('node:tls');

const encodeCommand = (parts) => `*${parts.length}\r\n${parts.map((part) => {
  const value = String(part);
  return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
}).join('')}`;

const parseReply = (buffer, offset = 0) => {
  if (offset >= buffer.length) return null;
  const type = String.fromCharCode(buffer[offset]);
  const lineEnd = buffer.indexOf('\r\n', offset);
  if (lineEnd === -1) return null;

  if (type === '+' || type === '-' || type === ':') {
    const raw = buffer.toString('utf8', offset + 1, lineEnd);
    if (type === '-') throw new Error(`Redis command error: ${raw}`);
    return { value: type === ':' ? Number(raw) : raw, offset: lineEnd + 2 };
  }

  if (type === '$') {
    const length = Number(buffer.toString('utf8', offset + 1, lineEnd));
    if (length === -1) return { value: null, offset: lineEnd + 2 };
    const end = lineEnd + 2 + length;
    if (buffer.length < end + 2) return null;
    return { value: buffer.toString('utf8', lineEnd + 2, end), offset: end + 2 };
  }

  throw new Error('Unsupported Redis response type');
};

const executeRedisCommand = (connectionUrl, command, timeoutMs = 1200) => new Promise((resolve, reject) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(connectionUrl);
    if (!['redis:', 'rediss:'].includes(parsedUrl.protocol)) {
      throw new Error('REDIS_URL must use redis:// or rediss://');
    }
    if (!parsedUrl.hostname || !parsedUrl.port) throw new Error('REDIS_URL must include a hostname and port');
  } catch (error) {
    reject(error);
    return;
  }

  const password = decodeURIComponent(parsedUrl.password || '');
  const username = decodeURIComponent(parsedUrl.username || 'default');
  const db = parsedUrl.pathname && parsedUrl.pathname !== '/' ? Number(parsedUrl.pathname.slice(1)) : 0;
  if (!Number.isInteger(db) || db < 0) {
    reject(new Error('REDIS_URL database path must be a non-negative integer'));
    return;
  }

  const setupCommands = [];
  if (password) setupCommands.push(['AUTH', username, password]);
  if (db > 0) setupCommands.push(['SELECT', db]);
  const commands = [...setupCommands, command];
  const expectedReplies = commands.length;
  let buffer = Buffer.alloc(0);
  let replies = [];
  let settled = false;
  const socket = parsedUrl.protocol === 'rediss:'
    ? tls.connect({ host: parsedUrl.hostname, port: Number(parsedUrl.port), servername: parsedUrl.hostname })
    : net.createConnection({ host: parsedUrl.hostname, port: Number(parsedUrl.port) });

  const finish = (error, value) => {
    if (settled) return;
    settled = true;
    socket.destroy();
    if (error) reject(error);
    else resolve(value);
  };

  socket.setTimeout(timeoutMs, () => finish(new Error('Redis connection timed out')));
  socket.once('error', (error) => finish(error));
  socket.once(parsedUrl.protocol === 'rediss:' ? 'secureConnect' : 'connect', () => {
    socket.write(commands.map(encodeCommand).join(''));
  });
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    try {
      while (replies.length < expectedReplies) {
        const parsed = parseReply(buffer, 0);
        if (!parsed) break;
        replies.push(parsed.value);
        buffer = buffer.subarray(parsed.offset);
      }
      if (replies.length === expectedReplies) finish(null, replies[replies.length - 1]);
    } catch (error) {
      finish(error);
    }
  });
  socket.once('end', () => finish(new Error('Redis connection closed before a reply was received')));
});

module.exports = { executeRedisCommand, encodeCommand, parseReply };

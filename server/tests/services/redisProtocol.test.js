import { describe, expect, it } from 'vitest';
const { encodeCommand, parseReply } = require('../../src/services/redisProtocol');

describe('Redis RESP protocol helpers', () => {
  it('encodes Redis commands as RESP arrays', () => {
    expect(encodeCommand(['SET', 'cache:key', 'hello world', 'EX', 30])).toBe(
      '*5\r\n$3\r\nSET\r\n$9\r\ncache:key\r\n$11\r\nhello world\r\n$2\r\nEX\r\n$2\r\n30\r\n'
    );
  });

  it('parses simple string and integer replies', () => {
    expect(parseReply(Buffer.from('+OK\r\n'))).toEqual({ value: 'OK', offset: 5 });
    expect(parseReply(Buffer.from(':42\r\n'))).toEqual({ value: 42, offset: 5 });
  });

  it('parses bulk strings and null replies', () => {
    expect(parseReply(Buffer.from('$5\r\nhello\r\n'))).toEqual({ value: 'hello', offset: 11 });
    expect(parseReply(Buffer.from('$-1\r\n'))).toEqual({ value: null, offset: 5 });
  });

  it('waits for an incomplete reply', () => {
    expect(parseReply(Buffer.from('$5\r\nhel'))).toBeNull();
  });

  it('surfaces Redis error replies', () => {
    expect(() => parseReply(Buffer.from('-NOAUTH invalid password\r\n'))).toThrow(
      'Redis command error: NOAUTH invalid password'
    );
  });
});

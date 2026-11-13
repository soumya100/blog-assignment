const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

const MIME_EXTENSIONS = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
});
const MAX_BYTES = 5 * 1024 * 1024;

const uploadImage = async (req, res, next) => {
  try {
    const { dataUrl } = req.body || {};
    if (typeof dataUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'Image data is required' });
    }
    const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
    if (!match) {
      return res.status(415).json({ success: false, message: 'Only JPEG, PNG, WebP and GIF images are supported' });
    }
    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > MAX_BYTES) {
      return res.status(413).json({ success: false, message: 'Image must be smaller than 5 MB' });
    }
    const extension = MIME_EXTENSIONS[mimeType];
    const filename = `${crypto.randomBytes(18).toString('hex')}${extension}`;
    const uploadDirectory = path.resolve(env.UPLOAD_DIR);
    await fs.mkdir(uploadDirectory, { recursive: true, mode: 0o750 });
    await fs.writeFile(path.join(uploadDirectory, filename), buffer, { flag: 'wx', mode: 0o640 });
    return res.status(201).json({
      success: true,
      message: 'Image uploaded',
      data: { url: `/uploads/${filename}`, mimeType, size: buffer.length },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { uploadImage };

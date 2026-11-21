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
    const signatures = {
      'image/jpeg': buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255,
      'image/png': buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'image/webp': buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP',
      'image/gif': ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii')),
    };
    if (!signatures[mimeType]) return res.status(415).json({ success: false, message: 'Image content does not match its declared format' });
    const extension = MIME_EXTENSIONS[mimeType];
    const filename = `${crypto.randomBytes(18).toString('hex')}${extension}`;

    if (env.NODE_ENV === 'production') {
      if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        return res.status(503).json({ success: false, message: 'Image storage is not configured' });
      }

      const form = new FormData();
      form.append('file', new Blob([buffer], { type: mimeType }), filename);
      form.append('public_id', filename.replace(/\\.[^.]+$/, ''));
      form.append('folder', 'blog-platform');
      form.append('overwrite', 'false');

      const credentials = Buffer.from(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`).toString('base64');
      const uploadUrl = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}` },
        body: form,
        signal: AbortSignal.timeout(15000),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || typeof payload?.secure_url !== 'string') {
        // Never return provider response details or credentials to the caller.
        return res.status(502).json({ success: false, message: 'Image storage provider rejected the upload' });
      }

      const assetUrl = new URL(payload.secure_url);
      if (assetUrl.protocol !== 'https:' || assetUrl.hostname !== 'res.cloudinary.com') {
        return res.status(502).json({ success: false, message: 'Image storage returned an invalid asset URL' });
      }

      return res.status(201).json({
        success: true,
        message: 'Image uploaded',
        data: { url: assetUrl.toString(), mimeType, size: buffer.length },
      });
    }

    // Local filesystem storage is retained for development and automated tests only.
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

const crypto = require('crypto');
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const env = require('../config/env');
const { getTransporter } = require('../utils/emailService');
const { successResponse } = require('../utils/apiResponse');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = await getTransporter();
  const from = env.EMAIL_FROM || env.SMTP_FROM || env.EMAIL_USER || env.SMTP_USER;
  return transporter.sendMail({ from: from ? `"DevLog Newsletter" <${from}>` : '"DevLog Newsletter" <newsletter@devlog.local>', to, subject, text, html });
};

const subscribe = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const consent = req.body?.consent === true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !consent) {
      return res.status(400).json({ success: false, message: 'Enter a valid email and provide newsletter consent.' });
    }
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    await NewsletterSubscriber.findOneAndUpdate(
      { email },
      { $set: { status: 'pending', confirmationTokenHash: hashToken(confirmationToken), unsubscribeTokenHash: hashToken(unsubscribeToken), confirmedAt: null } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    const base = (env.CLIENT_URL || '').split(',')[0].trim().replace(/\/$/, '');
    const confirmUrl = `${base}/newsletter/confirm?token=${confirmationToken}`;
    const unsubscribeUrl = `${base}/newsletter/unsubscribe?token=${unsubscribeToken}`;
    try {
      await sendEmail({ to: email, subject: 'Confirm your DevLog newsletter subscription', text: `Confirm your subscription: ${confirmUrl}\n\nTo unsubscribe later: ${unsubscribeUrl}`, html: `<p>Confirm your DevLog newsletter subscription:</p><p><a href="${confirmUrl}">Confirm subscription</a></p><p>If you did not request this, ignore this email.</p><p><a href="${unsubscribeUrl}">Unsubscribe</a></p>` });
    } catch (error) {
      await NewsletterSubscriber.deleteOne({ email, confirmationTokenHash: hashToken(confirmationToken) });
      throw error;
    }
    return successResponse(res, 202, 'If email delivery is configured, a confirmation message has been sent.');
  } catch (error) { next(error); }
};

const confirm = async (req, res, next) => {
  try {
    const token = String(req.query.token || '');
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ success: false, message: 'Invalid confirmation link' });
    const subscriber = await NewsletterSubscriber.findOneAndUpdate(
      { confirmationTokenHash: hashToken(token), status: 'pending' },
      { $set: { status: 'subscribed', confirmedAt: new Date(), confirmationTokenHash: null } },
      { new: true }
    );
    if (!subscriber) return res.status(400).json({ success: false, message: 'Confirmation link is invalid or expired' });
    return successResponse(res, 200, 'Newsletter subscription confirmed');
  } catch (error) { next(error); }
};

const unsubscribe = async (req, res, next) => {
  try {
    const token = String(req.query.token || req.body?.token || '');
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ success: false, message: 'Invalid unsubscribe link' });
    const subscriber = await NewsletterSubscriber.findOneAndUpdate(
      { unsubscribeTokenHash: hashToken(token) },
      { $set: { status: 'unsubscribed', confirmationTokenHash: null } },
      { new: true }
    );
    if (!subscriber) return res.status(404).json({ success: false, message: 'Subscription not found' });
    return successResponse(res, 200, 'You have been unsubscribed');
  } catch (error) { next(error); }
};

const sendCampaign = async (req, res, next) => {
  try {
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();
    if (subject.length < 3 || subject.length > 160 || message.length < 10 || message.length > 10000) {
      return res.status(400).json({ success: false, message: 'Subject and message lengths are invalid.' });
    }
    const subscribers = await NewsletterSubscriber.find({ status: 'subscribed' }).select('email').lean();
    const transporter = await getTransporter();
    const from = env.EMAIL_FROM || env.SMTP_FROM || env.EMAIL_USER || env.SMTP_USER;
    let sent = 0;
    for (const subscriber of subscribers) {
      await transporter.sendMail({ from: from ? `"DevLog Newsletter" <${from}>` : '"DevLog Newsletter" <newsletter@devlog.local>', to: subscriber.email, subject, text: message });
      sent += 1;
    }
    return successResponse(res, 200, 'Newsletter campaign sent', { sent });
  } catch (error) { next(error); }
};

module.exports = { subscribe, confirm, unsubscribe, sendCampaign };

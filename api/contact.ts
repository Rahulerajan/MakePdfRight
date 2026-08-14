import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { getOwnerId } from '../server/apiUtils.js';
import { DistributedRateLimiter } from '../server/services/DistributedRateLimiter.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ownerId = getOwnerId(req, res);
  const rateCheck = await DistributedRateLimiter.checkRateLimit(ownerId, 'general', 'contact');
  if (!rateCheck.allowed) {
    return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);
  }

  const { name, email, message, honeypot } = req.body || {};

  // Honeypot check for bots
  if (honeypot) {
    return res.status(200).json({ success: true, message: 'Message sent successfully' });
  }

  // Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY environment variable is missing');
    return res.status(500).json({ error: 'Email service is not configured on the server.' });
  }

  try {
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: 'MakePDFRight Contact <onboarding@resend.dev>',
      to: ['makepdfright@gmail.com'],
      replyTo: email.trim(),
      subject: `New Contact Form Submission from ${name.trim()}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded-radius: 12px; color: #1e293b;">
          <h2 style="color: #e5322d; margin-top: 0; font-size: 20px;">New Message from MakePDFRight</h2>
          <p style="margin: 8px 0;"><strong>Sender Name:</strong> ${escapeHtml(name.trim())}</p>
          <p style="margin: 8px 0;"><strong>Sender Email:</strong> <a href="mailto:${escapeHtml(email.trim())}">${escapeHtml(email.trim())}</a></p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-weight: bold; margin-bottom: 8px;">Message:</p>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; border: 1px solid #cbd5e1;">${escapeHtml(message.trim())}</div>
        </div>
      `,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return res.status(500).json({ error: result.error.message || 'Failed to send email via Resend.' });
    }

    return res.status(200).json({ success: true, id: result.data?.id });
  } catch (error: any) {
    console.error('Contact handler error:', error);
    return res.status(500).json({ error: error?.message || 'An unexpected server error occurred.' });
  }
}

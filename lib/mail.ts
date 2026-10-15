import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Sending e-mail through the organization's Gmail account (SMTP with an
 * "app password"). Server only. Nothing is sent until both variables are set
 * in Vercel: GMAIL_USER (the address) and GMAIL_APP_PASSWORD. Never import
 * this file from a client component.
 * Gmail's limit is ~500 messages a day — far above this system's needs.
 */

export function isMailConfigured(): boolean {
  return !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
}

let transport: Transporter | null = null;

function getTransport(): Transporter {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error('Mail env vars missing: GMAIL_USER / GMAIL_APP_PASSWORD');
  transport ??= nodemailer.createTransport({
    service: 'gmail',
    // Google shows app passwords in groups of 4 ("abcd efgh …"); spaces are not part of it.
    auth: { user, pass: pass.replace(/\s+/g, '') },
  });
  return transport;
}

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Sends one message. Returns an error message instead of throwing. Logs no addresses. */
export async function sendMail(mail: Mail): Promise<{ error: string | null }> {
  try {
    await getTransport().sendMail({
      from: { name: 'שמחת רבקה', address: process.env.GMAIL_USER! },
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return { error: null };
  } catch (e) {
    console.error('[sendMail] failed:', (e as Error).message);
    return { error: (e as Error).message };
  }
}

/** Escapes text for HTML (names, notes and addresses come from users). */
export function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** The common RTL frame of every message: berry header, white card. */
export function frame(title: string, body: string): string {
  return `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#FBF5F8;font-family:Arial,Helvetica,sans-serif;color:#2A1A22">
<div style="max-width:560px;margin:0 auto;padding:20px 12px">
  <div style="background:linear-gradient(115deg,#4A0824,#8E0E46 55%,#D3195F);border-radius:20px 20px 0 0;padding:22px 24px;color:#fff">
    <div style="font-size:13px;opacity:.85">ארגון שמחת רבקה</div>
    <div style="font-size:22px;font-weight:bold;margin-top:4px">${esc(title)}</div>
  </div>
  <div style="background:#fff;border:1px solid #F2E4EB;border-top:0;border-radius:0 0 20px 20px;padding:22px 24px;font-size:16px;line-height:1.7">
    ${body}
  </div>
</div></body></html>`;
}

/** A big pill button for e-mail. */
export function mailButton(href: string, label: string, primary = true): string {
  const look = primary ? 'background:#C8155B;color:#fff' : 'background:#FAF2F6;color:#2A1A22';
  return `<a href="${esc(href)}" style="display:inline-block;${look};text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;margin:4px">${esc(label)}</a>`;
}

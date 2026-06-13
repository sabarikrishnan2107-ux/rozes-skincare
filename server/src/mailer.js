import nodemailer from 'nodemailer';

/**
 * SMTP-based mailer for stock alerts.
 *
 * Configure via server/.env:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=false          # true for port 465, false for 587 (STARTTLS)
 *   SMTP_USER=you@gmail.com
 *   SMTP_PASS=your-app-password # Gmail App Password, NOT your login password
 *   ALERT_FROM="Rozes Stock <you@gmail.com>"  # optional; defaults to SMTP_USER
 *
 * If SMTP_HOST/USER/PASS are missing, email sending is disabled and the app
 * keeps working (alerts still appear in-app). A one-time warning is logged.
 */

let transporter = null;
let warned = false;

export function isEmailEnabled() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  return transporter;
}

const SEVERITY_LABEL = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info'
};

function buildSubject(alerts) {
  const crit = alerts.filter((a) => a.severity === 'critical').length;
  const n = alerts.length;
  if (crit > 0) {
    return `Rozes Skincare stock alert: ${crit} critical of ${n} item${n === 1 ? '' : 's'}`;
  }
  return `Rozes Skincare stock alert: ${n} item${n === 1 ? '' : 's'} low on stock`;
}

function appUrl() {
  return process.env.APP_URL?.trim() || '';
}

function buildText(alerts) {
  const lines = alerts.map((a) => {
    const label = SEVERITY_LABEL[a.severity] || a.severity;
    return `[${label}] ${a.title}\n  ${a.message}`;
  });
  const footer = ['', 'This is an automated message from the Rozes Skincare stock system.'];
  if (appUrl()) footer.unshift('', `Open the dashboard: ${appUrl()}`);
  return [
    'Rozes Skincare — Stock Alert',
    '============================',
    '',
    ...lines,
    ...footer
  ].join('\n');
}

function buildHtml(alerts) {
  const rows = alerts
    .map((a) => {
      const color =
        a.severity === 'critical' ? '#dc2626' : a.severity === 'warning' ? '#ea580c' : '#2563eb';
      const label = SEVERITY_LABEL[a.severity] || a.severity;
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;white-space:nowrap;color:${color};font-weight:600;">${label}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;">
            <div style="font-weight:600;color:#111;">${escapeHtml(a.title)}</div>
            <div style="color:#444;font-size:14px;margin-top:2px;">${escapeHtml(a.message)}</div>
          </td>
        </tr>`;
    })
    .join('');

  const button = appUrl()
    ? `<p style="margin:20px 0 0;">
        <a href="${appUrl()}" style="background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block;font-size:14px;">Open dashboard</a>
      </p>`
    : '';

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;">
    <h2 style="color:#111;margin:0 0 4px;">Rozes Skincare — Stock Alert</h2>
    <p style="color:#666;margin:0 0 16px;font-size:14px;">${alerts.length} item${alerts.length === 1 ? '' : 's'} require your attention.</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      <tbody>${rows}</tbody>
    </table>
    ${button}
    <p style="color:#999;font-size:12px;margin-top:24px;">Automated message from the Rozes Skincare stock system.</p>
  </div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Send a stock-alert email. Never throws — logs and resolves false on failure
 * so a mail problem can't break the sale-recording request.
 *
 * @param {string} to recipient email
 * @param {Array<{type:string,severity:string,title:string,message:string,product_name?:string}>} alerts
 * @returns {Promise<boolean>} true if sent
 */
export async function sendStockAlertEmail(to, alerts) {
  if (!alerts || alerts.length === 0) return false;
  if (!isEmailEnabled()) {
    if (!warned) {
      console.warn('[mailer] SMTP not configured — stock alert emails disabled. Set SMTP_HOST/SMTP_USER/SMTP_PASS in server/.env.');
      warned = true;
    }
    return false;
  }
  if (!to) {
    console.warn('[mailer] No recipient email; skipping stock alert email.');
    return false;
  }

  try {
    const fromAddr = process.env.SMTP_USER;
    await getTransporter().sendMail({
      from: process.env.ALERT_FROM || fromAddr,
      to,
      replyTo: fromAddr,
      subject: buildSubject(alerts),
      text: buildText(alerts),
      html: buildHtml(alerts),
      headers: {
        'List-Unsubscribe': `<mailto:${fromAddr}?subject=unsubscribe>`,
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All'
      }
    });
    console.log(`[mailer] Stock alert email sent to ${to} (${alerts.length} alert${alerts.length === 1 ? '' : 's'}).`);
    return true;
  } catch (err) {
    console.error('[mailer] Failed to send stock alert email:', err.message);
    return false;
  }
}

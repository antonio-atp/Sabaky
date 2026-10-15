import "server-only";
import { env } from "../../env";
import type { EmailMessage } from "./index";

/** HTML-escape every interpolated value — email clients render HTML. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${esc(cta.url)}" style="background:#0a8c6f;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">${esc(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f6f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f1f1b">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:32px">
  <tr><td><div style="font-size:22px;font-weight:800;color:#0a8c6f;letter-spacing:-0.5px">sabaky</div>
  <h1 style="font-size:20px;margin:24px 0 12px">${esc(title)}</h1>${bodyHtml}${button}
  <p style="font-size:12px;color:#5b6b66;margin-top:32px">You are receiving this email because of activity on your Sabaky account. Manage notification preferences in your account settings.</p>
  </td></tr></table></td></tr></table></body></html>`;
}

const url = (path: string) => new URL(path, env().APP_URL).toString();

export const templates = {
  verifyEmail(to: string, name: string, token: string): EmailMessage {
    const link = url(`/verify-email?token=${encodeURIComponent(token)}`);
    return {
      to,
      category: "auth.verify",
      subject: "Confirm your Sabaky email address",
      html: layout(`Welcome, ${name}!`, `<p>Please confirm your email address. This link expires in 24 hours.</p>`, {
        label: "Verify email",
        url: link,
      }),
      text: `Welcome, ${name}! Confirm your email: ${link} (expires in 24 hours)`,
    };
  },

  passwordReset(to: string, token: string): EmailMessage {
    const link = url(`/reset-password?token=${encodeURIComponent(token)}`);
    return {
      to,
      category: "auth.reset",
      subject: "Reset your Sabaky password",
      html: layout(
        "Password reset requested",
        `<p>Use the button below to choose a new password. The link expires in 30 minutes and can be used once.</p><p>If you didn't request this, you can ignore this email — your password won't change.</p>`,
        { label: "Reset password", url: link },
      ),
      text: `Reset your password: ${link} (expires in 30 minutes). If you didn't request this, ignore this email.`,
    };
  },

  notification(to: string, title: string, body: string, href?: string | null): EmailMessage {
    return {
      to,
      category: "notification",
      subject: title,
      html: layout(title, `<p>${esc(body)}</p>`, href ? { label: "View details", url: url(href) } : undefined),
      text: `${title}\n\n${body}${href ? `\n\n${url(href)}` : ""}`,
    };
  },
};

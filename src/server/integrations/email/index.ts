import "server-only";
import { env } from "../../env";
import { logger } from "../../logger";

/**
 * Email port. `console` prints messages to the server log (development);
 * `resend` sends through the Resend HTTP API. Additional adapters (SES,
 * Postmark, SMTP) implement the same interface.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Tag used for analytics / suppression lists. */
  category: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    logger.info("📧 email (console provider)", { to: message.to, subject: message.subject, category: message.category });
    console.log(`\n──── EMAIL to ${message.to} ────\n${message.subject}\n\n${message.text}\n────────────────────────\n`);
  }
}

class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}
  async send(message: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        tags: [{ name: "category", value: message.category }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Email provider error ${res.status}`);
  }
}

let provider: EmailProvider | undefined;
export function email(): EmailProvider {
  if (provider) return provider;
  const e = env();
  provider =
    e.EMAIL_PROVIDER === "resend" && e.RESEND_API_KEY
      ? new ResendEmailProvider(e.RESEND_API_KEY, e.EMAIL_FROM)
      : new ConsoleEmailProvider();
  return provider;
}

import "server-only";
import { z } from "zod";

/**
 * Validated server environment. Importing this module from client code fails
 * the build (`server-only`), so secrets can never leak into browser bundles.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  /** Connections per app instance. Use 1 with the single-connection "npx prisma dev" database. */
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  DATA_ENCRYPTION_KEY: z.string().optional().default(""),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),

  PAYMENT_PROVIDER: z.enum(["mock", "stripe"]).default("mock"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),

  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: z.string().default("Sabaky <no-reply@sabaky.example>"),
  RESEND_API_KEY: z.string().optional().default(""),

  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_REGION: z.string().optional().default("eu-west-1"),
  S3_BUCKET: z.string().optional().default(""),
  S3_ACCESS_KEY_ID: z.string().optional().default(""),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_CDN_URL: z.string().optional().default(""),

  RATE_LIMIT_STORE: z.enum(["memory", "redis"]).default("memory"),
  REDIS_URL: z.string().optional().default(""),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid server environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production") {
    if (env.AUTH_SECRET.startsWith("replace-with")) throw new Error("AUTH_SECRET must be set in production");
    if (env.PAYMENT_PROVIDER === "stripe" && !env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY missing");
    if (env.STORAGE_PROVIDER === "local") console.warn("[env] STORAGE_PROVIDER=local is not suitable for production");
  }
  return env;
}

let cached: z.infer<typeof schema> | undefined;
export function env() {
  cached ??= load();
  return cached;
}

export const isProd = () => env().NODE_ENV === "production";

import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodType } from "zod";
import { AppError } from "./errors";
import { clientIpFrom } from "./request";
import { getCurrentUser, type SessionUser } from "../auth/session";
import { assertRole } from "../auth/guards";
import { rateLimit, type RateLimitRule } from "../security/rate-limit";
import { verifyCsrf } from "../security/csrf";
import { hmac } from "../security/crypto";
import { logger } from "../logger";
import type { Role } from "@/generated/prisma/client";

/**
 * Uniform REST handler used by every `/api/v1` route. Centralises:
 * authentication, RBAC, CSRF, rate limiting, body/query validation, body-size
 * limits and error mapping. Response envelope: `{ data }` | `{ error }`.
 * The same API serves the web app and future iOS/Android clients.
 */

type Access = "public" | "user" | Role[];

interface Options<B extends ZodType | undefined, Q extends ZodType | undefined> {
  auth?: Access;
  body?: B;
  query?: Q;
  rateLimit?: RateLimitRule;
  /** Max JSON body size in bytes (default 64 KiB). */
  maxBodyBytes?: number;
}

export interface ApiContext<B, Q, P> {
  req: NextRequest;
  user: SessionUser | null;
  body: B;
  query: Q;
  params: P;
  ip: string;
  ipHash: string;
}

type Infer<T> = T extends ZodType ? z.output<T> : undefined;
type AuthedUser<A> = A extends "public" ? SessionUser | null : SessionUser;

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function api<
  P = Record<string, string>,
  B extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  A extends Access = "public",
>(
  options: Options<B, Q> & { auth?: A },
  handler: (ctx: Omit<ApiContext<Infer<B>, Infer<Q>, P>, "user"> & { user: AuthedUser<A> }) => Promise<unknown>,
) {
  return async (req: NextRequest, context: { params: Promise<P> }): Promise<Response> => {
    const ip = clientIpFrom(req.headers);
    const ipHash = hmac(ip);
    try {
      // Bearer tokens and the native-client header cannot be attached by a cross-site
      // browser request without a CORS preflight (which we never grant) → no CSRF risk.
      const isBearer = req.headers.get("authorization")?.startsWith("Bearer ") ?? false;
      const isNative = req.headers.get("x-sabaky-client") === "native";
      if (MUTATING.has(req.method) && !isBearer && !isNative) verifyCsrf(req);

      const user = await getCurrentUser();
      const access = options.auth ?? "public";
      if (access === "user") assertRole(user);
      else if (Array.isArray(access)) assertRole(user, ...access);

      if (options.rateLimit) {
        const rl = await rateLimit(options.rateLimit, user?.id ?? ipHash);
        if (!rl.ok) {
          throw new AppError("RATE_LIMITED", "errors.RATE_LIMITED", undefined, {
            "Retry-After": String(rl.retryAfterSeconds),
          });
        }
      }

      const body = options.body ? await parseBody(req, options.body, options.maxBodyBytes ?? 65_536) : undefined;
      const query = options.query
        ? validate(options.query, Object.fromEntries(groupSearchParams(req.nextUrl.searchParams)))
        : undefined;

      const result = await handler({
        req,
        user: user as AuthedUser<A>,
        body: body as Infer<B>,
        query: query as Infer<Q>,
        params: await context.params,
        ip,
        ipHash,
      });

      if (result instanceof Response) return result;
      return NextResponse.json({ data: result ?? null }, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return errorResponse(error, req);
    }
  };
}

function groupSearchParams(sp: URLSearchParams) {
  const out = new Map<string, string | string[]>();
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    out.set(key, all.length > 1 ? all : all[0]);
  }
  return out;
}

async function parseBody(req: NextRequest, schema: ZodType, maxBytes: number) {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new AppError("BAD_REQUEST", "errors.PAYLOAD_TOO_LARGE");
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new AppError("BAD_REQUEST", "errors.UNSUPPORTED_MEDIA");
  const raw = await req.text();
  if (raw.length > maxBytes) throw new AppError("BAD_REQUEST", "errors.PAYLOAD_TOO_LARGE");
  let json: unknown;
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    throw new AppError("BAD_REQUEST", "errors.INVALID_JSON");
  }
  return validate(schema, json);
}

export function validate<T extends ZodType>(schema: T, input: unknown): z.output<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message.startsWith("validation.") ? issue.message : "validation.invalid";
    }
    throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", fields);
  }
  return parsed.data;
}

export function errorResponse(error: unknown, req?: NextRequest) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, fields: error.fields } },
      { status: error.status, headers: { "Cache-Control": "no-store", ...error.headers } },
    );
  }
  logger.error("Unhandled API error", { path: req?.nextUrl.pathname, method: req?.method, error });
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "errors.INTERNAL" } },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

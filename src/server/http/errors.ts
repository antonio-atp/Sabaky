/**
 * Typed application errors. Route handlers throw these; the API wrapper maps
 * them to consistent JSON responses. Unknown errors become opaque 500s so
 * internals (stack traces, SQL) are never exposed to clients.
 */
export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "CSRF_FAILED"
  | "ACCOUNT_LOCKED"
  | "PAYMENT_FAILED"
  | "OUT_OF_STOCK"
  | "UNPROCESSABLE"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  CSRF_FAILED: 403,
  ACCOUNT_LOCKED: 423,
  PAYMENT_FAILED: 402,
  OUT_OF_STOCK: 409,
  UNPROCESSABLE: 422,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    /** i18n key (errors.*) or a safe, user-facing message. */
    message: string = `errors.${code}`,
    readonly fields?: Record<string, string>,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.status = STATUS[code];
  }
}

export const notFound = (message = "errors.NOT_FOUND") => new AppError("NOT_FOUND", message);
export const forbidden = (message = "errors.FORBIDDEN") => new AppError("FORBIDDEN", message);
export const badRequest = (message = "errors.BAD_REQUEST") => new AppError("BAD_REQUEST", message);
export const conflict = (message = "errors.CONFLICT") => new AppError("CONFLICT", message);
export const unprocessable = (message: string) => new AppError("UNPROCESSABLE", message);

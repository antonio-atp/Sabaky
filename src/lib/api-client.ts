"use client";

import { COOKIE, CSRF_HEADER } from "./cookies";
import type { ApiError } from "@/shared/types";

/**
 * Browser API client for /api/v1. Adds the CSRF double-submit header and
 * normalises the `{ data } | { error }` envelope into return / throw.
 */
export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

function readCookie(name: string) {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const method = init.method ?? (init.body !== undefined ? "POST" : "GET");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers[CSRF_HEADER] = readCookie(COOKIE.csrf);

  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      signal: init.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiClientError(0, "NETWORK", "errors.NETWORK");
  }

  const payload = (await res.json().catch(() => null)) as { data?: T; error?: ApiError } | null;
  if (!res.ok || !payload || payload.error) {
    const err = payload?.error;
    throw new ApiClientError(res.status, err?.code ?? "INTERNAL", err?.message ?? "errors.INTERNAL", err?.fields);
  }
  return payload.data as T;
}

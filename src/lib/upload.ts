"use client";

import { ApiClientError } from "./api-client";
import { COOKIE, CSRF_HEADER } from "./cookies";

/** Multipart upload to the secure image pipeline (/api/v1/uploads). */
export async function uploadImage(file: File, purpose: "review" | "product" | "store"): Promise<string> {
  const csrf = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE.csrf}=`))?.split("=")[1] ?? "";
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`/api/v1/uploads?purpose=${purpose}`, { method: "POST", body, headers: { [CSRF_HEADER]: decodeURIComponent(csrf) } });
  const json = await res.json();
  if (!res.ok) throw new ApiClientError(res.status, json.error?.code ?? "INTERNAL", json.error?.message ?? "errors.INTERNAL");
  return json.data.url as string;
}

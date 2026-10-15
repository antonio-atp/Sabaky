import { storage } from "@/server/integrations/storage";

/**
 * Serves publicly-readable uploads in local development. In production the
 * CDN serves the bucket directly and this route is not used. Only the
 * `uploads/` prefix is readable — private prefixes (KYB docs) never are.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const path = key.join("/");
  if (!path.startsWith("uploads/") || path.includes("..")) return new Response("Not found", { status: 404 });
  const file = await storage().get(path).catch(() => null);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

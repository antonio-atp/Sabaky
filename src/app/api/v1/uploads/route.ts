import sharp from "sharp";
import { z } from "zod";
import { api } from "@/server/http/api";
import { AppError } from "@/server/http/errors";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { randomToken } from "@/server/security/crypto";
import { storage } from "@/server/integrations/storage";
import { audit } from "@/server/services/audit";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 2000;

/** Magic-byte sniffing — never trust the client-declared MIME type or extension. */
function sniff(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

const query = z.object({ purpose: z.enum(["product", "review", "store"]) });

/**
 * Secure image upload pipeline:
 *  size cap → magic-byte allow-list (no SVG/HTML) → decode & re-encode with
 *  sharp (strips EXIF/GPS metadata and any polyglot payload) → random key →
 *  object storage. Product/store images require the seller role.
 */
export const POST = api({ auth: "user", query, rateLimit: RATE_LIMITS.upload }, async ({ req, user, query, ipHash }) => {
  if ((query.purpose === "product" || query.purpose === "store") && !user.sellerId) throw new AppError("FORBIDDEN");
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 64_000) throw new AppError("BAD_REQUEST", "errors.FILE_TOO_LARGE");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new AppError("BAD_REQUEST", "errors.FILE_MISSING");
  if (file.size > MAX_BYTES) throw new AppError("BAD_REQUEST", "errors.FILE_TOO_LARGE");

  const input = Buffer.from(await file.arrayBuffer());
  if (!sniff(input)) throw new AppError("BAD_REQUEST", "errors.FILE_TYPE");

  let output: Buffer;
  let meta: { width: number; height: number };
  try {
    const result = await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate() // honour EXIF orientation before metadata is stripped
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    output = result.data;
    meta = result.info;
  } catch {
    throw new AppError("BAD_REQUEST", "errors.FILE_TYPE");
  }

  const now = new Date();
  const key = `uploads/${query.purpose}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomToken(16)}.webp`;
  const { url } = await storage().put(key, output, "image/webp");
  await audit("upload.image", { type: "Upload", id: key }, { actorId: user.id, ipHash, metadata: { purpose: query.purpose, bytes: output.length } });
  return { url, width: meta.width, height: meta.height };
});

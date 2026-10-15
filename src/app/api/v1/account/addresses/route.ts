import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { addressSchema } from "@/shared/validation";
import { createAddress, listAddresses } from "@/server/services/account";

export const GET = api({ auth: "user" }, async ({ user }) => listAddresses(user.id));

export const POST = api({ auth: "user", body: addressSchema, rateLimit: RATE_LIMITS.write }, async ({ user, body }) => createAddress(user.id, body));

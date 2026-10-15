import { api } from "@/server/http/api";

export const GET = api({}, async ({ user }) =>
  user
    ? { id: user.id, email: user.email, name: user.name, roles: user.roles, emailVerified: user.emailVerified, locale: user.locale, currency: user.currency, sellerId: user.sellerId }
    : null,
);

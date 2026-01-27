import { apiKey, bearer } from "better-auth/plugins";

const defaultBaseUrl = "http://localhost:5173";

export const authBaseOptions = {
  baseURL: process.env.BETTER_AUTH_BASE_URL ?? defaultBaseUrl,
  basePath: "/api/auth",
  secret:
    process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me-please-32-chars",
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    apiKey({
      enableSessionForAPIKeys: true,
      customAPIKeyGetter(ctx) {
        const authHeader =
          ctx.headers?.get("authorization") ??
          ctx.request?.headers.get("authorization");
        if (!authHeader) {
          return undefined;
        }
        const [scheme, token] = authHeader.split(" ");
        if (!token) {
          return authHeader;
        }
        if (scheme.toLowerCase() === "bearer") {
          return token;
        }
        return authHeader;
      },
    }),
    bearer(),
  ],
} as const;

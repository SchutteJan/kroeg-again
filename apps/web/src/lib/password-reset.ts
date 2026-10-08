import { OttType } from "@kroegen/one-time-password-fragment";
import { createAuthServer } from "./auth-server";
import { getConfig } from "./config";
import type { PostgresPool } from "./db";
import { createOtpServer } from "./otp-server";

const RESET_TOKEN_TTL_MINUTES = 30;

/**
 * Every reset request takes at least this long, so response time doesn't reveal whether the email
 * is registered. Must stay well above the time the real work takes. Rate limiting is handled
 * outside the app.
 */
const MIN_REQUEST_DURATION_MS = 500;

interface ServiceRunner {
  inContext<T>(callback: () => T): T;
}

/**
 * Fragno fragment services return lazy tx descriptors, not plain promises — they only resolve
 * when run inside a handler context via `handlerTx().withServiceCalls(...).execute()`. This runs
 * a single service call the same way the fragments' own route handlers do internally, for use
 * from our own routes where there's no fragno route handler already providing that context.
 */
export function callService<T>(fragment: ServiceRunner, call: () => unknown): Promise<T> {
  return fragment.inContext(
    async function (this: {
      handlerTx(): {
        withServiceCalls(callback: () => unknown[]): { execute(): Promise<[T]> };
      };
    }) {
      const [result] = await this.handlerTx()
        .withServiceCalls(() => [call()])
        .execute();
      return result;
    },
  );
}

/**
 * Generates a reset token for the account with this email, if there is one. Callers must respond
 * the same way whether or not the email is registered, so this can't be used to enumerate
 * accounts.
 */
export async function requestPasswordReset(pool: PostgresPool, email: string): Promise<void> {
  const startedAt = Date.now();
  try {
    await sendResetLink(pool, email);
  } finally {
    const remaining = MIN_REQUEST_DURATION_MS - (Date.now() - startedAt);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }
}

async function sendResetLink(pool: PostgresPool, email: string): Promise<void> {
  const authFragment = createAuthServer(pool);
  const user = await callService<{ id: string; email: string } | null>(authFragment, () =>
    authFragment.services.getUserByEmail(email),
  );
  if (!user) {
    return;
  }

  const otpFragment = createOtpServer(pool);
  const { token } = await callService<{ token: string }>(otpFragment, () =>
    otpFragment.services.generateToken(
      user.id,
      OttType.enum.password_reset,
      RESET_TOKEN_TTL_MINUTES,
    ),
  );

  const resetUrl = `${getConfig().publicBaseUrl}/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
  // TODO: send this by email instead of logging it
  console.log(`Password reset link for ${email}: ${resetUrl}`);
}

export type ConfirmPasswordResetResult =
  | { ok: true }
  | { ok: false; error: "invalid_or_expired_token" | "reset_failed" };

export async function confirmPasswordReset(
  pool: PostgresPool,
  { email, token, newPassword }: { email: string; token: string; newPassword: string },
): Promise<ConfirmPasswordResetResult> {
  const authFragment = createAuthServer(pool);
  const user = await callService<{ id: string; email: string } | null>(authFragment, () =>
    authFragment.services.getUserByEmail(email),
  );
  if (!user) {
    return { ok: false, error: "invalid_or_expired_token" };
  }

  const otpFragment = createOtpServer(pool);
  const validation = await callService<{
    valid: boolean;
    error?: "token_expired" | "token_invalid";
  }>(otpFragment, () =>
    otpFragment.services.validateToken(user.id, token, OttType.enum.password_reset),
  );
  if (!validation.valid) {
    return { ok: false, error: "invalid_or_expired_token" };
  }

  const session = await callService<{
    id: string;
    userId: string;
    expiresAt: Date;
  }>(authFragment, () => authFragment.services.createSession(user.id));

  const changeResult = await authFragment.callRoute("POST", "/change-password", {
    query: { sessionId: session.id },
    body: { newPassword },
  });

  await callService<boolean>(authFragment, () =>
    authFragment.services.invalidateSession(session.id),
  );

  // TODO: better error handling
  if (changeResult.type !== "json" || !changeResult.data.success) {
    return { ok: false, error: "reset_failed" };
  }

  return { ok: true };
}

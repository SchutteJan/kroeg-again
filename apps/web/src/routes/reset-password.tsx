import { Title } from "@solidjs/meta";
import { A, action, useSearchParams, useSubmission } from "@solidjs/router";
import { Match, Show, Switch } from "solid-js";
import { getRequestEvent } from "solid-js/web";
import { z } from "zod";
import { Alert } from "~/components/Alert";
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { PageContent } from "~/components/PageLayout";
import { TextInput } from "~/components/TextInput";
import { confirmPasswordReset } from "~/lib/password-reset";

// Matches the auth fragment's /change-password limits.
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 100;

const ResetPasswordInput = z.object({
  email: z.email(),
  token: z.string().min(1),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});

const resetPassword = action(async (formData: FormData) => {
  "use server";
  const event = getRequestEvent();
  if (!event) {
    throw new Error("resetPassword requires a request event");
  }
  const input = ResetPasswordInput.parse(Object.fromEntries(formData));
  return confirmPasswordReset(event.locals.pool, input);
}, "reset-password");

export default function ResetPassword() {
  const [searchParams] = useSearchParams<{ email: string; token: string }>();

  const email = () => searchParams.email;
  const token = () => searchParams.token;

  const submission = useSubmission(resetPassword);

  const succeeded = () => submission.result?.ok === true;

  const linkInvalid = () =>
    !email() ||
    !token() ||
    (submission.result?.ok === false && submission.result.error === "invalid_or_expired_token");

  return (
    <PageContent class="flex items-start justify-center pt-16">
      <Title>Reset Password — Kroegen</Title>
      <Card class="w-full max-w-sm p-6">
        <h1 class="text-ink-900 mb-6 text-2xl font-bold">Set a new password</h1>
        <Switch>
          <Match when={succeeded()}>
            <Alert variant="success" class="mb-4">
              Your password has been reset. You can now sign in with your new password.
            </Alert>
            <A href="/login" class="text-primary-500 text-sm hover:underline">
              Go to sign in
            </A>
          </Match>
          <Match when={linkInvalid()}>
            <Alert class="mb-4">
              This reset link is invalid or has expired. Please request a new one.
            </Alert>
            <A href="/forgot-password" class="text-primary-500 text-sm hover:underline">
              Request a new link
            </A>
          </Match>
          <Match when={true}>
            <Show
              when={
                submission.error ||
                (submission.result?.ok === false && submission.result.error === "reset_failed")
              }
            >
              <Alert class="mb-4">Something went wrong. Please try again.</Alert>
            </Show>
            <form action={resetPassword} method="post" class="flex flex-col gap-4">
              <input type="hidden" name="email" value={email()} />
              <input type="hidden" name="token" value={token()} />
              <TextInput
                label="New password"
                name="newPassword"
                type="password"
                required
                maxLength={MAX_PASSWORD_LENGTH}
                pattern={`.{${MIN_PASSWORD_LENGTH},${MAX_PASSWORD_LENGTH}}`}
                title={`At least ${MIN_PASSWORD_LENGTH} characters`}
                placeholder="••••••••"
              />
              <Button type="submit" disabled={submission.pending}>
                {submission.pending ? "Resetting…" : "Reset password"}
              </Button>
            </form>
          </Match>
        </Switch>
      </Card>
    </PageContent>
  );
}

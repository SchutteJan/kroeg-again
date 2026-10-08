import { Title } from "@solidjs/meta";
import { A, action, useSubmission } from "@solidjs/router";
import { Match, Show, Switch } from "solid-js";
import { getRequestEvent } from "solid-js/web";
import { z } from "zod";
import { Alert } from "~/components/Alert";
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { PageContent } from "~/components/PageLayout";
import { TextInput } from "~/components/TextInput";
import { requestPasswordReset } from "~/lib/password-reset";

const sendResetLink = action(async (formData: FormData) => {
  "use server";
  const event = getRequestEvent();
  if (!event) {
    throw new Error("sendResetLink requires a request event");
  }
  const email = z.email().parse(formData.get("email"));
  await requestPasswordReset(event.locals.pool, email);
  return { ok: true };
}, "send-reset-link");

export default function ForgotPassword() {
  const submission = useSubmission(sendResetLink);

  return (
    <PageContent class="flex items-start justify-center pt-16">
      <Title>Forgot Password — Kroegen</Title>
      <Card class="w-full max-w-sm p-6">
        <h1 class="text-ink-900 mb-6 text-2xl font-bold">Reset your password</h1>
        <Switch
          fallback={
            <>
              <Show when={submission.error}>
                <Alert class="mb-4">Something went wrong. Please try again.</Alert>
              </Show>
              <form action={sendResetLink} method="post" class="flex flex-col gap-4">
                <TextInput
                  label="Email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                />
                <Button type="submit">Send reset link</Button>
              </form>
            </>
          }
        >
          <Match when={submission.pending}>
            <p class="text-ink-600 text-sm">Loading…</p>
          </Match>
          <Match when={submission.result?.ok}>
            <p class="text-ink-600 text-sm">
              If that email is registered, we've sent a link to reset your password.
            </p>
          </Match>
        </Switch>
        <p class="text-ink-600 mt-4 text-center text-sm">
          <A href="/login" class="text-primary-500 hover:underline">
            Back to sign in
          </A>
        </p>
      </Card>
    </PageContent>
  );
}

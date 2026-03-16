import { Title } from "@solidjs/meta";
import { A, useNavigate } from "@solidjs/router";
import { Show } from "solid-js";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { PageContent } from "~/components/PageLayout";

export default function User() {
  const me = authClient.useMe();
  const { mutate: signOut } = authClient.useSignOut();
  const navigate = useNavigate();
  const isUnauthenticated = () =>
    !me.loading() && !me.data() && me.error()?.code === "session_invalid";
  const hasLoadError = () =>
    !me.loading() && !me.data() && !!me.error() && !isUnauthenticated();

  async function handleSignOut() {
    await signOut({ body: {} });
    navigate("/login");
  }

  return (
    <PageContent class="flex items-start justify-center pt-16">
      <Title>Account — Kroegen</Title>
      <Show when={me.loading()}>
        <p class="text-ink-500">Loading...</p>
      </Show>
      <Show when={isUnauthenticated()}>
        <Card class="w-full max-w-sm p-6">
          <h1 class="text-ink-900 mb-4 text-2xl font-bold">Account</h1>
          <p class="text-ink-600 mb-6 text-sm">
            You need to sign in to view your account.
          </p>
          <Button as={A} href="/login">
            Sign in
          </Button>
        </Card>
      </Show>
      <Show when={hasLoadError()}>
        <Card class="w-full max-w-sm p-6">
          <h1 class="text-ink-900 mb-4 text-2xl font-bold">Account</h1>
          <p class="text-ink-600 text-sm">
            We couldn&apos;t load your account right now. Please try again.
          </p>
        </Card>
      </Show>
      <Show when={me.data()}>
        {(user) => (
          <Card class="w-full max-w-sm p-6">
            <h1 class="text-ink-900 mb-6 text-2xl font-bold">Account</h1>
            <dl class="text-ink-700 mb-6 space-y-2 text-sm">
              <div>
                <dt class="font-medium">Email</dt>
                <dd class="text-ink-600">{user().email}</dd>
              </div>
            </dl>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign out
            </Button>
          </Card>
        )}
      </Show>
    </PageContent>
  );
}

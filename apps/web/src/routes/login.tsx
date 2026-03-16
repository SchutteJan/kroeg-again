import { Title } from "@solidjs/meta";
import { A, useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { authClient } from "~/lib/auth-client";
import { Alert } from "~/components/Alert";
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { PageContent } from "~/components/PageLayout";
import { TextInput } from "~/components/TextInput";

export default function Login() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const { mutate: signIn, loading, error } = authClient.useSignIn();
  const navigate = useNavigate();

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const result = await signIn({
      body: { email: email(), password: password() },
    });
    if (result) {
      navigate("/");
    }
  }

  return (
    <PageContent class="flex items-start justify-center pt-16">
      <Title>Sign In — Kroegen</Title>
      <Card class="w-full max-w-sm p-6">
        <h1 class="text-ink-900 mb-6 text-2xl font-bold">Sign in</h1>
        <Show when={error()}>
          <Alert class="mb-4">{error()?.message}</Alert>
        </Show>
        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <TextInput
            label="Email"
            type="email"
            required
            value={email()}
            onChange={setEmail}
            placeholder="you@example.com"
          />
          <TextInput
            label="Password"
            type="password"
            required
            value={password()}
            onChange={setPassword}
            placeholder="••••••••"
          />
          <Button type="submit" disabled={loading()}>
            {loading() ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p class="text-ink-600 mt-4 text-center text-sm">
          Don't have an account?{" "}
          <A href="/signup" class="text-primary-500 hover:underline">
            Sign up
          </A>
        </p>
      </Card>
    </PageContent>
  );
}

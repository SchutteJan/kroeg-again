import { Title } from "@solidjs/meta";
import { A, useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { authClient } from "~/lib/auth-client";
import { Alert } from "~/components/Alert";
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { PageContent } from "~/components/PageLayout";
import { TextInput } from "~/components/TextInput";

export default function Signup() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const { mutate: signUp, loading, error } = authClient.useSignUp();
  const navigate = useNavigate();

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const result = await signUp({
      body: { email: email(), password: password() },
    });
    if (result) {
      navigate("/");
    }
  }

  return (
    <PageContent class="flex items-start justify-center pt-16">
      <Title>Sign Up — Kroegen</Title>
      <Card class="w-full max-w-sm p-6">
        <h1 class="text-ink-900 mb-6 text-2xl font-bold">Create account</h1>
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
            minLength={8}
            value={password()}
            onChange={setPassword}
            placeholder="••••••••"
          />
          <Button type="submit" disabled={loading()}>
            {loading() ? "Creating account…" : "Sign up"}
          </Button>
        </form>
        <p class="text-ink-600 mt-4 text-center text-sm">
          Already have an account?{" "}
          <A href="/login" class="text-primary-500 hover:underline">
            Sign in
          </A>
        </p>
      </Card>
    </PageContent>
  );
}

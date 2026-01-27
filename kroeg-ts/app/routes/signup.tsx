import { useState } from "react";
import { Link, useNavigate } from "react-router";

export default function Signup() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      rememberMe: formData.get("rememberMe") === "on",
    };

    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.message ?? "Unable to sign up.");
        setIsSubmitting(false);
        return;
      }

      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign up.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-sand px-6 pb-16 pt-12 md:px-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 lg:flex-row lg:items-center">
        <section className="flex-1 space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Join the curation team
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
            Create an admin account.
          </h1>
          <p className="text-base text-slate-600">
            New accounts can review AI decisions and trigger license syncs.
          </p>
          <Link
            to="/"
            className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4"
          >
            Back to map
          </Link>
        </section>
        <section className="flex-1">
          <div className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-[0_30px_110px_-90px_rgba(15,23,42,0.6)]">
            <h2 className="text-xl font-semibold text-slate-900">
              Sign up
            </h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Full name
                <input
                  name="name"
                  type="text"
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Password
                <input
                  name="password"
                  type="password"
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                />
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  name="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                />
                Keep me signed in
              </label>
              {error ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>
            <p className="mt-6 text-sm text-slate-600">
              Already registered?{" "}
              <Link
                to="/login"
                className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4"
              >
                Sign in
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

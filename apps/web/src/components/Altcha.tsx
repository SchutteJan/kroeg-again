import { createSignal, Match, onCleanup, onMount, Switch } from "solid-js";
import { Checkbox } from "~/components/Checkbox";

type State = "unverified" | "verifying" | "verified" | "failed";

/** Keeps the pour animation from flashing by when the proof of work is quick. */
const MIN_VERIFY_DURATION_MS = 500;
const MAX_WORKERS = 8;

/**
 * Proof-of-work captcha. Solves a challenge from `/api/altcha/challenge` once the user focuses the
 * form or ticks the box, and puts the solution in a hidden `altcha` field (`ALTCHA_FIELD`), to be
 * checked server side with `verifyAltcha`.
 */
export function Altcha() {
  const [state, setState] = createSignal<State>("unverified");
  const [payload, setPayload] = createSignal("");
  let formContainer: HTMLDivElement | undefined;
  let controller: AbortController | undefined;

  async function verify() {
    if (state() === "verifying" || state() === "verified") {
      return;
    }
    setState("verifying");
    controller = new AbortController();
    const signal = controller.signal;
    try {
      // Browser only, so loaded on demand rather than pulled into the server bundle.
      const [{ solveChallengeWorkers }, { default: Pbkdf2Worker }, challenge] = await Promise.all([
        import("altcha-lib"),
        import("./altcha-worker?worker"),
        fetch("/api/altcha/challenge", { signal }).then((res) => res.json()),
        new Promise((resolve) => setTimeout(resolve, MIN_VERIFY_DURATION_MS)),
      ]);
      const solution = await solveChallengeWorkers({
        challenge,
        concurrency: Math.min(navigator.hardwareConcurrency || 1, MAX_WORKERS),
        createWorker: () => new Pbkdf2Worker(),
        controller,
      });
      if (signal.aborted) {
        return;
      }
      if (!solution) {
        throw new Error("No solution found");
      }
      setPayload(btoa(JSON.stringify({ challenge, solution })));
      setState("verified");
    } catch (error) {
      if (!signal.aborted) {
        console.error("Captcha verification failed", error);
        setState("failed");
      }
    }
  }

  // Start as soon as the user engages with the form, so it's usually done by the time they submit.
  onMount(() => {
    const form = formContainer?.closest("form");
    form?.addEventListener("focusin", verify, { once: true });
    onCleanup(() => form?.removeEventListener("focusin", verify));
  });
  onCleanup(() => controller?.abort());

  return (
    <div
      ref={(el) => (formContainer = el)}
      class="border-cream-300 bg-cream-50 flex items-center rounded-md border px-3 py-4"
    >
      <Checkbox
        checked={state() === "verified"}
        onChange={(checked) => checked && verify()}
        loading={state() === "verifying"}
        readOnly={state() === "verified"}
        validationState={state() === "failed" ? "invalid" : "valid"}
        required
        label={
          <Switch fallback="I'm not a robot">
            <Match when={state() === "verifying"}>Verifying…</Match>
            <Match when={state() === "verified"}>Verified</Match>
            <Match when={state() === "failed"}>Verification failed, tick to retry</Match>
          </Switch>
        }
      />
      <input type="hidden" name="altcha" value={payload()} />
    </div>
  );
}

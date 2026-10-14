import { Checkbox as CheckboxPrimitive } from "@kobalte/core/checkbox";
import { Check } from "lucide-solid";
import type { ComponentProps, JSX } from "solid-js";
import { Show, splitProps } from "solid-js";
import { Loading } from "~/components/Loading";

export type CheckboxProps = ComponentProps<typeof CheckboxPrimitive> & {
  label: JSX.Element;
  /** Swaps the box for a spinner and stops it being toggled, e.g. while the value is being checked. */
  loading?: boolean;
};

export function Checkbox(props: CheckboxProps) {
  const [local, rest] = splitProps(props, ["label", "loading", "readOnly", "class"]);

  return (
    <CheckboxPrimitive
      // Read-only rather than disabled while loading, so `required` still blocks form submission.
      readOnly={local.readOnly || local.loading}
      class={`ui-disabled:cursor-not-allowed ui-disabled:opacity-50 inline-flex cursor-pointer items-center gap-3 ${local.class ?? ""}`}
      {...rest}
    >
      <CheckboxPrimitive.Input class="peer" />
      <CheckboxPrimitive.Control
        class={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
          local.loading
            ? "border-transparent"
            : "border-cream-400 ui-checked:border-accent-green ui-checked:bg-accent-green ui-invalid:border-accent-red peer-focus-visible:outline-primary-500 bg-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
        }`}
      >
        <Show
          when={local.loading}
          fallback={
            <CheckboxPrimitive.Indicator>
              <Check class="h-4 w-4 text-white" stroke-width={3} />
            </CheckboxPrimitive.Indicator>
          }
        >
          <Loading
            size="sm"
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2"
          />
        </Show>
      </CheckboxPrimitive.Control>
      <CheckboxPrimitive.Label class="text-ink-700 cursor-[inherit] text-sm">
        {local.label}
      </CheckboxPrimitive.Label>
    </CheckboxPrimitive>
  );
}

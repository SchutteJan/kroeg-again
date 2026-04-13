import { Alert as AlertPrimitive } from "@kobalte/core/alert";
import type { JSX, ParentProps } from "solid-js";
import { Show, splitProps } from "solid-js";

type Variant = "error" | "warning" | "info" | "success";

const variantClasses: Record<Variant, string> = {
  error: "border-accent-red/25 bg-accent-red/8 text-accent-red-dark",
  warning: "border-accent-yellow-dark/30 bg-accent-yellow/12 text-ink-800",
  info: "border-primary-300/40 bg-primary-50 text-primary-800",
  success: "border-accent-green/25 bg-accent-green/8 text-accent-green-dark",
};

const iconVariantClasses: Record<Variant, string> = {
  error: "text-accent-red",
  warning: "text-accent-yellow-dark",
  info: "text-primary-600",
  success: "text-accent-green",
};

export type AlertProps = ParentProps<{
  variant?: Variant;
  class?: string;
  icon?: JSX.Element;
}>;

export function Alert(props: AlertProps) {
  const [local, rest] = splitProps(props, ["variant", "class", "children", "icon"]);
  const variant = () => local.variant ?? "error";

  return (
    <AlertPrimitive
      class={`rounded-lg border px-3 py-2.5 text-sm ${variantClasses[variant()]} ${local.class ?? ""}`}
      {...rest}
    >
      <Show when={local.icon} fallback={local.children}>
        <div class="grid grid-cols-[auto_1fr] gap-x-2.5">
          <div class={`row-span-2 mt-0.5 [&>svg]:size-4 ${iconVariantClasses[variant()]}`}>
            {local.icon}
          </div>
          <div>{local.children}</div>
        </div>
      </Show>
    </AlertPrimitive>
  );
}

export function AlertTitle(props: ParentProps<{ class?: string }>) {
  return <div class={`leading-snug font-medium ${props.class ?? ""}`}>{props.children}</div>;
}

export function AlertDescription(props: ParentProps<{ class?: string }>) {
  return (
    <div class={`text-ink-500 mt-0.5 text-sm leading-snug ${props.class ?? ""}`}>
      {props.children}
    </div>
  );
}

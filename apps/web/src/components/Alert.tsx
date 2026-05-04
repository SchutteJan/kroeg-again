import { Alert as AlertPrimitive } from "@kobalte/core/alert";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-solid";
import type { Component, ParentProps } from "solid-js";
import { splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";

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

const variantIcons: Record<Variant, Component> = {
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
  success: CircleCheck,
};

export type AlertProps = ParentProps<{
  variant?: Variant;
  class?: string;
}>;

export function Alert(props: AlertProps) {
  const [local, rest] = splitProps(props, ["variant", "class", "children"]);
  const variant = () => local.variant ?? "error";
  const Icon = () => variantIcons[variant()];

  return (
    <AlertPrimitive
      class={`rounded-lg border px-3 py-2.5 text-sm ${variantClasses[variant()]} ${local.class ?? ""}`}
      {...rest}
    >
      <div class="grid grid-cols-[auto_1fr] gap-x-2.5">
        <div class={`row-span-2 mt-0.5 [&>svg]:size-4 ${iconVariantClasses[variant()]}`}>
          <Dynamic component={Icon()} />
        </div>
        <div>{local.children}</div>
      </div>
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

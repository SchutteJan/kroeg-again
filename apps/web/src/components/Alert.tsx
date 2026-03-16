import { Alert as AlertPrimitive } from "@kobalte/core/alert";
import type { ParentProps } from "solid-js";
import { splitProps } from "solid-js";

type Variant = "error";

const variantClasses: Record<Variant, string> = {
  error: "bg-accent-red/10 text-accent-red",
};

export type AlertProps = ParentProps<{
  variant?: Variant;
  class?: string;
}>;

export function Alert(props: AlertProps) {
  const [local, rest] = splitProps(props, ["variant", "class", "children"]);

  return (
    <AlertPrimitive
      class={`rounded-md px-3 py-2 text-sm ${variantClasses[local.variant ?? "error"]} ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </AlertPrimitive>
  );
}

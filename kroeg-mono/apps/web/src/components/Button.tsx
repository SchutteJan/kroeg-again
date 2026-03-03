import { Button as ButtonPrimitive } from "@kobalte/core/button";
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  default: "bg-primary-500 text-white hover:bg-primary-500/90",
  destructive: "bg-accent-red text-white hover:bg-accent-red/90",
  outline: "border border-cream-300 bg-cream-50 shadow-xs hover:bg-cream-300 hover:text-ink-900",
  secondary: "bg-cream-200 text-ink-900 hover:bg-cream-200/80",
  ghost: "hover:bg-cream-300 hover:text-ink-900",
  link: "text-primary-500 underline-offset-4 hover:underline",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export type ButtonProps = ComponentProps<typeof ButtonPrimitive> & {
  variant?: Variant;
  size?: Size;
};

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ["variant", "size", "class"]);

  return (
    <ButtonPrimitive
      class={`ui-disabled:cursor-not-allowed ui-disabled:opacity-50 focus-visible:outline-primary-500 inline-flex cursor-pointer items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${sizeClasses[local.size ?? "md"]} ${variantClasses[local.variant ?? "default"]} ${local.class ?? ""}`}
      {...rest}
    />
  );
}

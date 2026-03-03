import { Button as ButtonPrimitive } from "@kobalte/core/button";
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

type Variant = "solid" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  solid: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 data-[disabled]:bg-blue-300",
  outline:
    "border border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100 data-[disabled]:border-blue-300 data-[disabled]:text-blue-300",
  ghost: "text-blue-600 hover:bg-blue-50 active:bg-blue-100 data-[disabled]:text-blue-300",
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
      class={`inline-flex cursor-pointer items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 data-disabled:cursor-not-allowed ${sizeClasses[local.size ?? "md"]} ${variantClasses[local.variant ?? "solid"]} ${local.class ?? ""}`}
      {...rest}
    />
  );
}

import type { ParentProps } from "solid-js";
import { splitProps } from "solid-js";

export type CardProps = ParentProps<{
  class?: string;
}>;

export function Card(props: CardProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={`border-cream-300 bg-cream-50 rounded-lg border shadow-sm ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export type CardHeaderProps = ParentProps<{ class?: string }>;

export function CardHeader(props: CardHeaderProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={`border-cream-300 border-b px-6 py-4 ${local.class ?? ""}`} {...rest}>
      {local.children}
    </div>
  );
}

export type CardBodyProps = ParentProps<{ class?: string }>;

export function CardBody(props: CardBodyProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={`px-6 py-4 ${local.class ?? ""}`} {...rest}>
      {local.children}
    </div>
  );
}

export type CardFooterProps = ParentProps<{ class?: string }>;

export function CardFooter(props: CardFooterProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={`border-cream-300 border-t px-6 py-4 ${local.class ?? ""}`} {...rest}>
      {local.children}
    </div>
  );
}

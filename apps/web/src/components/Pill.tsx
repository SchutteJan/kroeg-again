import type { JSX } from "solid-js";
import { splitProps } from "solid-js";

export type PillProps = {
  class?: string;
  children?: JSX.Element;
};

export function Pill(props: PillProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <span class={`rounded-full px-2.5 py-0.5 text-xs font-medium ${local.class ?? ""}`} {...rest}>
      {local.children}
    </span>
  );
}

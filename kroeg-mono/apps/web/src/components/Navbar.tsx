import { A } from "@solidjs/router";
import type { JSX, ParentProps } from "solid-js";
import { Show, splitProps } from "solid-js";

export type NavbarProps = ParentProps<{
  brand?: string;
  class?: string;
}>;

export function Navbar(props: NavbarProps) {
  const [local, rest] = splitProps(props, ["brand", "class", "children"]);

  return (
    <nav
      class={`border-cream-300 bg-cream-100 flex items-center gap-6 border-b px-6 py-3 ${local.class ?? ""}`}
      {...rest}
    >
      <Show when={local.brand}>
        <A href="/" class="text-ink-900 mr-4 text-lg font-semibold">
          {local.brand}
        </A>
      </Show>
      <div class="flex items-center gap-1">{local.children}</div>
    </nav>
  );
}

export type NavItemProps = {
  href: string;
  end?: boolean;
  class?: string;
  children: JSX.Element;
};

export function NavItem(props: NavItemProps) {
  const [local, rest] = splitProps(props, ["href", "end", "class", "children"]);

  return (
    <A
      href={local.href}
      end={local.end}
      activeClass="bg-cream-300 text-ink-900"
      inactiveClass="text-ink-600"
      class={`hover:bg-cream-300 hover:text-ink-900 rounded-md px-3 py-2 text-sm font-medium transition-colors ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </A>
  );
}

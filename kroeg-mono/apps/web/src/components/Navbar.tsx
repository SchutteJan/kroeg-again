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
      class={`flex items-center gap-6 border-b border-gray-200 bg-white px-6 py-3 ${local.class ?? ""}`}
      {...rest}
    >
      <Show when={local.brand}>
        <A href="/" class="mr-4 text-lg font-semibold text-gray-900">
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
      activeClass="bg-gray-100 text-gray-900"
      inactiveClass="text-gray-600"
      class={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </A>
  );
}

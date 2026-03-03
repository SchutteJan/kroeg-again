import type { JSX, ParentProps } from "solid-js";
import { splitProps } from "solid-js";

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
      {local.brand && (
        <a href="/" class="mr-4 text-lg font-semibold text-gray-900">
          {local.brand}
        </a>
      )}
      <div class="flex items-center gap-1">{local.children}</div>
    </nav>
  );
}

export type NavItemProps = {
  href: string;
  active?: boolean;
  class?: string;
  children: JSX.Element;
};

export function NavItem(props: NavItemProps) {
  const [local, rest] = splitProps(props, ["href", "active", "class", "children"]);

  return (
    <a
      href={local.href}
      class={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 ${
        local.active ? "bg-gray-100 text-gray-900" : "text-gray-600"
      } ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </a>
  );
}

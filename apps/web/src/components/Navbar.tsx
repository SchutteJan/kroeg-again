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
        <A href="/" class="text-ink-900 relative isolate mr-4 text-xl font-extrabold">
          {local.brand}
          <span
            aria-hidden="true"
            class="bg-accent-yellow pointer-events-none absolute bottom-1 left-0 -z-10 h-2 w-full mask-[url('/chalk-line.png')] mask-size-[100%_100%] mask-no-repeat select-none"
          />
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
  chalkClass?: string;
  children: JSX.Element;
};

export function NavItem(props: NavItemProps) {
  const [local, rest] = splitProps(props, ["href", "end", "class", "chalkClass", "children"]);

  return (
    <A
      href={local.href}
      end={local.end}
      activeClass="text-ink-900 [&_.chalk]:opacity-100"
      inactiveClass="text-ink-600"
      class={`hover:text-ink-900 rounded-md px-3 py-2 text-base font-medium transition-colors hover:[&_.chalk]:opacity-100 ${local.class ?? ""}`}
      {...rest}
    >
      <span class="relative isolate">
        {local.children}
        <Show when={local.chalkClass}>
          <span
            aria-hidden="true"
            class={`chalk pointer-events-none absolute bottom-0 left-0 -z-10 h-[5px] w-full mask-[url('/chalk-line.png')] mask-size-[100%_100%] mask-no-repeat opacity-0 transition-opacity select-none ${local.chalkClass}`}
          />
        </Show>
      </span>
    </A>
  );
}

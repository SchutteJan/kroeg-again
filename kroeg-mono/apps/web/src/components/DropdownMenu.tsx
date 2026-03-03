import { DropdownMenu as DropdownMenuPrimitive } from "@kobalte/core/dropdown-menu";
import type { ComponentProps, ParentProps } from "solid-js";
import { splitProps } from "solid-js";

export function DropdownMenu(props: ComponentProps<typeof DropdownMenuPrimitive>) {
  return <DropdownMenuPrimitive {...props} />;
}

export type DropdownTriggerProps = ComponentProps<typeof DropdownMenuPrimitive.Trigger> & {
  class?: string;
};

export function DropdownTrigger(props: DropdownTriggerProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <DropdownMenuPrimitive.Trigger
      class={`inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
      <DropdownMenuPrimitive.Icon class="ui-expanded:rotate-180 transition-transform">
        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clip-rule="evenodd"
          />
        </svg>
      </DropdownMenuPrimitive.Icon>
    </DropdownMenuPrimitive.Trigger>
  );
}

export function DropdownContent(props: ParentProps<{ class?: string }>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        class={`ui-expanded:animate-[contentShow_150ms_ease] z-50 min-w-48 origin-(--kb-menu-content-transform-origin) animate-[contentHide_150ms_ease] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${local.class ?? ""}`}
        {...rest}
      >
        {local.children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

export type DropdownItemProps = ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  class?: string;
};

export function DropdownItem(props: DropdownItemProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <DropdownMenuPrimitive.Item
      class={`ui-disabled:cursor-not-allowed ui-disabled:text-gray-400 ui-highlighted:bg-gray-100 ui-highlighted:text-gray-900 flex cursor-pointer items-center px-3 py-2 text-sm text-gray-700 transition-colors outline-none ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownSeparator(props: { class?: string }) {
  const [local] = splitProps(props, ["class"]);
  return <DropdownMenuPrimitive.Separator class={`my-1 h-px bg-gray-200 ${local.class ?? ""}`} />;
}

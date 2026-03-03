import { DropdownMenu as DropdownMenuPrimitive } from "@kobalte/core/dropdown-menu";
import { ChevronDown } from "lucide-solid";
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
      class={`hover:bg-cream-300 focus-visible:outline-primary-500 inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
      <DropdownMenuPrimitive.Icon class="ui-expanded:rotate-180 transition-transform">
        <ChevronDown class="h-4 w-4" />
      </DropdownMenuPrimitive.Icon>
    </DropdownMenuPrimitive.Trigger>
  );
}

export function DropdownContent(props: ParentProps<{ class?: string }>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        class={`ui-expanded:animate-[contentShow_150ms_ease] border-cream-300 bg-cream-50 z-50 min-w-48 origin-(--kb-menu-content-transform-origin) animate-[contentHide_150ms_ease] overflow-hidden rounded-lg border py-1 shadow-lg ${local.class ?? ""}`}
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
      class={`ui-disabled:cursor-not-allowed ui-disabled:text-ink-400 ui-highlighted:bg-cream-200 ui-highlighted:text-ink-900 text-ink-700 flex cursor-pointer items-center px-3 py-2 text-sm transition-colors outline-none ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownSeparator(props: { class?: string }) {
  const [local] = splitProps(props, ["class"]);
  return (
    <DropdownMenuPrimitive.Separator
      class={`bg-cream-300 my-1 h-px border-none ${local.class ?? ""}`}
    />
  );
}

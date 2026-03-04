import { Popover as PopoverPrimitive } from "@kobalte/core/popover";
import type { ComponentProps, ParentProps } from "solid-js";
import { splitProps } from "solid-js";

export function Popover(props: ComponentProps<typeof PopoverPrimitive>) {
  return <PopoverPrimitive gutter={4} {...props} />;
}

export type PopoverTriggerProps = ComponentProps<typeof PopoverPrimitive.Trigger> & {
  class?: string;
};

export function PopoverTrigger(props: PopoverTriggerProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <PopoverPrimitive.Trigger
      class={`hover:bg-cream-300 focus-visible:outline-primary-500 inline-flex cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </PopoverPrimitive.Trigger>
  );
}

export function PopoverContent(props: ParentProps<{ class?: string }>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        class={`ui-expanded:animate-[contentShow_150ms_ease] border-cream-300 bg-cream-50 z-50 min-w-40 origin-(--kb-popover-content-transform-origin) animate-[contentHide_150ms_ease] overflow-hidden rounded-lg border py-1 shadow-lg ${local.class ?? ""}`}
        {...rest}
      >
        {local.children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

export type PopoverItemProps = ComponentProps<typeof PopoverPrimitive.CloseButton> & {
  class?: string;
};

export function PopoverItem(props: PopoverItemProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <PopoverPrimitive.CloseButton
      class={`text-ink-700 hover:bg-cream-200 hover:text-ink-900 flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors outline-none ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </PopoverPrimitive.CloseButton>
  );
}

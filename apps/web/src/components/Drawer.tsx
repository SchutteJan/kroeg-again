import { Dialog as DialogPrimitive } from "@kobalte/core/dialog";
import type { ComponentProps, JSX, ParentProps } from "solid-js";
import { createContext, createSignal, splitProps, useContext } from "solid-js";

type DrawerContextValue = {
  close: () => void;
  dragging: () => boolean;
  setDragging: (v: boolean) => void;
  dragged: () => boolean;
  setDragged: (v: boolean) => void;
  sheetHeight: () => number | undefined;
  setSheetHeight: (h: number | undefined) => void;
};

const DrawerContext = createContext<DrawerContextValue>();

export function Drawer(props: ComponentProps<typeof DialogPrimitive>) {
  const [local, rest] = splitProps(props, ["onOpenChange", "children"]);
  const [open, setOpen] = createSignal(false);
  const [dragging, setDragging] = createSignal(false);
  const [dragged, setDragged] = createSignal(false);
  const [sheetHeight, setSheetHeight] = createSignal<number | undefined>();

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setSheetHeight(undefined);
      setDragged(false);
    }
    if (!isOpen) {
      setDragging(false);
    }
    local.onOpenChange?.(isOpen);
  }

  return (
    <DrawerContext.Provider
      value={{
        close: () => handleOpenChange(false),
        dragging,
        setDragging,
        dragged,
        setDragged,
        sheetHeight,
        setSheetHeight,
      }}
    >
      <DialogPrimitive open={open()} onOpenChange={handleOpenChange} {...rest}>
        {local.children}
      </DialogPrimitive>
    </DrawerContext.Provider>
  );
}

export function DrawerTrigger(
  props: ComponentProps<typeof DialogPrimitive.Trigger> & { class?: string },
) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <DialogPrimitive.Trigger
      class={`hover:bg-cream-300 focus-visible:outline-primary-500 inline-flex cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </DialogPrimitive.Trigger>
  );
}

export function DrawerContent(props: ParentProps<{ class?: string }>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  const ctx = useContext(DrawerContext)!;
  let contentRef: HTMLDivElement | undefined;
  let startY = 0;
  let startHeight = 0;

  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    if (!contentRef) {
      return;
    }
    startY = e.clientY;
    startHeight = contentRef.offsetHeight;
    ctx.setDragging(true);
    ctx.setDragged(true);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(e: PointerEvent) {
    const delta = startY - e.clientY;
    const maxH = window.innerHeight * 0.85;
    ctx.setSheetHeight(Math.max(0, Math.min(maxH, startHeight + delta)));
  }

  function onPointerUp() {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    ctx.setDragging(false);

    const h = ctx.sheetHeight();
    if (h !== undefined && h < 100) {
      ctx.close();
    }
  }

  const contentStyle = (): JSX.CSSProperties | undefined => {
    const h = ctx.sheetHeight();
    if (h === undefined) {
      return undefined;
    }
    return { height: `${h}px` };
  };

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Content
        ref={(el: HTMLDivElement) => {
          contentRef = el;
        }}
        class={`bg-cream-50 border-cream-300 fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-xl border-t ${ctx.dragged() ? "" : "ui-expanded:animate-[drawerSlideIn_200ms_ease] animate-[drawerSlideOut_200ms_ease]"} ${local.class ?? ""}`}
        style={contentStyle()}
        {...rest}
      >
        {/* Drag handle */}
        <div
          class="flex cursor-grab touch-none justify-center pt-3 pb-1 select-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
        >
          <div class="bg-cream-400 h-1.5 w-10 rounded-full" />
        </div>
        {local.children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DrawerHeader(props: ParentProps<{ class?: string }>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={`flex flex-col gap-1.5 px-6 py-4 ${local.class ?? ""}`} {...rest}>
      {local.children}
    </div>
  );
}

export function DrawerFooter(props: ParentProps<{ class?: string }>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={`border-cream-300 flex flex-col gap-2 border-t px-6 py-4 ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export function DrawerTitle(
  props: ComponentProps<typeof DialogPrimitive.Title> & { class?: string },
) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <DialogPrimitive.Title
      class={`text-ink-900 text-lg font-semibold ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </DialogPrimitive.Title>
  );
}

export function DrawerDescription(
  props: ComponentProps<typeof DialogPrimitive.Description> & { class?: string },
) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <DialogPrimitive.Description class={`text-ink-500 text-sm ${local.class ?? ""}`} {...rest}>
      {local.children}
    </DialogPrimitive.Description>
  );
}

export function DrawerClose(
  props: ComponentProps<typeof DialogPrimitive.CloseButton> & { class?: string },
) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <DialogPrimitive.CloseButton class={local.class} {...rest}>
      {local.children}
    </DialogPrimitive.CloseButton>
  );
}

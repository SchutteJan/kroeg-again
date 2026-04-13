import { Toast as ToastPrimitive, toaster } from "@kobalte/core/toast";
import { X } from "lucide-solid";

export function showToast(title: string, description?: string) {
  return toaster.show((props) => (
    <ToastPrimitive
      toastId={props.toastId}
      class="bg-cream-50 border-cream-300 text-ink-900 ui-opened:animate-[toastSlideIn_200ms_ease-out] ui-closed:animate-[toastSlideOut_100ms_ease-in] rounded-lg border p-4 shadow-lg"
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <ToastPrimitive.Title class="text-sm font-medium">{title}</ToastPrimitive.Title>
          {description && (
            <ToastPrimitive.Description class="text-ink-500 mt-1 text-sm">
              {description}
            </ToastPrimitive.Description>
          )}
        </div>
        <ToastPrimitive.CloseButton class="text-ink-400 hover:text-ink-700 shrink-0 cursor-pointer">
          <X class="size-4" />
        </ToastPrimitive.CloseButton>
      </div>
    </ToastPrimitive>
  ));
}

export function ToastRegion() {
  return (
    <ToastPrimitive.Region duration={5000}>
      <ToastPrimitive.List class="fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-2" />
    </ToastPrimitive.Region>
  );
}

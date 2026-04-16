import {
  Check,
  EllipsisVertical,
  ExternalLink,
  EyeOff,
  MapPin as MapPinIcon,
  Share,
} from "lucide-solid";
import type { JSX } from "solid-js";
import { Show, splitProps } from "solid-js";
import { Button } from "~/components/Button";
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from "~/components/Popover";

type LocationMenuActions = {
  onShare?: () => void;
  onOpenInMaps?: () => void;
  onShowOnMap?: () => void;
  onHide?: () => void;
};

function LocationMenuButton(props: LocationMenuActions & { class?: string }) {
  return (
    <Popover>
      <PopoverTrigger class={`text-ink-500 p-1 ${props.class ?? ""}`}>
        <EllipsisVertical class="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverItem onClick={props.onShare}>
          <Share class="h-4 w-4 shrink-0" />
          Share
        </PopoverItem>
        <PopoverItem onClick={props.onOpenInMaps}>
          <ExternalLink class="h-4 w-4 shrink-0" />
          Open in Google Maps
        </PopoverItem>
        <PopoverItem onClick={props.onShowOnMap}>
          <MapPinIcon class="h-4 w-4 shrink-0" />
          Show on Map
        </PopoverItem>
        <PopoverItem onClick={props.onHide}>
          <EyeOff class="h-4 w-4 shrink-0" />
          Hide
        </PopoverItem>
      </PopoverContent>
    </Popover>
  );
}

export type LocationPopupProps = {
  name: string;
  type: string;
  imageUrl?: string;
  checkedIn?: boolean;
  onToggleCheckIn?: () => void;
  class?: string;
} & LocationMenuActions;

export function LocationPopup(props: LocationPopupProps) {
  const [local, rest] = splitProps(props, [
    "name",
    "type",
    "imageUrl",
    "checkedIn",
    "onToggleCheckIn",
    "onShare",
    "onOpenInMaps",
    "onShowOnMap",
    "onHide",
    "class",
  ]);

  return (
    <div class={`flex flex-col items-center ${local.class ?? ""}`} {...rest}>
      <div class="border-cream-300 bg-cream-50 flex w-56 flex-col rounded-lg border shadow-md">
        <div class="flex gap-3 p-2.5">
          <div class="relative shrink-0">
            <img
              src={local.imageUrl}
              alt={local.name}
              class="bg-cream-200 h-14 w-14 rounded object-cover"
            />
            <Show when={local.checkedIn}>
              <span class="bg-accent-green absolute top-0 left-0 flex h-5 w-5 items-center justify-center rounded-tl rounded-br text-white shadow">
                <Check class="h-3.5 w-3.5 stroke-[3]" />
              </span>
            </Show>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <h4 class="text-ink-900 truncate text-sm font-semibold">{local.name}</h4>
            </div>
            <span class="bg-accent-yellow/20 text-ink-800 mt-1 inline-block rounded-full px-2 py-px text-[11px] font-medium">
              {local.type}
            </span>
          </div>
          <LocationMenuButton
            onShare={local.onShare}
            onOpenInMaps={local.onOpenInMaps}
            onShowOnMap={local.onShowOnMap}
            onHide={local.onHide}
            class="-mt-1 -mr-1 self-start"
          />
        </div>
        <div class="border-cream-300 border-t px-2.5 py-2">
          <Button
            size="sm"
            variant={local.checkedIn ? "outline" : "default"}
            class="w-full text-xs"
            onClick={local.onToggleCheckIn}
          >
            {local.checkedIn ? "Check out" : "Check in"}
          </Button>
        </div>
      </div>
      {/* Speech bubble arrow */}
      <div class="border-cream-300 -mt-px h-0 w-0 border-x-8 border-t-8 border-x-transparent" />
      <div class="border-cream-50 -mt-[9px] h-0 w-0 border-x-[7px] border-t-[7px] border-x-transparent" />
    </div>
  );
}

export function MapPin(props: { checked?: boolean; class?: string }) {
  return (
    <svg
      class={`h-8 w-8 ${props.class ?? ""}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill={props.checked ? "var(--color-accent-green)" : "var(--color-accent-red)"}
      />
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  );
}

export function MockMap(props: { children?: JSX.Element; class?: string }) {
  return (
    <div class={`border-cream-300 relative overflow-hidden rounded-lg border ${props.class ?? ""}`}>
      {/* Grid pattern to simulate a map */}
      <div class="bg-cream-100 h-80">
        <svg class="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="var(--color-cream-300)"
                stroke-width="0.5"
              />
            </pattern>
            <pattern id="grid-lg" width="200" height="200" patternUnits="userSpaceOnUse">
              <path
                d="M 200 0 L 0 0 0 200"
                fill="none"
                stroke="var(--color-cream-400)"
                stroke-width="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect width="100%" height="100%" fill="url(#grid-lg)" />
        </svg>
      </div>
      {props.children}
    </div>
  );
}

export type LocationCardProps = {
  name: string;
  type: string;
  areaName: string;
  addressLine: string;
  description: string;
  imageUrl?: string;
  checkedIn?: boolean;
  onToggleCheckIn?: () => void;
  class?: string;
} & LocationMenuActions;

export function LocationCard(props: LocationCardProps) {
  const [local, rest] = splitProps(props, [
    "name",
    "type",
    "areaName",
    "addressLine",
    "description",
    "imageUrl",
    "checkedIn",
    "onToggleCheckIn",
    "onShare",
    "onOpenInMaps",
    "onShowOnMap",
    "onHide",
    "class",
  ]);

  return (
    <div
      class={`border-cream-300 bg-cream-50 flex flex-col gap-3 rounded-lg border p-4 ${local.class ?? ""}`}
      {...rest}
    >
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-ink-900 min-w-0 text-2xl font-semibold">{local.name}</h3>
        <div class="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant={local.checkedIn ? "outline" : "default"}
            onClick={local.onToggleCheckIn}
          >
            {local.checkedIn ? "Check out" : "Check in"}
          </Button>
          <LocationMenuButton
            onShare={local.onShare}
            onOpenInMaps={local.onOpenInMaps}
            onShowOnMap={local.onShowOnMap}
            onHide={local.onHide}
            class="p-1.5"
          />
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="bg-accent-yellow/20 text-ink-800 rounded-full px-2.5 py-0.5 text-xs font-medium">
          {local.type}
        </span>
        <span class="bg-cream-200 text-ink-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
          {local.areaName}
        </span>
        <span class="text-ink-400 text-xs">&middot;</span>
        <span class="text-ink-500 text-xs">{local.addressLine}</span>
      </div>
      <div class="flex gap-3">
        <div class="relative shrink-0">
          <img
            src={local.imageUrl}
            alt={local.name}
            class="bg-cream-200 h-24 w-24 rounded-md object-cover"
          />
          <Show when={local.checkedIn}>
            <span class="bg-accent-green absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-tl-md rounded-br-md text-white shadow">
              <Check class="h-3.5 w-3.5 stroke-[3]" />
            </span>
          </Show>
        </div>
        <p class="text-ink-600 line-clamp-4 min-w-0 flex-1 text-sm leading-relaxed">
          {local.description}
        </p>
      </div>
    </div>
  );
}

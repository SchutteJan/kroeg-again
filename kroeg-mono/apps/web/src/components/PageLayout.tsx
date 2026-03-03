import type { ParentProps } from "solid-js";
import { splitProps } from "solid-js";

export type PageLayoutProps = ParentProps<{
  class?: string;
}>;

export function PageLayout(props: PageLayoutProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={`min-h-screen bg-gray-50 ${local.class ?? ""}`} {...rest}>
      {local.children}
    </div>
  );
}

export type PageContentProps = ParentProps<{
  class?: string;
  width?: "sm" | "md" | "lg" | "xl" | "full";
}>;

const widthClasses = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-full",
};

export function PageContent(props: PageContentProps) {
  const [local, rest] = splitProps(props, ["class", "children", "width"]);
  return (
    <main
      class={`mx-auto px-6 py-8 ${widthClasses[local.width ?? "lg"]} ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </main>
  );
}

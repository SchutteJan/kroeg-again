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
}>;

export function PageContent(props: PageContentProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <main class={`mx-auto max-w-6xl px-6 py-8 ${local.class ?? ""}`} {...rest}>
      {local.children}
    </main>
  );
}

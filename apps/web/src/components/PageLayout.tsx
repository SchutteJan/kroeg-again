import type { ParentProps } from "solid-js";
import { splitProps } from "solid-js";

export type PageLayoutProps = ParentProps<{
  class?: string;
}>;

export function PageLayout(props: PageLayoutProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={`bg-cream-200 text-ink-900 flex min-h-screen flex-col font-serif ${local.class ?? ""}`}
      {...rest}
    >
      <div class="flex-1">{local.children}</div>
      <PageFooter />
    </div>
  );
}

export function PageFooter() {
  return (
    <footer class="border-cream-300 bg-cream-100 text-ink-900 border-t px-6 py-8 text-center text-sm">
      <p class="mb-1">Made with 🍺 in Amsterdam</p>
      <p class="text-ink-600">&copy; {new Date().getFullYear()} Kroeg</p>
    </footer>
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

import { Title } from "@solidjs/meta";
import Counter from "~/components/Counter";
import { PageContent } from "~/components/PageLayout";

export default function Home() {
  return (
    <PageContent>
      <Title>Kroegen App</Title>
      <h1 class="text-ink-900 mb-8 text-4xl font-bold">Bars will be listed here.</h1>
      <Counter />
      <p class="my-8 max-w-prose leading-relaxed">
        A new version of the kroeg.jan.tf app is being built.
      </p>
    </PageContent>
  );
}

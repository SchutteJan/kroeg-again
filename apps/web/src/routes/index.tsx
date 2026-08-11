import { Title } from "@solidjs/meta";
import { PageContent } from "~/components/PageLayout";

export default function Home() {
  return (
    <PageContent>
      <Title>Kroegen In Amsterdam</Title>
      <h1 class="text-ink-900 mb-4 text-4xl font-bold">Kroegen In Amsterdam</h1>
      <p class="text-ink-600 max-w-prose leading-relaxed">
        Brown bars, terraces, and the locals who fill them.
      </p>
    </PageContent>
  );
}

import { Title } from "@solidjs/meta";
import { PageContent } from "~/components/PageLayout";

export default function About() {
  return (
    <PageContent class="text-center">
      <Title>About</Title>
      <h1 class="text-primary-800 my-16 text-4xl font-thin uppercase">About</h1>
    </PageContent>
  );
}

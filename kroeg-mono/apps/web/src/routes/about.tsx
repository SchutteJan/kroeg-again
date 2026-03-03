import { Title } from "@solidjs/meta";
import { PageContent } from "~/components/PageLayout";

export default function About() {
  return (
    <PageContent class="text-center">
      <Title>About</Title>
      <h1 class="my-16 text-4xl font-thin text-blue-800 uppercase">About</h1>
    </PageContent>
  );
}

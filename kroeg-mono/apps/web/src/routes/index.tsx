import { Title } from "@solidjs/meta";
import Counter from "~/components/Counter";
import { PageContent } from "~/components/PageLayout";

export default function Home() {
  return (
    <PageContent class="text-center">
      <Title>Hello World</Title>
      <h1 class="text-primary-800 my-16 text-4xl font-thin uppercase">Hello world!</h1>
      <Counter />
      <p class="mx-auto my-8 leading-relaxed">
        Visit{" "}
        <a
          href="https://start.solidjs.com"
          target="_blank"
          class="text-primary-500 hover:underline"
        >
          start.solidjs.com
        </a>{" "}
        to learn how to build SolidStart apps.
      </p>
    </PageContent>
  );
}

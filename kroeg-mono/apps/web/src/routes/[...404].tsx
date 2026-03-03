import { Title } from "@solidjs/meta";
import { HttpStatusCode } from "@solidjs/start";
import { PageContent } from "~/components/PageLayout";

export default function NotFound() {
  return (
    <PageContent class="text-center">
      <Title>Not Found</Title>
      <HttpStatusCode code={404} />
      <h1 class="text-primary-800 my-16 text-4xl font-thin uppercase">Page Not Found</h1>
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

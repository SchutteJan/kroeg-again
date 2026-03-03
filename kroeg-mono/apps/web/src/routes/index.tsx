import { Title } from "@solidjs/meta";
import Counter from "~/components/Counter";

export default function Home() {
  return (
    <main class="mx-auto p-4 text-center">
      <Title>Hello World</Title>
      <h1 class="my-16 text-4xl font-thin text-blue-800 uppercase">Hello world!</h1>
      <Counter />
      <p class="mx-auto my-8 leading-relaxed">
        Visit{" "}
        <a href="https://start.solidjs.com" target="_blank" class="text-blue-600 hover:underline">
          start.solidjs.com
        </a>{" "}
        to learn how to build SolidStart apps.
      </p>
    </main>
  );
}

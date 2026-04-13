import { Title } from "@solidjs/meta";
import { PageContent } from "~/components/PageLayout";

export default function About() {
  return (
    <PageContent>
      <Title>About</Title>
      <h1 class="text-ink-900 mb-8 text-4xl font-bold">About</h1>

      <div class="max-w-prose space-y-8">
        <section>
          <h2 class="text-ink-900 mb-3 text-2xl font-semibold">Origin</h2>
          <p class="text-ink-600 leading-relaxed">
            Amsterdam is a city with very much kroegen, and if you have the goal to visit every
            kroeg minimal 1 time in your life, then you must work organised. This website is exactly
            for that in the life called.
          </p>
        </section>

        <section>
          <h2 class="text-ink-900 mb-3 text-2xl font-semibold">Why kroegen</h2>
          <p class="text-ink-600 leading-relaxed">
            You are there at home without that it is your house,{" "}
            <a
              href="https://www.youtube.com/watch?v=DgtA-fiAVKc"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary-500 hover:underline"
            >
              in the kroeg we find each other back.
            </a>
          </p>
        </section>

        <section>
          <h2 class="text-ink-900 mb-3 text-2xl font-semibold">What is exactly a kroeg</h2>
          <p class="text-ink-600 mb-4 leading-relaxed">
            A kroeg is the Dutch word for pub — think a cosy, unpretentious neighbourhood bar where
            locals gather, often with dim lighting, cold beer, and good conversation.
          </p>
          <p class="text-ink-600 leading-relaxed">
            This sounds maybe as a simple question, but the variation of cafés in Amsterdam is big.
            Do only old brown kroegen count as kroegen, does a hotel bar count along? In my
            experience it is difficult to put up a set of rules and it comes often down to the
            atmosphere, so it can be that you sometimes see a kroeg that actually is a restaurant or
            vice versa. To keep everyone content you will also find other hospitality categories
            here.
          </p>
        </section>

        <section>
          <h2 class="text-ink-900 mb-3 text-2xl font-semibold">When counts your visit?</h2>
          <p class="text-ink-600 leading-relaxed">
            Kroegen come and go; while some kroegen the tooth of time withstand, many other
            businesses go bankrupt or get taken over. If you have been at a certain location and
            that business gets taken over and gets a new name, do you then have to go one more time?
            Our dataset is based on the exploitation permit that the municipality of Amsterdam gives
            out, and we cannot always say with certainty whether it is for a new or existing
            business. In the end you have the freedom to decide for yourself if you want to go to a
            kroeg once again. If we think that a business no more exists, then you can still find
            back your visit for that business in your account.
          </p>
        </section>
      </div>
    </PageContent>
  );
}

import { Title } from "@solidjs/meta";
import type { ParentProps } from "solid-js";
import { Button } from "~/components/Button";
import { Card, CardHeader, CardBody, CardFooter } from "~/components/Card";
import {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "~/components/DropdownMenu";
import { PageContent } from "~/components/PageLayout";

function Section(props: ParentProps<{ title: string }>) {
  return (
    <section class="mb-12">
      <h2 class="border-cream-300 text-ink-900 mb-6 border-b pb-2 text-2xl font-semibold">
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}

export default function Design() {
  return (
    <>
      <Title>Design System</Title>

      <PageContent>
        <h1 class="text-ink-900 mb-8 text-4xl font-bold">Design System</h1>

        {/* Color Palette */}
        <Section title="Color Palette">
          <div class="space-y-4">
            <h3 class="text-ink-500 mb-3 text-sm font-medium uppercase">Cream / Background</h3>
            <div class="flex gap-3">
              <div class="bg-cream-50 h-16 w-16 rounded-lg" title="cream-50" />
              <div class="bg-cream-100 h-16 w-16 rounded-lg" title="cream-100" />
              <div class="bg-cream-200 h-16 w-16 rounded-lg" title="cream-200" />
              <div class="bg-cream-300 h-16 w-16 rounded-lg" title="cream-300" />
              <div class="bg-cream-400 h-16 w-16 rounded-lg" title="cream-400" />
            </div>
            <h3 class="text-ink-500 mb-3 text-sm font-medium uppercase">Primary Blue</h3>
            <div class="flex gap-3">
              <div class="bg-primary-50 h-16 w-16 rounded-lg" title="primary-50" />
              <div class="bg-primary-100 h-16 w-16 rounded-lg" title="primary-100" />
              <div class="bg-primary-300 h-16 w-16 rounded-lg" title="primary-300" />
              <div class="bg-primary-500 h-16 w-16 rounded-lg" title="primary-500" />
              <div class="bg-primary-600 h-16 w-16 rounded-lg" title="primary-600" />
              <div class="bg-primary-700 h-16 w-16 rounded-lg" title="primary-700" />
              <div class="bg-primary-800 h-16 w-16 rounded-lg" title="primary-800" />
            </div>
            <h3 class="text-ink-500 mb-3 text-sm font-medium uppercase">Accents</h3>
            <div class="flex gap-3">
              <div class="bg-accent-red h-16 w-16 rounded-lg" title="accent-red" />
              <div class="bg-accent-red-dark h-16 w-16 rounded-lg" title="accent-red-dark" />
              <div class="bg-accent-yellow h-16 w-16 rounded-lg" title="accent-yellow" />
              <div class="bg-accent-yellow-dark h-16 w-16 rounded-lg" title="accent-yellow-dark" />
            </div>
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <div class="space-y-4">
            <h1 class="text-ink-900 text-5xl font-bold">Heading 1</h1>
            <h2 class="text-ink-900 text-4xl font-semibold">Heading 2</h2>
            <h3 class="text-ink-800 text-3xl font-semibold">Heading 3</h3>
            <h4 class="text-ink-800 text-2xl font-medium">Heading 4</h4>
            <h5 class="text-ink-700 text-xl font-medium">Heading 5</h5>
            <h6 class="text-ink-700 text-lg font-medium">Heading 6</h6>
            <p class="text-ink-600 max-w-prose text-base leading-relaxed">
              Body text. The quick brown fox jumps over the lazy dog. This is a paragraph of text
              that shows how body copy reads at the default size with relaxed line height for
              comfortable reading.
            </p>
            <p class="text-ink-500 text-sm">
              Small text for captions, labels, and secondary information.
            </p>
            <p class="text-ink-400 text-xs">Extra small text for fine print and metadata.</p>
            <div class="flex gap-6">
              <a href="#" class="text-primary-500 hover:underline">
                Standard link
              </a>
              <strong class="text-ink-900 font-semibold">Bold text</strong>
              <em class="text-ink-600 italic">Italic text</em>
              <code class="bg-cream-100 text-accent-red rounded px-1.5 py-0.5 font-mono text-sm">
                inline code
              </code>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <div class="space-y-6">
            <div>
              <h3 class="text-ink-500 mb-3 text-sm font-medium uppercase">Variants</h3>
              <div class="flex flex-wrap items-center gap-3">
                <Button variant="default">Default</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>
            <div>
              <h3 class="text-ink-500 mb-3 text-sm font-medium uppercase">Sizes</h3>
              <div class="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>
            <div>
              <h3 class="text-ink-500 mb-3 text-sm font-medium uppercase">Disabled</h3>
              <div class="flex flex-wrap items-center gap-3">
                <Button variant="default" disabled>
                  Default
                </Button>
                <Button variant="destructive" disabled>
                  Destructive
                </Button>
                <Button variant="outline" disabled>
                  Outline
                </Button>
                <Button variant="secondary" disabled>
                  Secondary
                </Button>
                <Button variant="ghost" disabled>
                  Ghost
                </Button>
                <Button variant="link" disabled>
                  Link
                </Button>
              </div>
            </div>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <h3 class="text-ink-900 text-lg font-semibold">Basic Card</h3>
              </CardHeader>
              <CardBody>
                <p class="text-ink-600">
                  A simple card with header and body content. Use cards to group related
                  information.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 class="text-ink-900 text-lg font-semibold">Card with Footer</h3>
              </CardHeader>
              <CardBody>
                <p class="text-ink-600">
                  This card includes a footer area for actions or additional context.
                </p>
              </CardBody>
              <CardFooter>
                <div class="flex gap-2">
                  <Button size="sm" variant="default">
                    Action
                  </Button>
                  <Button size="sm" variant="ghost">
                    Cancel
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardBody>
                <h3 class="text-ink-900 mb-2 text-lg font-semibold">Minimal Card</h3>
                <p class="text-ink-600">
                  A card with just body content and no header or footer dividers.
                </p>
              </CardBody>
            </Card>
          </div>
        </Section>

        {/* Dropdown Menus */}
        <Section title="Dropdown Menus">
          <div class="flex flex-wrap items-start gap-4">
            <DropdownMenu>
              <DropdownTrigger>Actions</DropdownTrigger>
              <DropdownContent>
                <DropdownItem onSelect={() => console.log("edit")}>Edit</DropdownItem>
                <DropdownItem onSelect={() => console.log("duplicate")}>Duplicate</DropdownItem>
                <DropdownSeparator />
                <DropdownItem onSelect={() => console.log("archive")}>Archive</DropdownItem>
                <DropdownItem
                  onSelect={() => console.log("delete")}
                  class="ui-highlighted:text-accent-red-dark text-accent-red"
                >
                  Delete
                </DropdownItem>
              </DropdownContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownTrigger class="border-cream-400 bg-cream-50 rounded-md border">
                With Border
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem>Option A</DropdownItem>
                <DropdownItem>Option B</DropdownItem>
                <DropdownItem>Option C</DropdownItem>
              </DropdownContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownTrigger class="border-primary-500 text-primary-500 hover:bg-primary-50 border">
                Button Trigger
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem>Profile</DropdownItem>
                <DropdownItem>Settings</DropdownItem>
                <DropdownSeparator />
                <DropdownItem>Sign out</DropdownItem>
              </DropdownContent>
            </DropdownMenu>
          </div>
        </Section>

        {/* Page Layout Demo */}
        <Section title="Page Layout">
          <Card>
            <CardBody>
              <p class="text-ink-600 mb-4">
                The current page demonstrates the{" "}
                <code class="bg-cream-100 text-accent-red rounded px-1.5 py-0.5 font-mono text-sm">
                  PageLayout
                </code>{" "}
                and{" "}
                <code class="bg-cream-100 text-accent-red rounded px-1.5 py-0.5 font-mono text-sm">
                  PageContent
                </code>{" "}
                components.
              </p>
              <ul class="text-ink-600 list-inside list-disc space-y-1 text-sm">
                <li>
                  <code class="bg-cream-100 text-accent-red rounded px-1 font-mono">
                    PageLayout
                  </code>{" "}
                  &mdash; full height, warm cream background
                </li>
                <li>
                  <code class="bg-cream-100 text-accent-red rounded px-1 font-mono">
                    PageContent
                  </code>{" "}
                  &mdash; centered max-width container with padding
                </li>
                <li>
                  Width options:{" "}
                  <code class="bg-cream-100 text-accent-red rounded px-1 font-mono">sm</code>,{" "}
                  <code class="bg-cream-100 text-accent-red rounded px-1 font-mono">md</code>,{" "}
                  <code class="bg-cream-100 text-accent-red rounded px-1 font-mono">lg</code>,{" "}
                  <code class="bg-cream-100 text-accent-red rounded px-1 font-mono">xl</code>,{" "}
                  <code class="bg-cream-100 text-accent-red rounded px-1 font-mono">full</code>
                </li>
              </ul>
            </CardBody>
          </Card>
        </Section>
      </PageContent>
    </>
  );
}

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
import { Navbar, NavItem } from "~/components/Navbar";
import { PageLayout, PageContent } from "~/components/PageLayout";

function Section(props: ParentProps<{ title: string }>) {
  return (
    <section class="mb-12">
      <h2 class="mb-6 border-b border-gray-200 pb-2 text-2xl font-semibold text-gray-900">
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}

export default function Design() {
  return (
    <PageLayout>
      <Title>Design System</Title>

      {/* Navbar */}
      <Navbar brand="Kroegen">
        <NavItem href="/design" active>
          Design
        </NavItem>
        <NavItem href="/">Home</NavItem>
        <NavItem href="/about">About</NavItem>
      </Navbar>

      <PageContent width="lg">
        <h1 class="mb-8 text-4xl font-bold text-gray-900">Design System</h1>

        {/* Typography */}
        <Section title="Typography">
          <div class="space-y-4">
            <h1 class="text-5xl font-bold text-gray-900">Heading 1</h1>
            <h2 class="text-4xl font-semibold text-gray-900">Heading 2</h2>
            <h3 class="text-3xl font-semibold text-gray-800">Heading 3</h3>
            <h4 class="text-2xl font-medium text-gray-800">Heading 4</h4>
            <h5 class="text-xl font-medium text-gray-700">Heading 5</h5>
            <h6 class="text-lg font-medium text-gray-700">Heading 6</h6>
            <p class="max-w-prose text-base leading-relaxed text-gray-600">
              Body text. The quick brown fox jumps over the lazy dog. This is a paragraph of text
              that shows how body copy reads at the default size with relaxed line height for
              comfortable reading.
            </p>
            <p class="text-sm text-gray-500">
              Small text for captions, labels, and secondary information.
            </p>
            <p class="text-xs text-gray-400">Extra small text for fine print and metadata.</p>
            <div class="flex gap-6">
              <a href="#" class="text-blue-600 hover:underline">
                Standard link
              </a>
              <strong class="font-semibold text-gray-900">Bold text</strong>
              <em class="text-gray-600 italic">Italic text</em>
              <code class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-pink-600">
                inline code
              </code>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <div class="space-y-6">
            <div>
              <h3 class="mb-3 text-sm font-medium text-gray-500 uppercase">Variants</h3>
              <div class="flex flex-wrap items-center gap-3">
                <Button variant="solid">Solid</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </div>
            <div>
              <h3 class="mb-3 text-sm font-medium text-gray-500 uppercase">Sizes</h3>
              <div class="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>
            <div>
              <h3 class="mb-3 text-sm font-medium text-gray-500 uppercase">Disabled</h3>
              <div class="flex flex-wrap items-center gap-3">
                <Button variant="solid" disabled>
                  Solid
                </Button>
                <Button variant="outline" disabled>
                  Outline
                </Button>
                <Button variant="ghost" disabled>
                  Ghost
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
                <h3 class="text-lg font-semibold text-gray-900">Basic Card</h3>
              </CardHeader>
              <CardBody>
                <p class="text-gray-600">
                  A simple card with header and body content. Use cards to group related
                  information.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 class="text-lg font-semibold text-gray-900">Card with Footer</h3>
              </CardHeader>
              <CardBody>
                <p class="text-gray-600">
                  This card includes a footer area for actions or additional context.
                </p>
              </CardBody>
              <CardFooter>
                <div class="flex gap-2">
                  <Button size="sm" variant="solid">
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
                <h3 class="mb-2 text-lg font-semibold text-gray-900">Minimal Card</h3>
                <p class="text-gray-600">
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
                  class="ui-highlighted:text-red-700 text-red-600"
                >
                  Delete
                </DropdownItem>
              </DropdownContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownTrigger class="rounded-md border border-gray-300 bg-white">
                With Border
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem>Option A</DropdownItem>
                <DropdownItem>Option B</DropdownItem>
                <DropdownItem>Option C</DropdownItem>
              </DropdownContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownTrigger class="border border-blue-600 text-blue-600 hover:bg-blue-50">
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
              <p class="mb-4 text-gray-600">
                The current page demonstrates the{" "}
                <code class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-pink-600">
                  PageLayout
                </code>{" "}
                and{" "}
                <code class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-pink-600">
                  PageContent
                </code>{" "}
                components.
              </p>
              <ul class="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>
                  <code class="rounded bg-gray-100 px-1 font-mono text-pink-600">PageLayout</code>{" "}
                  &mdash; full height, gray background
                </li>
                <li>
                  <code class="rounded bg-gray-100 px-1 font-mono text-pink-600">PageContent</code>{" "}
                  &mdash; centered max-width container with padding
                </li>
                <li>
                  Width options:{" "}
                  <code class="rounded bg-gray-100 px-1 font-mono text-pink-600">sm</code>,{" "}
                  <code class="rounded bg-gray-100 px-1 font-mono text-pink-600">md</code>,{" "}
                  <code class="rounded bg-gray-100 px-1 font-mono text-pink-600">lg</code>,{" "}
                  <code class="rounded bg-gray-100 px-1 font-mono text-pink-600">xl</code>,{" "}
                  <code class="rounded bg-gray-100 px-1 font-mono text-pink-600">full</code>
                </li>
              </ul>
            </CardBody>
          </Card>
        </Section>
      </PageContent>
    </PageLayout>
  );
}

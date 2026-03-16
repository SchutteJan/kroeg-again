import { Title } from "@solidjs/meta";
import type { ParentProps } from "solid-js";
import { createSignal } from "solid-js";
import { Alert } from "~/components/Alert";
import { Button } from "~/components/Button";
import { Card, CardHeader, CardBody, CardFooter } from "~/components/Card";
import {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "~/components/DropdownMenu";
import { LocationCard, LocationPopup, MapPin, MockMap } from "~/components/LocationCard";
import { PageContent } from "~/components/PageLayout";
import { TextInput } from "~/components/TextInput";

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
  const [rukChecked, setRukChecked] = createSignal(true);
  const [brechtChecked, setBrechtChecked] = createSignal(false);

  return (
    <>
      <Title>Design</Title>

      <PageContent>
        <h1 class="text-ink-900 mb-8 text-4xl font-bold">Design</h1>

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
              <div class="bg-accent-green h-16 w-16 rounded-lg" title="accent-green" />
              <div class="bg-accent-green-dark h-16 w-16 rounded-lg" title="accent-green-dark" />
            </div>
          </div>
        </Section>

        {/* Location Cards */}
        <Section title="Location Cards">
          <div class="space-y-4">
            <LocationCard
              name="Café Kompleet | Buurtcafé met Nederlandse gerechten"
              type="Kroeg"
              areaName="Oud-Oost"
              addressLine="Linnaeusstraat 48"
              description="Café Ruk en Pluk aan de Linnaeusstraat in Amsterdam Oost is een iconische bruine kroeg. Het staat bekend om zijn excentrieke interieur en biedt een warme, chaotische en feestelijke sfeer. Het is een favoriete plek voor locals om te genieten van een drankje en typisch Nederlandse snacks."
              imageUrl="https://images.jan.tf/1UAaYm897pM3B_YQWSx7fDqvrVY1Ip7XOa4AkJCyjSM/rs:fit:300:300/plain/https%3A%2F%2Fimage.parool.nl%2F38722782%2Fwidth%2F768%2Fgezelligheid-in-cafe-ruk-en-pluk-op-de-linnaeusstraat-tijdens"
              checkedIn={rukChecked()}
              onToggleCheckIn={() => setRukChecked((v) => !v)}
            />
            <LocationCard
              name="Café Brecht"
              type="Kroeg"
              areaName="Centrum"
              addressLine="Weteringschans 157"
              description="Café Brecht is een gezellig Berlijn-geïnspireerd café aan de Weteringschans. Met zijn vintage meubels, kaarslicht en uitgebreide borrelkaart is het de perfecte plek voor een ontspannen avond met vrienden."
              imageUrl="https://images.jan.tf/zf09CdZbxP5idXMq7HgIdOmXYVkKdrwc6bujajDCCXQ/rs:fit:300:300/plain/https%3A%2F%2Flh3.googleusercontent.com%2Fplaces%2FANXAkqEIE8LEimIlg32HKlHKmwOlODmYtY19kYMu7PMGnFoJ7U0RpQO_vPdA9LaRGvi55eUtQML7pyCuj7wTKX6rviSmiDWM2kotlzY%3Ds1600-w512"
              checkedIn={brechtChecked()}
              onToggleCheckIn={() => setBrechtChecked((v) => !v)}
            />
          </div>
        </Section>

        {/* Map View */}
        <Section title="Map View">
          <MockMap>
            {/* Pin */}
            <div class="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-full">
              <MapPin checked={rukChecked()} />
            </div>
            {/* Popup with arrow, anchored above the pin */}
            <div class="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+2rem)]">
              <LocationPopup
                name="Café Kompleet | Buurtcafé met Nederlandse gerechten"
                type="Kroeg"
                imageUrl="https://images.jan.tf/1UAaYm897pM3B_YQWSx7fDqvrVY1Ip7XOa4AkJCyjSM/rs:fit:300:300/plain/https%3A%2F%2Fimage.parool.nl%2F38722782%2Fwidth%2F768%2Fgezelligheid-in-cafe-ruk-en-pluk-op-de-linnaeusstraat-tijdens"
                checkedIn={rukChecked()}
                onToggleCheckIn={() => setRukChecked((v) => !v)}
              />
            </div>
          </MockMap>
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

        {/* Text Inputs */}
        <Section title="Text Inputs">
          <div class="max-w-sm space-y-4">
            <TextInput label="Email" type="email" placeholder="you@example.com" />
            <TextInput label="Password" type="password" placeholder="••••••••" />
            <TextInput label="Disabled" placeholder="Cannot edit" disabled />
            <TextInput label="Required" required />
          </div>
        </Section>

        {/* Alerts */}
        <Section title="Alerts">
          <div class="max-w-sm space-y-3">
            <Alert variant="error">Something went wrong. Please try again.</Alert>
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
      </PageContent>
    </>
  );
}

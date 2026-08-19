import { Title } from "@solidjs/meta";
import {
  action,
  createAsync,
  json,
  query,
  useAction,
  useNavigate,
  useSearchParams,
  useSubmission,
  type RouteDefinition,
} from "@solidjs/router";
import { For, Show, Suspense } from "solid-js";
import { getRequestEvent } from "solid-js/web";
import { Alert } from "~/components/Alert";
import { Button } from "~/components/Button";
import { PageContent } from "~/components/PageLayout";
import { Pill } from "~/components/Pill";
import { LicenseRepository } from "~/license/repository";
import type { SyncResult } from "~/routes/api/licenses/sync";

const PAGE_SIZE = 50;

const getLicensePage = query(async (cursor?: string) => {
  "use server";
  const event = getRequestEvent();
  if (!event) {
    throw new Error("getLicensePage requires a request event");
  }
  const repo = new LicenseRepository(event.locals.db);
  return repo.listLicenses(cursor ?? null, PAGE_SIZE);
}, "license-page");

const syncLicenses = action(async () => {
  const response = await fetch("/api/licenses/sync", { method: "POST" });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? `Sync failed with status ${response.status}`);
  }
  // The sync writes new rows, so every page of the list is stale afterwards.
  return json(body as SyncResult, { revalidate: getLicensePage.key });
}, "sync-licenses");

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const route: RouteDefinition = {
  preload: ({ location }) => getLicensePage(firstParam(location.query.cursor)),
};

export default function AdminLicenses() {
  const [searchParams, setSearchParams] = useSearchParams<{ cursor?: string }>();
  const navigate = useNavigate();

  const cursor = () => firstParam(searchParams.cursor);
  const page = createAsync(() => getLicensePage(cursor()));

  const sync = useAction(syncLicenses);
  const submission = useSubmission(syncLicenses);

  return (
    <PageContent>
      <Title>Licenses — Admin</Title>
      <div class="mb-8 flex items-center justify-between gap-4">
        <h1 class="text-ink-900 text-4xl font-bold">Licenses</h1>
        <Button disabled={submission.pending} onClick={() => sync()}>
          {submission.pending ? "Syncing…" : "Sync"}
        </Button>
      </div>

      <Show when={submission.error}>
        <Alert variant="error" class="mb-6">
          {submission.error.message ?? "Sync failed"}
        </Alert>
      </Show>

      <Show when={!submission.pending && (submission.result as SyncResult | undefined)}>
        {(result) => (
          <Alert variant={result().failed > 0 ? "warning" : "success"} class="mb-6">
            Synced {result().fetched} licenses: {result().created} created, {result().updated}{" "}
            updated
            <Show when={result().failed > 0}>, {result().failed} failed</Show>.
          </Alert>
        )}
      </Show>

      <Suspense fallback={<p class="text-ink-500">Loading…</p>}>
        <Show
          when={(page()?.items ?? []).length > 0}
          fallback={
            <p class="text-ink-500 max-w-prose leading-relaxed">
              No licenses yet. Hit <em>Sync</em> to import the Amsterdam dataset.
            </p>
          }
        >
          <ul class="divide-cream-300 border-cream-300 divide-y rounded-lg border">
            <For each={page()?.items}>
              {(lic) => (
                <li class="bg-cream-100 flex items-baseline justify-between gap-4 px-4 py-3">
                  <div class="min-w-0">
                    <div class="text-ink-900 truncate font-semibold">
                      {lic.zaaknaam ?? lic.featureId}
                    </div>
                    <Show when={lic.adres}>
                      <div class="text-ink-500 truncate text-xs">
                        {lic.adres}
                        <Show when={lic.postcode}>
                          <span> · {lic.postcode}</span>
                        </Show>
                      </div>
                    </Show>
                  </div>
                  <div class="flex shrink-0 items-center gap-2">
                    <Show when={lic.zaakCategorie}>
                      <Pill class="bg-accent-yellow/20 text-ink-800">{lic.zaakCategorie}</Pill>
                    </Show>
                    <Show when={lic.statusVergunning}>
                      <Pill class="bg-cream-200 text-ink-500">{lic.statusVergunning}</Pill>
                    </Show>
                  </div>
                </li>
              )}
            </For>
          </ul>

          {/* Keyset pagination: the cursor lives in the URL, so each page is
              linkable and "Previous" is just a step back through history. */}
          <div class="mt-6 flex items-center justify-between gap-4">
            <Button variant="outline" size="sm" disabled={!cursor()} onClick={() => navigate(-1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!page()?.cursor}
              onClick={() => setSearchParams({ cursor: page()!.cursor })}
            >
              Next
            </Button>
          </div>
        </Show>
      </Suspense>
    </PageContent>
  );
}

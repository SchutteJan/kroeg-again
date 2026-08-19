import type { APIEvent } from "@solidjs/start/server";
import { LicenseRepository } from "~/license/repository";
import { fetchLicenses, parseLicenses } from "~/license/fetcher";
import { createAuthServer } from "~/lib/auth-server";

export type SyncResult = {
  fetched: number;
  created: number;
  updated: number;
  failed: number;
};

async function requireAdmin(event: APIEvent): Promise<Response | null> {
  const fragment = createAuthServer(event.locals.pool);
  const res = await fragment.callRoute("GET", "/me", {
    headers: event.request.headers,
  });

  if (res.type !== "json") {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (res.data.role !== "admin") {
    return Response.json({ error: "Admin role required" }, { status: 403 });
  }
  return null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(event: APIEvent): Promise<Response> {
  const unauthorized = await requireAdmin(event);
  if (unauthorized) {
    return unauthorized;
  }

  let features;
  try {
    features = parseLicenses(await fetchLicenses());
  } catch (error) {
    return Response.json(
      { error: "Could not read the Amsterdam license dataset", detail: errorMessage(error) },
      { status: 502 },
    );
  }

  const repo = new LicenseRepository(event.locals.db);

  // Upserted one by one so a single bad feature doesn't drop the whole sync.
  let created = 0;
  let updated = 0;
  let failed = 0;
  // TODO: handle deletions

  for (const feature of features) {
    try {
      const { createdOrUpdated } = await repo.upsertLicense(feature);
      if (createdOrUpdated === "created") {
        created++;
      } else {
        updated++;
      }
    } catch {
      failed++;
    }
  }

  const result: SyncResult = {
    fetched: features.length,
    created,
    updated,
    failed,
  };

  return Response.json(result);
}

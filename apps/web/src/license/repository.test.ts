import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LicenseRepository } from "./repository";
import type { LicenseFeature } from "./fetcher";
import { createTestDb, type TestDb } from "~/lib/test-db";

let testDb: TestDb;
let repo: LicenseRepository;

const sampleFeature = (overrides: Partial<LicenseFeature> = {}): LicenseFeature => ({
  type: "Feature",
  id: "exploitatievergunning.266500627",
  geometry: { type: "Point", coordinates: [4.9198, 52.3534] },
  properties: {
    id: 266500627,
    zaaknummer: 1115,
    zaaknaam: "Café Oost",
    adres: "Krugerplein 40",
    zaakCategorie: "Café",
    zaakSpecificatie: "Café",
    begindatum: "2022-02-01",
    einddatum: "2027-02-01",
    postcode: "1091LA",
    statusVergunning: "Verleend",
  },
  ...overrides,
});

beforeAll(async () => {
  testDb = await createTestDb();
});

beforeEach(async () => {
  await testDb.truncate(["licenses"]);
  repo = new LicenseRepository(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

describe("upsertLicense", () => {
  it("creates a license on first call, then updates the same row on a repeat call", async () => {
    const created = await repo.upsertLicense(sampleFeature());
    expect(created.createdOrUpdated).toBe("created");
    expect(created.license.featureId).toBe("exploitatievergunning.266500627");

    const updated = await repo.upsertLicense(
      sampleFeature({
        properties: { ...sampleFeature().properties, zaaknaam: "Café West" },
      }),
    );
    expect(updated.createdOrUpdated).toBe("updated");
    expect(updated.license.id).toBe(created.license.id);
    expect(updated.license.zaaknaam).toBe("Café West");
  });
});

describe("getLicenseById", () => {
  it("returns the license for a known id, or null otherwise", async () => {
    const { license } = await repo.upsertLicense(sampleFeature());

    await expect(repo.getLicenseById(license.id)).resolves.toMatchObject({ id: license.id });
    await expect(repo.getLicenseById(license.id + 1)).resolves.toBeNull();
  });
});

describe("getLicenseByFeatureId", () => {
  it("returns the license for a known feature id, or null otherwise", async () => {
    const { license } = await repo.upsertLicense(sampleFeature());

    await expect(repo.getLicenseByFeatureId(license.featureId)).resolves.toMatchObject({
      id: license.id,
    });
    await expect(repo.getLicenseByFeatureId("does-not-exist")).resolves.toBeNull();
  });
});

describe("listLicenses", () => {
  it("pages through results in id order using the returned cursor", async () => {
    for (let i = 0; i < 3; i++) {
      await repo.upsertLicense(
        sampleFeature({
          id: `feature-${i}`,
          properties: { ...sampleFeature().properties, zaaknummer: i },
        }),
      );
    }

    const firstPage = await repo.listLicenses(null, 2);
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.cursor).not.toBeNull();

    const secondPage = await repo.listLicenses(firstPage.cursor, 2);
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.cursor).toBeNull();

    const allIds = [...firstPage.items, ...secondPage.items].map((l) => l.id);
    expect(new Set(allIds).size).toBe(3);
  });
});

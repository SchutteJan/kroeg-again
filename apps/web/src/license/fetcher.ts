import { FeatureSchema } from "~/lib/geojson";
import { z } from "zod";

// Some of these fields can be null, even though it seems like they shouldn't
export const LicensePropertiesSchema = z.object({
  id: z.number(),
  zaaknummer: z.number(),
  zaaknaam: z.string().nullable(),
  adres: z.string(),
  zaakCategorie: z.string(),
  zaakSpecificatie: z.string().nullable(),
  begindatum: z.string().nullable(),
  einddatum: z.string().nullable(),
  postcode: z.string().nullable(),
  statusVergunning: z.union([z.literal("Verleend"), z.literal("Deels verleend")]).nullable(),
  // Other properties we're not tracking yet
  // terrasgeometrie (!!!)
  // openingstijdenZoDoVan
  // openingstijdenZoDoTot
  // openingstijdenVrZaVan
  // openingstijdenVrZaTot
  // oTijdenTerrasZoDoVan
  // oTijdenTerrasZoDoTot
  // oTijdenTerrasVrZaVan
  // oTijdenTerrasVrZaTot
  // statusTijdelijkTerras
  // toestemmingTijdelijkTerras
  // publBesluitTijdelijkTerras
  // tijdelijkTerrasDetails
  // statusVerlengingTijdelijkTerras
  // verlengingTijdelijkTerrasDetails
});

export type LicenseProperties = z.infer<typeof LicensePropertiesSchema>;

export const LicenseFeatureSchema = FeatureSchema.extend({
  properties: LicensePropertiesSchema,
});
export type LicenseFeature = z.infer<typeof LicenseFeatureSchema>;

export function parseLicenses(payload: unknown): LicenseFeature[] {
  const features = (payload as { features?: unknown })?.features;
  if (Array.isArray(features)) {
    const parsedLicenses = z.array(LicenseFeatureSchema).safeParse(features);
    if (parsedLicenses.success) {
      return parsedLicenses.data;
    }
  }
  throw new Error("Could not parse license payload"); // TODO: Figure out error handling
}

export async function fetchLicenses() {
  const response = await fetch(
    "https://api.data.amsterdam.nl/v1/horeca/exploitatievergunning?_format=geojson",
    {
      headers: { Accept: "application/geo+json, application/json" },
    },
  );

  return await response.json();
}

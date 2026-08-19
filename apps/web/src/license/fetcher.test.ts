import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseLicenses } from "./fetcher";

const samplePath = fileURLToPath(new URL("sample.json", import.meta.url));
const samplePayload = JSON.parse(readFileSync(samplePath, "utf-8"));

describe("parseLicenses", () => {
  it("parses every feature in sample.json", () => {
    const features = parseLicenses(samplePayload);

    expect(features).toHaveLength(samplePayload.features.length);
    expect(features.every((f) => f.type === "Feature")).toBe(true);
  });
});

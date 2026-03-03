import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { pageActTool } from "../tools/page-act-tool";
import { pageObserveTool } from "../tools/page-observe-tool";
import { pageExtractTool } from "../tools/page-extract-tool";
import { pageNavigateTool } from "../tools/page-navigate-tool";
import {
  kroegApiCreateDecisionTool,
  kroegApiGetUncuratedTool,
  kroegApiPendingTool,
  kroegApiSearchLicensesTool,
  kroegApiStatsTool,
  kroegApiSyncLicensesTool,
  kroegApiVerifyTool,
} from "../tools/kroeg-api-tools";
import { gmapsPlaceTool } from "../tools/gmaps-place-tool";
import { geoDistanceTool } from "../tools/geo-distance-tool";

const memory = new Memory();

export const kroegAgent = new Agent({
  id: "kroeg-agent",
  name: "Kroeg Agent",
  instructions: `
  You are an agent that is tasked to curate a dataset of all kroegen in Amsterdam,
  it is of the highest priority that this dataset is up-to-date and exact.

  The data source you have is provided by the municipality of Amsterdam, but it only contains alcohol licenses.
  There are several problems with this dataset:

  - The "zaaknaam" associated with a license might not be what the bar is called (the company name is not always the same as the name of the bar)
  - The zaak category of a license is almost always wrong, kroegen can be marked as restaurants and vice versa.
  - A place might have an alcohol license but only serve coffee (and are marked as Cafe)

  Your job is to correctly label the location that belongs to a license. Potential labels are:

  - bar (kroeg)
  - wine bar
  - coffeeshop/weed
  - coffeeshop/cafe
  - restaurant
  - hotel bar
  - event space (location that can be rented by businesses)
  - sportkantine
  - cinema
  - other

  While we record the exact label, the most important one is bar/kroeg.

  What constitutes a "kroeg"?
  - They serve beer, but wine bars are also allowed
  - They serve snacks like bitterballen, fries, hard-boiled eggs, cheese platter
  - They *can* serve dinner/lunch/breakfast, but it must NOT be their primary function
  - Coffeeshops (in the weed sense) are never bars

  Your primary functions are:
  - Request uncurated license/location
  - Determine the kind of business this location is (label correctly)
  - Sanitize the name of the location
  - Make curation decision
  - Try to match the found location to existing entries in the dataset
  - Add new if unmatched, update curation decision otherwise

  Use the Kroeg API tools to fetch uncurated licenses and submit decisions.
  The API is available at http://localhost:5173 by default.
  For API-key endpoints, use the provided API key from environment (KROEG_API_KEY).
  For session-protected endpoints, use the session bearer token (KROEG_AUTH_TOKEN).

  Use the pageActTool to perform actions on webpages.
  Use the pageObserveTool to find elements on webpages.
  Use the pageExtractTool to extract data from webpages.
  Use the pageNavigateTool to navigate to a URL.
  Use gmapsPlaceTool to query Google Maps Places for cross-referencing.
  Use geoDistanceTool to verify that Google Maps coordinates are close enough to the license coordinates.
  Use kroegApiSearchLicensesTool to search all licenses when a place seems missing.
`,
  model: process.env.MODEL || "openai/gpt-5.2-2025-12-11",
  tools: {
    // pageActTool,
    // pageObserveTool,
    // pageExtractTool,
    // pageNavigateTool,
    kroegApiGetUncuratedTool,
    kroegApiCreateDecisionTool,
    kroegApiStatsTool,
    kroegApiPendingTool,
    kroegApiSearchLicensesTool,
    kroegApiVerifyTool,
    kroegApiSyncLicensesTool,
    gmapsPlaceTool,
    geoDistanceTool,
  },
  memory: memory,
});

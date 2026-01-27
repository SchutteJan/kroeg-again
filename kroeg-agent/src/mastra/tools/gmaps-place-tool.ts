import { createTool } from '@mastra/core/tools';
import { PlacesClient } from '@googlemaps/places';
import { z } from 'zod';

const defaultLanguage = 'nl';

const inputSchema = z.object({
  query: z.string().optional().describe('Text query for Places search'),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional()
    .describe('Bias search around a coordinate'),
  radius: z.number().int().optional().describe('Search radius in meters'),
  type: z.string().optional().describe('Optional place type filter'),
  language: z.string().optional().describe('Response language'),
  place_id: z.string().optional().describe('Place ID for details lookup'),
  fieldMask: z
    .string()
    .optional()
    .describe('Field mask to request (Places API New)'),
});

const client = new PlacesClient({ fallback: true });

export const gmapsPlaceTool = createTool({
  id: 'gmaps-place',
  description:
    'Query Google Maps Places API (New) via the official Node SDK and return the raw response.',
  inputSchema,
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const apiKey = process.env.GMAPS_API;
    if (!apiKey) {
      throw new Error('GMAPS_API is not set');
    }

    const language = context.language || defaultLanguage;

    if (context.place_id) {
      const fieldMask =
        context.fieldMask ||
        'id,displayName,formattedAddress,location,primaryType,types,websiteUri,businessStatus,regularOpeningHours';
      const [place] = await client.getPlace(
        {
          name: `places/${context.place_id}`,
          languageCode: language,
        },
        {
          otherArgs: {
            headers: {
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': fieldMask,
            },
          },
        },
      );
      return place;
    }

    if (!context.query) {
      throw new Error('Provide query or place_id');
    }

    const fieldMask =
      context.fieldMask ||
      'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.businessStatus';

    const locationBias =
      context.location && context.radius
        ? {
            circle: {
              center: {
                latitude: context.location.lat,
                longitude: context.location.lng,
              },
              radius: context.radius,
            },
          }
        : undefined;

    const [response] = await client.searchText(
      {
        textQuery: context.query,
        languageCode: language,
        includedType: context.type,
        locationBias,
      },
      {
        otherArgs: {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': fieldMask,
          },
        },
      },
    );

    return response;
  },
});

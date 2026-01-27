import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const inputSchema = z.object({
  a: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  b: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

export const geoDistanceTool = createTool({
  id: 'geo-distance',
  description: 'Compute the distance in meters between two lat/lng points.',
  inputSchema,
  outputSchema: z.object({
    distance_meters: z.number(),
  }),
  execute: async ({ context }) => {
    const R = 6371000;
    const toRad = (value: number) => (value * Math.PI) / 180;

    const lat1 = toRad(context.a.lat);
    const lon1 = toRad(context.a.lng);
    const lat2 = toRad(context.b.lat);
    const lon2 = toRad(context.b.lng);

    const dlat = lat2 - lat1;
    const dlon = lon2 - lon1;

    const h =
      Math.sin(dlat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

    return { distance_meters: R * c };
  },
});

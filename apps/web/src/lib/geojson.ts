import { z } from "zod";

export const PositionSchema = z.tuple([z.number(), z.number(), z.number().optional()]);
export type Position = z.infer<typeof PositionSchema>;

export const PointSchema = z.object({
  type: z.literal("Point"),
  coordinates: PositionSchema,
});
export type Point = z.infer<typeof PointSchema>;

export const GeometrySchema = PointSchema; // Only types encountered so far
export type Geometry = z.infer<typeof GeometrySchema>;

export const FeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.union([z.string(), z.number()]).optional(),
  geometry: GeometrySchema.nullable(),
  properties: z.record(z.string(), z.unknown()).nullable(),
});
export type Feature = z.infer<typeof FeatureSchema>;

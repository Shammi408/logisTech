// src/api/schemas/truckSchemas.ts
import { z } from "zod";

export const registerTruckSchema = z.object({
  capacity: z.number().int().positive(),
});

export const loadTruckSchema = z.object({
  trackingId: z.string().optional(),
  size: z.number().int().positive(),
  destination: z.string().optional(),
});

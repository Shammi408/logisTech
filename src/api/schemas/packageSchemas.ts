import { z } from "zod";

export const createPackageSchema = z.object({
  trackingId: z.string().optional(),
  size: z.number().int().positive(),
  destination: z.string().optional(),
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;

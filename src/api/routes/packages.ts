import { Router } from "express";
import { Package } from "../../core/Package";
import { LogiMaster } from "../../core/LogiMaster";
import { validateBody } from "../middleware/validate";
import { createPackageSchema } from "../schemas/packageSchemas";
import { z } from "zod";
const router = Router();

/**
 * POST /api/packages
 * Body: { trackingId?: string, size: number, destination?: string }
 * Creates a package object and attempts to assign it to a bin.
*/
router.post("/", validateBody(createPackageSchema), async (req, res, next) => {
    try {
        const { trackingId, size, destination } = req.body;
        // if (!size || typeof size !== "number") {
        // return res.status(400).json({ error: "size (number) is required in request body" });
        // }
        const id = trackingId || `PKG-${Date.now().toString().slice(-6)}`;
        const pkg = new Package(id, size, destination || "");
        const lm = LogiMaster.getInstance();
        const ok = await lm.assignPackageToBin(pkg);
        res.json({ assigned: ok, trackingId: pkg.trackingId });
    } catch (err) {
        next(err);
    }
});

/*
    POST /api/packages/simulate
    Body: { count?: number }
    Quickly run X simulated assignments (calls LogiMaster.assignPackageToBin)
*/
router.post("/simulate", 
    validateBody(z.object({ count: z.number().int().positive().optional() })),        
    async (req, res, next) => {
    try {
        const count = Math.max(1, Number(req.body.count) || 10);
        const lm = LogiMaster.getInstance();
        if (lm.binInventory.length === 0) await lm.loadBinInventoryFromDB();

        const results: { trackingId: string; size: number; assigned: boolean }[] = [];
        for (let i = 0; i < count; i++) {
        const size = 1 + Math.floor(Math.random() * 400);
        const pkg = new Package(`SIM-${Date.now().toString().slice(-5)}-${i}`, size, "SIM");
        const assigned = await lm.assignPackageToBin(pkg);
        results.push({ trackingId: pkg.trackingId, size, assigned });
        }
        res.json({ count: results.length, results });
    } catch (err) {
        next(err);
    }
});

export default router;

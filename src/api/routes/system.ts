import { Router } from "express";
import db from "../../db/db";
import { LogiMaster } from "../../core/LogiMaster";

const router = Router();

/*
    GET /api/system/health
    Returns DB connectivity, bin counts, and basic stats
*/
router.get("/health", async (req, res, next) => {
    try {
        const lm = LogiMaster.getInstance();
        const dbTime = await db.query("SELECT now()");
        const binCountRes = await db.query("SELECT COUNT(*) FROM bins");
        const logCountRes = await db.query("SELECT COUNT(*) FROM shipment_logs");

        // ensure in-memory load
        if (lm.binInventory.length === 0) {
        await lm.loadBinInventoryFromDB();
        }
        res.json({
        ok: true,
        dbTime: dbTime.rows[0].now,
        binCount: Number(binCountRes.rows[0].count),
        shipmentLogs: Number(logCountRes.rows[0].count),
        inMemoryBins: lm.binInventory.length
        });
    } catch (err) {
        next(err);
    }
});

export default router;

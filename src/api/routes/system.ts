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
/**
 * GET /api/system/stats
 * Returns basic system metrics and recent logs.
 */
router.get("/stats", async (req, res, next) => {
    try {
        // Run aggregate queries in one transaction / multiple parallel queries
        const q1 = db.query(
        `SELECT
            COUNT(*)::int AS total_bins,
            SUM(CASE WHEN (capacity - used) > 0 THEN 1 ELSE 0 END)::int AS free_bins,
            AVG( CASE WHEN capacity > 0 THEN (used::float / capacity) ELSE 0 END )::float AS avg_util
        FROM bins`
        );

        const q2 = db.query(
        `SELECT COUNT(*)::int AS total_trucks FROM trucks`
        );

        const q3 = db.query(
        `SELECT COUNT(*)::int AS active_truck_loads FROM truck_loads WHERE status = 'loaded'`
        );

        // recent shipment logs
        const q4 = db.query(
        `SELECT id, tracking_id, bin_id, status, created_at
        FROM shipment_logs ORDER BY created_at DESC LIMIT 20`
        );

        const [r1, r2, r3, r4] = await Promise.all([q1, q2, q3, q4]);

        const payload = {
        totalBins: Number(r1.rows[0].total_bins || 0),
        freeBins: Number(r1.rows[0].free_bins || 0),
        avgBinUtilization: Number((r1.rows[0].avg_util ?? 0) * 100), // percentage
        totalTrucks: Number(r2.rows[0].total_trucks || 0),
        activeTruckLoads: Number(r3.rows[0].active_truck_loads || 0),
        recentShipmentLogs: r4.rows.map((r: any) => ({
            id: r.id,
            trackingId: r.tracking_id,
            binId: r.bin_id,
            status: r.status,
            createdAt: r.created_at,
        })),
        ts: new Date().toISOString(),
        };

        res.json(payload);
    } catch (err) {
        next(err);
    }
});

export default router;

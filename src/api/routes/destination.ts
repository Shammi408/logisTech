import { Router } from "express";
import db from "../../db/db";

const router = Router();

/**
 * GET /api/analytics/destinations
 * Query params:
 *   - limit (optional): number of top destinations, default 10
 *   - source (optional): 'truck_loads' or 'shipment_logs' (default 'truck_loads')
 *
 * Returns top destinations with counts.
 */
router.get("/", async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const source = String(req.query.source || "truck_loads");

        // Allowed sources and SQL mapping
        let sql = "";
        if (source === "shipment_logs") {
        // shipment_logs may not have destination; we join with truck_loads if needed — but keep it simple
        sql = `
            SELECT sl.status AS status, tl.destination, COUNT(*)::int AS cnt
            FROM shipment_logs sl
            LEFT JOIN truck_loads tl ON tl.tracking_id = sl.tracking_id
            WHERE tl.destination IS NOT NULL
            GROUP BY tl.destination, sl.status
            ORDER BY cnt DESC
            LIMIT $1
        `;
        const r = await db.query(sql, [limit]);
        const rows = r.rows.map((r: any) => ({
            destination: r.destination,
            status: r.status,
            count: Number(r.cnt),
        }));
        return res.json(rows);
        } else {
        // default: use truck_loads table
        sql = `
            SELECT destination, COUNT(*)::int AS cnt
            FROM truck_loads
            WHERE destination IS NOT NULL
            GROUP BY destination
            ORDER BY cnt DESC
            LIMIT $1
        `;
        const r = await db.query(sql, [limit]);
        const rows = r.rows.map((r: any) => ({
            destination: r.destination,
            count: Number(r.cnt),
        }));
        return res.json(rows);
        }
    } catch (err) {
        next(err);
    }
});

export default router;

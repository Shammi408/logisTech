import { Router } from "express";
import db from "../../db/db";

const router = Router();

type Bucket = { lo: number; hi: number | null; label: string };

/**
 * Parse a buckets query string like "0-50,51-150,151-"
 * Returns an array of Bucket objects.
 * If input is invalid or empty, return default buckets.
 */
function parseBuckets(q?: string): Bucket[] {
    if (!q) {
        return [
        { lo: 0, hi: 50, label: "0-50" },
        { lo: 51, hi: 150, label: "51-150" },
        { lo: 151, hi: null, label: "151+" },
        ];
    }

    const parts = q.split(",").map((p) => p.trim()).filter(Boolean);
    const buckets: Bucket[] = [];

    for (const p of parts) {
        const m = p.match(/^(\d+)-(\d+)?$/);
        if (!m) continue;
        const lo = Number(m[1]);
        const hi = m[2] ? Number(m[2]) : null;
        const label = hi === null ? `${lo}+` : `${lo}-${hi}`;
        buckets.push({ lo, hi, label });
    }

    // fallback to defaults if parsing failed
    if (buckets.length === 0) {
        return [
        { lo: 0, hi: 50, label: "0-50" },
        { lo: 51, hi: 150, label: "51-150" },
        { lo: 151, hi: null, label: "151+" },
        ];
    }
    return buckets;
}

/**
 * GET /api/system/utilization
 * Query params:
 *   - buckets (optional): "0-50,51-150,151-"
 *
 * Response: JSON array of { bucket, bins, freeSpace, avgUtilization }
 */
router.get("/", async (req, res, next) => {
    try {
        const q = String(req.query.buckets || "");
        const buckets = parseBuckets(q);

        // Build a CASE expression for SQL grouping
        const caseClauses: string[] = [];
        buckets.forEach((b, idx) => {
        if (b.hi === null) {
            caseClauses.push(`WHEN capacity >= ${b.lo} THEN '${b.label}'`);
        } else {
            caseClauses.push(`WHEN capacity BETWEEN ${b.lo} AND ${b.hi} THEN '${b.label}'`);
        }
        });
        const caseExpr = `CASE ${caseClauses.join(" ")} ELSE 'other' END AS bucket`;

        // Query: group bins by bucket label, compute bins, free space, avg utilization
        const sql = `
        SELECT
            ${caseExpr},
            COUNT(*)::int AS bins,
            SUM(capacity - used)::int AS free_space,
            AVG(CASE WHEN capacity > 0 THEN (used::float / capacity) ELSE 0 END)::float AS avg_util
        FROM bins
        GROUP BY bucket
        ORDER BY MIN(capacity) ASC NULLS LAST;
        `;

        const result = await db.query(sql);

        // Map rows to desired output, preserve bucket order from parseBuckets
        const rowMap = new Map<string, any>();
        result.rows.forEach((r: any) => {
        rowMap.set(r.bucket, {
            bucket: r.bucket,
            bins: Number(r.bins),
            freeSpace: Number(r.free_space),
            avgUtilization: Number((r.avg_util ?? 0) * 100), // percent
        });
        });

        // Ensure we return buckets in requested order (plus 'other' if present)
        const out: any[] = [];
        for (const b of buckets) {
        const label = b.label;
        out.push(rowMap.get(label) ?? { bucket: label, bins: 0, freeSpace: 0, avgUtilization: 0 });
        }
        if (rowMap.has("other")) {
        out.push(rowMap.get("other"));
        }

        res.json(out);
    } catch (err) {
        next(err);
    }
});

export default router;

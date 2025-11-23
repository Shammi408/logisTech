import { Router } from "express";
import { LogiMaster } from "../../core/LogiMaster";
import db from "../../db/db"

const router = Router();

/*
    GET /api/bins
    List bins (with pagination optional)
*/
router.get("/", async (req, res, next) =>{
    try {
        const lm = LogiMaster.getInstance();
        if(lm.binInventory.length === 0){
            await lm.loadBinInventoryFromDB();
        }

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(200, Number(req.query.limit) || 100);
        const offset = (page - 1) * limit;
        const slice = lm.binInventory.slice(offset, offset + limit).map(b => ({
            binId : b.binId,
            capacity : b.capacity,
            freeSpace : b.getFreeSpace(),
            locationCode : b.locationCode
        }));
        res.json({ page, limit, items: slice, total: lm.binInventory.length });
    } catch (err){
        next(err);
    }
})

/*
    GET /api/bins/free
    List bins ordered by free space descending (top free bins)
*/
router.get("/free", async (req, res, next) => {
  try {
    const lm = LogiMaster.getInstance();
    if (lm.binInventory.length === 0) await lm.loadBinInventoryFromDB();

    const ordered = [...lm.binInventory].sort((a, b) => b.getFreeSpace() - a.getFreeSpace());
    const top = ordered.slice(0, Number(req.query.limit) || 50).map(b => ({
      binId: b.binId,
      capacity: b.capacity,
      freeSpace: b.getFreeSpace(),
      locationCode: b.locationCode
    }));
    res.json({ count: top.length, items: top });
  } catch (err) {
    next(err);
  }
});

/*
    POST /api/bins/seed
    Trigger seeding (dangerous: truncates). Query param ?count=100
*/
router.post("/seed", async (req, res, next) => {
  try {
    const count = Number(req.query.count || 100);
    // reuse your seed script programmatically or call SQL here
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      await client.query("TRUNCATE TABLE shipment_logs, bins RESTART IDENTITY CASCADE");

      // insert simple distribution example
      const values: any[] = [];
      const chunks: string[] = [];
      for (let i = 0; i < count; i++) {
        const cap = 5 + Math.floor(Math.random() * 2000);
        const loc = `R${Math.floor(Math.random() * 100)}-C${Math.floor(Math.random() * 100)}`;
        values.push(cap, loc);
        const idx = i * 2;
        chunks.push(`($${idx + 1}, $${idx + 2})`);
      }
      if (values.length) {
        await client.query(
          `INSERT INTO bins (capacity, location_code) VALUES ${chunks.join(",")}`,
          values
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // reload in-memory
    const lm = LogiMaster.getInstance();
    await lm.loadBinInventoryFromDB();

    res.json({ ok: true, message: `Seeded ${count} bins` });
  } catch (err) {
    next(err);
  }
});

export default router;
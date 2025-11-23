import { Router } from "express";
import { LogiMaster } from "../../core/LogiMaster";
import { Truck } from "../../core/Truck";
import { Package } from "../../core/Package";
import { validateBody } from "../middleware/validate";
import { registerTruckSchema, loadTruckSchema } from "../schemas/truckSchemas";

const router = Router();

/*
    POST /api/trucks/:id/register
    Body: { capacity: number }
*/
router.post("/:id/register", validateBody(registerTruckSchema), async (req, res, next) => {
  try {
    const id = req.params.id;
    const capacity = Number(req.body.capacity);
    if (!capacity || capacity <= 0) return res.status(400).json({ error: "capacity required" });

    const truck = new Truck(id, capacity);
    const lm = LogiMaster.getInstance();
    await lm.registerTruck(truck);
    res.json({ ok: true, truckId: id, capacity });
  } catch (err) {
    next(err);
  }
});

/*
    POST /api/trucks/:id/load
    Body: { trackingId?: string, size: number, destination?: string }
*/
router.post("/:id/load", validateBody(loadTruckSchema), async (req, res, next) => {
  try {
    const id = req.params.id;
    const { trackingId, size, destination } = req.body;

    const pkg = new Package(trackingId || `T-${Date.now().toString().slice(-6)}`, size, destination || "");
    const lm = LogiMaster.getInstance();
    const ok = await lm.loadPackageToTruck(id, pkg);
    res.json({ ok, truckId: id, trackingId: pkg.trackingId });
  } catch (err) {
    next(err);
  }
});

/*
    POST /api/trucks/:id/rollback/:trackingId
*/
router.post("/:id/rollback/:trackingId", async (req, res, next) => {
  try {
    const { id, trackingId } = req.params;
    const lm = LogiMaster.getInstance();
    const ok = await lm.rollbackTruckLoad(id, trackingId);
    res.json({ ok, truckId: id, trackingId });
  } catch (err) {
    next(err);
  }
});

/*
    GET /api/trucks/:id/state
*/
router.get("/:id/state", (req, res, next) => {
  try {
    const id = req.params.id;
    const lm = LogiMaster.getInstance();
    const truck = lm.trucks.get(id);
    if (!truck) return res.status(404).json({ error: "truck not found" });

    // expose stack summary (not exposing Package full objects)
    // We added no getter for the stack; use (truck as any) to peek or add a method
    const stack = (truck as any).stack || [];
    const summary = stack.map((p: Package) => ({ trackingId: p.trackingId, size: p.size }));
    res.json({ truckId: id, capacity: truck.capacity, used: truck.getUsed(), stack: truck.getStackSummary() });
  } catch (err) {
    next(err);
  }
});

export default router;

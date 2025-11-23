import { StorageBin } from "./StorageBin";
import { Package } from "./Package";
import { SimpleQueue } from "./SimpleQueue";
import { Truck } from "./Truck";
import db from "../db/db";

export class LogiMaster {
  private static instance: LogiMaster | null = null;

  public binInventory: StorageBin[] = [];
  public conveyorQueue = new SimpleQueue<Package>(); // uses amortized O(1) queue
  public trucks: Map<string, Truck> = new Map();

  private constructor() {}

  public static getInstance(): LogiMaster {
    if (!LogiMaster.instance) {
      LogiMaster.instance = new LogiMaster();
    }
    return LogiMaster.instance;
  }

  // ----- BIN LOGIC -----

  // load from provided array (keeps in-memory only)
  loadBinInventory(bins: StorageBin[]) {
    this.binInventory = bins.sort(StorageBin.compareByCapacity);
  }

  // load bins from the database (use at startup to reconcile)
  async loadBinInventoryFromDB(): Promise<void> {
    const res = await db.query(
      `SELECT bin_id, capacity, used, location_code FROM bins ORDER BY capacity ASC`
    );

    const bins: StorageBin[] = res.rows.map((r: any) => {
      const b = new StorageBin(Number(r.capacity), Number(r.bin_id), r.location_code ?? "");
      // set the in-memory used to DB value (protected property) — startup only
      b.setUsed(Number(r.used || 0));
      return b;
    });

    this.binInventory = bins;
  }

  findBestFitBin(size: number): StorageBin | null {
    if (this.binInventory.length === 0) return null;

    const bins = this.binInventory;
    let left = 0,
      right = bins.length - 1;
    let result: StorageBin | null = null;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (bins[mid].capacity >= size) {
        result = bins[mid];
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    return result;
  }

  /**
   * Try to assign package to a bin and persist in DB transactionally.
   * Returns true on success, false on failure.
   */
  async assignPackageToBin(pkg: Package): Promise<boolean> {
    const bin = this.findBestFitBin(pkg.size);
    if (!bin) return false;

    // optimistic in-memory allocation
    const occupied = bin.occupy_space(pkg.size);
    if (!occupied) return false;

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      // Ensure persistent capacity exists (avoid race)
      const res = await client.query(
        `UPDATE bins
         SET used = used + $1
         WHERE bin_id = $2 AND (capacity - used) >= $1
         RETURNING used`,
        [pkg.size, bin.binId]
      );

      if (res.rowCount === 0) {
        // DB says no space (race or inconsistent)
        await client.query("ROLLBACK");
        // roll back in-memory change
        bin.free_space(pkg.size);
        return false;
      }

      await client.query(
        `INSERT INTO shipment_logs (tracking_id, bin_id, status)
         VALUES ($1, $2, $3)`,
        [pkg.trackingId, bin.binId, "assigned"]
      );

      await client.query("COMMIT");
      return true;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch (e) {
        // ignore
      }
      // rollback in-memory change
      bin.free_space(pkg.size);
      return false;
    } finally {
      client.release();
    }
  }

  // ----- TRUCK LOGIC -----

    async registerTruck(truck: Truck) {
        const client = await db.getClient();
        try {
            await client.query("BEGIN");
            await client.query(
              `INSERT INTO trucks (truck_id, capacity, used)
              VALUES ($1, $2, $3)
              ON CONFLICT (truck_id) DO UPDATE SET capacity = EXCLUDED.capacity`,
              [truck.truckId, truck.capacity, truck.getUsed ? truck.getUsed() : 0]
            );
            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }

        // register in-memory
        this.trucks.set(truck.truckId, truck);
    }
  /**
   * Load trucks from DB on startup to rehydrate in-memory trucks.
   */
    async loadTrucksFromDB(): Promise<void> {
        const res = await db.query(`SELECT truck_id, capacity, used FROM trucks`);
        for (const r of res.rows) {
            const t = new Truck(r.truck_id, Number(r.capacity));
            if (typeof (t as any).setUsed === "function") {
              (t as any).setUsed(Number(r.used || 0));
            } else {
              (t as any).used = Number(r.used || 0);
            }
            this.trucks.set(r.truck_id, t);
        }
    }

/**
   * Load package onto truck in-memory and persist truck_loads + truck.used
   * Transactional: update trucks.used and insert truck_loads atomically.
   * Returns true on success, false on failure (e.g., not enough space).
   */
  async loadPackageToTruck(truckId: string, pkg: Package): Promise<boolean> {
      const truck = this.trucks.get(truckId);
      if (!truck) return false;

      // optimistic in-memory allocate
      const occupied = truck.pushPackage(pkg);
      if (!occupied) return false;

      const client = await db.getClient();
      try {
          await client.query("BEGIN");

          // update trucks.used if there's space (ensure capacity - used >= pkg.size)
          const upd = await client.query(
            `UPDATE trucks SET used = used + $1 WHERE truck_id = $2 AND (capacity - used) >= $1 RETURNING used`,
            [pkg.size, truckId]
          );

          if (upd.rowCount === 0) {
            // cannot allocate persistently: rollback in-memory and return false
            await client.query("ROLLBACK");
            truck.popPackage(); // pop reverts used in-memory
            client.release();
            return false;
          }

          // insert truck_loads record
          await client.query(
            `INSERT INTO truck_loads (truck_id, tracking_id, size, destination, status)
            VALUES ($1, $2, $3, $4, 'loaded')`,
            [truckId, pkg.trackingId, pkg.size, pkg.destination || null]
          );

          await client.query("COMMIT");
          return true;
      } catch (err) {
          try { await client.query("ROLLBACK"); } catch (e) {/* ignore */ }
          // rollback in-memory: pop the package
          truck.popPackage();
          return false;
      } finally {
          client.release();
      }
  }

    async rollbackTruckLoad(truckId: string, trackingId: string): Promise<boolean> {
        const truck = this.trucks.get(truckId);
        if (!truck) return false;

        // Pop in-memory and get the package that was removed
        const popped: (Package & { size: number }) | null =
          typeof (truck as any).popUntil === "function" ? (truck as any).popUntil(trackingId) : null;

        if (!popped) return false;

        const client = await db.getClient();
        try {
          await client.query("BEGIN");

          // Find the latest loaded truck_loads row id for this truck/tracking where status='loaded'
          const findRes = await client.query(
            `SELECT id, size
            FROM truck_loads
            WHERE truck_id = $1 AND tracking_id = $2 AND status = 'loaded'
            ORDER BY loaded_at DESC
            LIMIT 1`,
            [truckId, trackingId]
          );

          if (findRes.rowCount === 0) {
            // nothing in DB to mark as rolled_back — attempt to revert in-memory change (best-effort)
            // push package back and return false
            truck.pushPackage(popped);
            await client.query("ROLLBACK");
            return false;
          }

          const row = findRes.rows[0];
          const targetId = row.id;
          const dbSize = Number(row.size || 0);

          // Mark that truck_loads record as rolled_back
          await client.query(
            `UPDATE truck_loads
            SET status = 'rolled_back'
            WHERE id = $1`,
            [targetId]
          );

          // Decrement trucks.used safely (GREATEST to avoid negative)
          await client.query(
            `UPDATE trucks
            SET used = GREATEST(0, used - $1)
            WHERE truck_id = $2`,
            [dbSize, truckId]
          );

          await client.query("COMMIT");
          return true;
        } catch (err) {
          try {
            await client.query("ROLLBACK");
          } catch (e) {
            // ignore
          }
          // if DB update failed, try to push the package back in memory (best-effort)
          truck.pushPackage(popped);
          return false;
        } finally {
          client.release();
        }
    }

  

  // ----- CONVEYOR BELT LOGIC -----

  enqueuePackage(pkg: Package) {
    this.conveyorQueue.enqueue(pkg);
  }

  dequeuePackage(): Package | undefined {
    return this.conveyorQueue.dequeue();
  }
}
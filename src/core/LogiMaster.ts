// src/core/LogiMaster.ts
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

  registerTruck(truck: Truck) {
    this.trucks.set(truck.truckId, truck);
  }

  loadPackageToTruck(truckId: string, pkg: Package): boolean {
    const truck = this.trucks.get(truckId);
    if (!truck) return false;

    return truck.pushPackage(pkg);
  }

  rollbackTruckLoad(truckId: string, trackingId: string): boolean {
    const truck = this.trucks.get(truckId);
    if (!truck) return false;

    return truck.rollbackLoad(trackingId);
  }

  // ----- CONVEYOR BELT LOGIC -----

  enqueuePackage(pkg: Package) {
    this.conveyorQueue.enqueue(pkg);
  }

  dequeuePackage(): Package | undefined {
    return this.conveyorQueue.dequeue();
  }
}
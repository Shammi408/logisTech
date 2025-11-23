import { LogiMaster } from './core/LogiMaster';
import  db  from "./db/db"

export async function main(){
    console.log("Starting LogiMaster...");

    const ping = await db.query("SELECT now()");
    console.log(" DB connected. Server time: ", ping.rows[0].now);

    const lm = LogiMaster.getInstance();

    console.log("Loading Bins from DB...");
    await lm.loadBinInventoryFromDB();
    await lm.loadTrucksFromDB();
    console.log("Loaded bins: ", lm.binInventory.length, "Loaded trucks:", lm.trucks.size);

    const first = lm.binInventory.slice(0, 5);
    console.log("First few bins:", first.map(b => {
        const free = b.getFreeSpace();
        const used = b.capacity - free;
        return {
            binId: b.binId,
            capacity: b.capacity,
            used: `${used}/${b.capacity}`,
            locationCode: b.locationCode
        };
    }));

    console.log("🚦 System ready.");
}

if (require.main === module) {
    main().catch(err => {
        console.error("❌ Error in startup:", err);
        process.exit(1);
    });
}

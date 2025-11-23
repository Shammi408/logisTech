import { Package } from "../core/Package";
import { LogiMaster } from "../core/LogiMaster";
import db from "../db/db";

function randSize(): number {
    // package sizes 1..400
    return 1 + Math.floor(Math.random() * 400);
}

function randomTracking(id: number) {
    return `PKG-${Date.now().toString().slice(-5)}-${id}`;
}

async function simulateAssignments(count = 50, useDb = false) {
    const lm = LogiMaster.getInstance();

    // ensure bins are loaded from DB first
    await lm.loadBinInventoryFromDB();

    for (let i = 0; i < count; i++) {
        const pkg = new Package(randomTracking(i), randSize(), "DEST");
        // Try to assign to a bin (transactional)
        const ok = await lm.assignPackageToBin(pkg);
        console.log(i + 1, pkg.trackingId, "size=", pkg.size, ok ? "ASSIGNED" : "FAILED");
    }
}

async function main() {
    const arg = process.argv[2];
    const count = arg ? Number(arg) : 50;
    console.log("Simulating assignments:", count);
    await simulateAssignments(count);
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

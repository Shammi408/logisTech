import db from "../db/db";

function makeCapacity(i: number): number {
    // simple distribution:
    // 50% small (5-50), 35% medium (51-300), 15% large (301-2000)
    const r = Math.random();
    if (r < 0.5) return 5 + Math.floor(Math.random() * 46); // 5..50
    if (r < 0.85) return 51 + Math.floor(Math.random() * 250); // 51..300
    return 301 + Math.floor(Math.random() * 1700); // 301..2000
}

async function seedBins(count = 100) {
    const client = await db.getClient();
    try {
    await client.query("BEGIN");
    // truncate to keep id predictable in dev
    await client.query("TRUNCATE TABLE shipment_logs, bins RESTART IDENTITY CASCADE");

    const chunks: string[] = [];
    const values: any[] = [];

    for (let i = 0; i < count; i++) {
        const cap = makeCapacity(i);
        const loc = `R${Math.floor(Math.random() * 100)}-C${Math.floor(Math.random() * 100)}`;
        values.push(cap, loc);
        // builds placeholders like ($1,$2),($3,$4),...
        const idx = i * 2;
        chunks.push(`($${idx + 1}, $${idx + 2})`);
    }

    if (values.length) {
        const sql = `
        INSERT INTO bins (capacity, location_code)
        VALUES ${chunks.join(",")}
        RETURNING bin_id, capacity;
        `;
        const res = await client.query(sql, values);
        console.log(`Inserted ${res.rowCount} bins.`);
    }

    await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("seedBins failed:", err);
    } finally {
        client.release();
    }
}

async function main() {
    const arg = process.argv[2];
    const count = arg ? Number(arg) : 100;
    console.log("Seeding bins, count =", count);
    await seedBins(count);
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

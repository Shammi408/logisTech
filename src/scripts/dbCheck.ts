import db from "../db/db";

async function main() {
    try {
        const client = await db.getClient();

        // Check server time
        const time = await client.query("SELECT now()");
        console.log("📡 DB Connected. Server Time:", time.rows[0].now);

        // Check table existence
        const tables = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
        `);

        console.log("📚 Tables:", tables.rows.map(r => r.table_name));

        // Check counts
        const binCount = await client.query("SELECT COUNT(*) FROM bins");
        const logCount = await client.query("SELECT COUNT(*) FROM shipment_logs");

        console.log(`📦 bins: ${binCount.rows[0].count}`);
        console.log(`📝 shipment_logs: ${logCount.rows[0].count}`);

        client.release();
        console.log("✅ DB health OK");
    } catch (err) {
        console.error("❌ DB health FAILED:", err);
    }
}

main();

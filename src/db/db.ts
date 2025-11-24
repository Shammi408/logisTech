// src/db/db.ts
import { Pool } from "pg";

const pool = new Pool({
  user: process.env.PGUSER || "logi",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "logistech",
  password: process.env.PGPASSWORD || "logi_pass",
  port: Number(process.env.PGPORT || 5433),
  max: 10,
});

// Prevent Node from crashing on pool errors (e.g. when Postgres is shutdown by tests)
pool.on("error", (err) => {
  // Log the pool error; do NOT rethrow
  // This avoids an unhandled 'error' event when the DB is terminated by docker-compose down
  // We can extend this to send the error to your logger instead of console.error.
  console.error("PG Pool error:", err && err.message ? err.message : err);
});

export default {
  query: (text: string, params?: any[]) => pool.query(text, params),
  // helper to get a client for transactions
  getClient: async () => {
    const client = await pool.connect();
    return client;
  },
  pool, //expose the pool if needed
  end: async () => { // gracefully close the pool (useful in tests / app shutdown)
    try {
      await pool.end();
      // optional: console.log("PG pool closed");
    } catch (e) {
      console.warn("Error closing PG pool:", e);
    }
  },
};

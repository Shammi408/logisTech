import { Pool } from "pg";

const pool = new Pool({
  user: process.env.PGUSER || "logi",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "logistech",
  password: process.env.PGPASSWORD || "logi_pass",
  port: Number(process.env.PGPORT || 5433),
  max: 10
});

export default {
  pool,
  // helper to get a client for transactions
  async getClient() {
    const client = await pool.connect();
    return client;
  },
  // simple query helper
  async query(text: string, params?: any[]) {
    return pool.query(text, params);
  }
};

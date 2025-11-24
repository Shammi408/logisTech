// --- Set test DB env BEFORE importing anything that instantiates a DB pool ----
process.env.PGHOST = "localhost";
process.env.PGPORT = "55433";
process.env.PGUSER = "logi";
process.env.PGPASSWORD = "logi_pass";
process.env.PGDATABASE = "logistech_test";

import request from "supertest";
import app, { initialize } from "../../src/api/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import db from "../../src/db/db";

jest.setTimeout(300000);

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function exec(cmd: string) {
  return execSync(cmd, { stdio: "inherit" });
}

async function waitForPg(cid: string, maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      // pg_isready returns 0 when ready
      execSync(`docker exec ${cid} pg_isready -U logi`, { stdio: "pipe" });
      return true;
    } catch (e) {
      await sleep(500);
    }
  }
  throw new Error("Postgres did not become ready in time");
}

function listMigrationFiles(): string[] {
  const migrationsDir = path.join(__dirname, "../../migrations");
  return fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()
    : [];
}

describe("Integration tests (API + Postgres)", () => {
  beforeAll(async () => {
    console.log("Bringing up test DB with docker-compose.test.yml...");

    // If a test DB container is already running, reuse it; otherwise try to recreate.
    let cid = execSync('docker compose -f docker-compose.test.yml ps -q dbtest', { encoding: "utf8" })
      .toString()
      .trim();

    if (!cid) {
      // Try to remove previous artifacts (best-effort) to avoid name conflicts
      try {
        execSync("docker compose -f docker-compose.test.yml down -v --remove-orphans", { stdio: "inherit" });
      } catch (e) {
        // ignore
      }
      exec("docker compose -f docker-compose.test.yml up -d");
      // now read container id
      cid = execSync('docker compose -f docker-compose.test.yml ps -q dbtest', { encoding: "utf8" })
        .toString()
        .trim();
    }

    if (!cid) throw new Error("Could not start or find test DB container (cid is empty)");

    // wait for DB readiness
    await waitForPg(cid, 60000);

    // apply migrations
    const files = listMigrationFiles();
    if (files.length === 0) {
      console.warn("No migration files found in ./migrations (skipping migrations)");
    } else {
      for (const f of files) {
        console.log("Applying migration:", f);
        const fullPath = path.join(__dirname, "../../migrations", f);
        // copy file into container
        execSync(`docker cp "${fullPath}" ${cid}:/tmp/${f}`, { stdio: "inherit" });
        // execute psql inside container (stop on error)
        execSync(`docker exec ${cid} psql -U logi -d logistech_test -v ON_ERROR_STOP=1 -f /tmp/${f}`, {
          stdio: "inherit",
          timeout: 600000,
        });
        console.log("Applied migration:", f);
      }
    }

    // small wait to allow DB to settle
    await sleep(1000);

    // hydrate in-memory state
    await initialize();
  });

  afterAll(async () => {
    try {
      await db.end?.();
    } catch (e) {
      console.warn("db.end failed:", e);
    }
    try {
      execSync("docker compose -f docker-compose.test.yml down -v --remove-orphans", { stdio: "inherit" });
    } catch (e) {
      console.warn("Failed to tear down docker-compose test cluster:", e);
    }
  });

  test("seed small bins and assign a package -> verifies DB changes", async () => {
    const seedRes = await request(app).post("/api/bins/seed?count=20").send();
    expect(seedRes.status).toBe(200);

    const health = await request(app).get("/api/system/health");
    expect(health.status).toBe(200);
    expect(health.body.binCount).toBeGreaterThanOrEqual(1);

    const pkg = { size: 10, destination: "TEST" };
    const assignRes = await request(app).post("/api/packages").send(pkg);
    expect(assignRes.status).toBe(200);
    expect(assignRes.body).toHaveProperty("assigned");

    const reg = await request(app).post("/api/trucks/TR-IT/register").send({ capacity: 500 });
    expect(reg.status).toBe(200);

    const load = await request(app).post("/api/trucks/TR-IT/load").send({ size: 50, trackingId: "IT-PKG-1" });
    expect(load.status).toBe(200);
    expect(load.body.ok).toBeTruthy();

    const res = await db.query("SELECT * FROM trucks WHERE truck_id = $1", ["TR-IT"]);
    expect(res.rowCount).toBe(1);
    expect(Number(res.rows[0].capacity)).toBe(500);

    const loads = await db.query("SELECT * FROM truck_loads WHERE truck_id = $1", ["TR-IT"]);
    expect(loads.rowCount).toBeGreaterThanOrEqual(1);
  });
});

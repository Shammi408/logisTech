// set env before imports
process.env.PGHOST = "localhost";
process.env.PGPORT = "55433";
process.env.PGUSER = "logi";
process.env.PGPASSWORD = "logi_pass";
process.env.PGDATABASE = "logistech_test";

import request from "supertest";
import app, { initialize } from "../../src/api/server";
import { execSync } from "child_process";
import db from "../../src/db/db";
import fs from "fs";
import path from "path";

jest.setTimeout(300000);

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function listMigrationFiles(): string[] {
  const migrationsDir = path.join(__dirname, "../../migrations");
  return fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()
    : [];
}

async function ensureDbAndMigrations() {
  let cid = execSync('docker compose -f docker-compose.test.yml ps -q dbtest', { encoding: "utf8" })
    .toString()
    .trim();

  if (!cid) {
    try { execSync("docker compose -f docker-compose.test.yml down -v --remove-orphans", { stdio: "inherit" }); } catch (e) {}
    execSync("docker compose -f docker-compose.test.yml up -d", { stdio: "inherit" });
    cid = execSync('docker compose -f docker-compose.test.yml ps -q dbtest', { encoding: "utf8" })
      .toString()
      .trim();
  }

  if (!cid) throw new Error("Could not start or find test DB container (cid empty)");

  // wait for pg readiness
  const start = Date.now();
  while (Date.now() - start < 30000) {
    try {
      execSync(`docker exec ${cid} pg_isready -U logi`, { stdio: "pipe" });
      break;
    } catch {
      await sleep(500);
    }
  }

  // apply migrations
  const files = listMigrationFiles();
  for (const f of files) {
    const fullPath = path.join(__dirname, "../../migrations", f);
    execSync(`docker cp "${fullPath}" ${cid}:/tmp/${f}`, { stdio: "inherit" });
    execSync(`docker exec ${cid} psql -U logi -d logistech_test -v ON_ERROR_STOP=1 -f /tmp/${f}`, {
      stdio: "inherit",
      timeout: 600000,
    });
  }
}

beforeAll(async () => {
  await ensureDbAndMigrations();
  await initialize();
});

afterAll(async () => {
  await db.end?.();
  try {
    execSync("docker compose -f docker-compose.test.yml down -v --remove-orphans", { stdio: "inherit" });
  } catch (e) { /* ignore */ }
});

test("GET /api/system/stats returns metrics", async () => {
  const res = await request(app).get("/api/system/stats");
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("totalBins");
  expect(res.body).toHaveProperty("avgBinUtilization");
  expect(Array.isArray(res.body.recentShipmentLogs)).toBe(true);
});

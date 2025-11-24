import request from "supertest";
import app, { initialize } from "../../src/api/server";
import { execSync } from "child_process";
import db from "../../src/db/db";

jest.setTimeout(300000);

beforeAll(async () => {
  execSync("docker compose -f docker-compose.test.yml up -d", { stdio: "inherit" });
  // apply migrations same approach as your existing integration test...
  // set env and call initialize()
  process.env.PGHOST = "localhost";
  process.env.PGPORT = "55433";
  process.env.PGUSER = "logi";
  process.env.PGPASSWORD = "logi_pass";
  process.env.PGDATABASE = "logistech_test";
  await initialize();
});

afterAll(async () => {
  await db.end?.();
  execSync("docker compose -f docker-compose.test.yml down -v --remove-orphans", { stdio: "inherit" });
});

test("GET /api/system/stats returns metrics", async () => {
  const res = await request(app).get("/api/system/stats");
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("totalBins");
  expect(res.body).toHaveProperty("avgBinUtilization");
  expect(Array.isArray(res.body.recentShipmentLogs)).toBe(true);
});

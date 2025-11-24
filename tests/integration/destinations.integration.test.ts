import request from "supertest";
import app, { initialize } from "../../src/api/server";
import db from "../../src/db/db";

jest.setTimeout(300000);

beforeAll(async () => {
  process.env.PGHOST = "localhost";
  process.env.PGPORT = "55433";
  process.env.PGUSER = "logi";
  process.env.PGPASSWORD = "logi_pass";
  process.env.PGDATABASE = "logistech_test";
  // ensure DB and migrations are applied as in your other integration test
  await initialize();
});

afterAll(async () => {
  await db.end?.();
});

test("GET /api/analytics/destinations returns list", async () => {
  const res = await request(app).get("/api/analytics/destinations?limit=5");
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

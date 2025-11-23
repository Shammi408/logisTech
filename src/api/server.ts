import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import binsRouter from "./routes/bins";
import packagesRouter from "./routes/packages";
import trucksRouter from "./routes/trucks";
import systemRouter from "./routes/system";
import swaggerUi from "swagger-ui-express";
import * as openapiDoc from "./openapi.json";
import { LogiMaster } from "../core/LogiMaster";
import db from "../db/db";

const app = express();
app.use(cors());
app.use(bodyParser.json());
// serve swagger UI at /api/docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup((openapiDoc as any).default || openapiDoc));

app.use("/api/bins", binsRouter);
app.use("/api/packages", packagesRouter);
app.use("/api/trucks", trucksRouter);
app.use("/api/system", systemRouter);

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});
export async function initialize() {
  const lm = LogiMaster.getInstance();
  // load persistent state
  await lm.loadBinInventoryFromDB();
  await lm.loadTrucksFromDB();
  console.log("Initialized LogiMaster: bins=", lm.binInventory.length, "trucks=", lm.trucks.size);
}

if (require.main === module) {
  (async () => {
    try {
      // optional: quick DB check
      const ping = await db.query("SELECT now()");
      console.log("DB time:", ping.rows[0].now);

      await initialize();

      const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
      app.listen(PORT, () => {
        console.log(`LogiTech API listening on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error("Startup error:", err);
      process.exit(1);
    }
  })();
}

export default app;
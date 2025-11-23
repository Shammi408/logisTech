import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const SQL_DIR = path.join(__dirname, "..", "migrations");

function run(sqlFile: string) {
  console.log("Running migration:", sqlFile);
  // using psql CLI inside running container
  execSync(`docker exec -i logistech_dbtest_1 bash -lc "psql -U logi -d logistech_test -f /tmp/${sqlFile}"`);
}

function copyToContainer(filePath: string) {
  const base = path.basename(filePath);
  execSync(`docker cp ${filePath} logistech_dbtest_1:/tmp/${base}`);
}

function main() {
  const files = fs.readdirSync(SQL_DIR).filter(f => f.endsWith(".sql")).sort();
  for (const f of files) {
    const full = path.join(SQL_DIR, f);
    copyToContainer(full);
    run(f);
  }
  console.log("Migrations complete");
}

main();

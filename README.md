# LogiStech — Automated Warehouse System 

Short summary
-------------
This repository contains the LogiStech warehouse simulation:
- Core domain: bins, trucks, packages, allocation (best-fit)
- Node + TypeScript backend
- PostgreSQL persistence (docker-compose)
- API routes for packages, bins, trucks, analytics
- Integration tests using a disposable Docker test DB

Project Structure
/
├── src/
│   ├── core/           # Storage units, truck, package, LogiMaster
│   ├── api/            # Express routes + server
│   ├── db/             # DB wrapper + pool
│   ├── scripts/        # Seed & simulate scripts
│   └── index.ts
│
├── migrations/         # SQL migrations
├── tests/              # Unit + integration tests
├── docs/               # Additional documentation
├── docker-compose.yml
└── README.md


Quick start (dev)
-----------------
1. Start DB + pgAdmin (from project root):
   docker compose up -d
   npm run dev

2. Ensure Node env (if we need custom port):

# PowerShell
$env:PGHOST="localhost"
$env:PGPORT="5433"
$env:PGUSER="logi"
$env:PGPASSWORD="logi_pass"
$env:PGDATABASE="logistech"


3. Start server:

    npm run dev
        # or
    npm run start

Seed (optional)
    Seed bins:
        npx ts-node src/scripts/seedBins.ts 1000
    Simulate assignments:
        npx ts-node src/scripts/seedPackages.ts 200


Key API endpoints

Health: GET /api/system/health
Bins: GET /api/bins
Seed bins: POST /api/bins/seed?count=200
Packages: POST /api/packages — body { size, destination }

Trucks:

    POST /api/trucks/:id/register — body { capacity }
    POST /api/trucks/:id/load — body { size, trackingId?, destination? }
    POST /api/trucks/:id/rollback/:trackingId
    GET /api/trucks/:id/state

Analytics

    System stats: GET /api/system/stats
    Utilization (bucketed): GET /api/system/utilization (query: ?buckets=0-50,51-150,151-)
    Top destinations: GET /api/analytics/destinations?limit=10&source=truck_loads

Tests

    Unit tests:
        npm test

    Integration tests (starts a disposable Docker test DB):
        npm run test:integration

Notes

    DB migrations are in migrations/ and are applied by integration tests using docker cp + docker exec.
    The DB wrapper includes a pool error handler to avoid unhandled exceptions when the test DB is torn down.
    Use await db.end() in scripts/tests before bringing down the DB to ensure clean shutdown.



📚 Additional Documentation

See the docs/ folder for details:
docs/architecture.md
docs/database.md
docs/api.md
docs/startup-flow.md

-- Shubhendu Shekhar
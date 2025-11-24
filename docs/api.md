# API Documentation

This page lists all API endpoints with purpose and sample usage.

---

# Bins
### GET /api/bins
Returns all bins.

### POST /api/bins/seed?count=N
Populates N random bins into DB.

---

#Packages
### POST /api/packages
Assign package to best-fit bin.

Body:
```json
{
  "size": 120,
  "destination": "DEL"
}

# Trucks
### POST /api/trucks/:id/register
Registers a truck (idempotent).

### POST /api/trucks/:id/load
Loads onto a truck with transactional DB update.

# System Metrics
### GET /api/system/stats
Returns system-wide warehouse metrics.

### GET /api/system/utilization?buckets=0-20,21-100,101-
Returns bucketed storage utilization.

# Analytics
### GET /api/analytics/destinations
Top shipping destinations.
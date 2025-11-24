# Database Schema

The system uses PostgreSQL with 4 core tables:

## 1. bins
Stores storage bin metadata.

| Column       | Type    | Notes                      |
|--------------|---------|----------------------------|
| bin_id       | int PK  | Unique ID                  |
| capacity     | int     | Max size                   |
| used         | int     | Currently allocated        |
| location_code| text    | Optional warehouse code    |


## 2. shipment_logs
Records package-to-bin assignments.


## 3. trucks
Truck master table.

| Column    | Type | Notes          |
|-----------|------|----------------|
| truck_id  | text | primary key     |
| capacity  | int  | max load space |
| used      | int  | current load   |


## 4. truck_loads
All items loaded inside trucks.


## Migrations
Located in `/migrations`.


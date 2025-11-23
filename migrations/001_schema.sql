
-- bins table: persistent bin capacity and used amount
CREATE TABLE IF NOT EXISTS bins (
    bin_id SERIAL PRIMARY KEY,
    capacity INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    location_code TEXT
);

-- shipment_logs table
CREATE TABLE IF NOT EXISTS shipment_logs (
    id SERIAL PRIMARY KEY,
    tracking_id TEXT NOT NULL,
    bin_id INTEGER REFERENCES bins(bin_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT NOT NULL
);

-- index for fast bin searches by capacity
CREATE INDEX IF NOT EXISTS idx_bins_capacity ON bins (capacity);

-- Create trucks table and truck_loads table

CREATE TABLE IF NOT EXISTS trucks (
    truck_id TEXT PRIMARY KEY,
    capacity INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS truck_loads (
    id SERIAL PRIMARY KEY,
    truck_id TEXT NOT NULL REFERENCES trucks(truck_id) ON DELETE CASCADE,
    tracking_id TEXT NOT NULL,
    size INTEGER NOT NULL,
    destination TEXT,
    status TEXT NOT NULL DEFAULT 'loaded', -- 'loaded' | 'rolled_back'
    loaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- index to help queries by truck
CREATE INDEX IF NOT EXISTS idx_truck_loads_truck ON truck_loads (truck_id);

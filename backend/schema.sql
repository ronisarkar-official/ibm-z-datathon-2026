-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create / Update zones table
CREATE TABLE IF NOT EXISTS public.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    elevation NUMERIC NOT NULL,
    district TEXT,
    state TEXT,
    river_basin TEXT,
    population INT,
    commander_name TEXT,
    commander_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In case zones table already exists, ensure new columns are added
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS river_basin TEXT;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS population INT;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS commander_name TEXT;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS commander_phone TEXT;

-- 2. Create / Update predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
    rainfall NUMERIC NOT NULL,
    river_level NUMERIC NOT NULL,
    soil_moisture NUMERIC NOT NULL,
    temperature NUMERIC NOT NULL,
    humidity NUMERIC NOT NULL,
    risk_level TEXT NOT NULL,
    risk_score INT NOT NULL,
    confidence INT DEFAULT 95,
    factors JSONB,
    recommendation TEXT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- In case predictions table already exists, ensure new columns are added
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS confidence INT DEFAULT 95;
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS factors JSONB;

-- 3. Create / Update alert_log table
CREATE TABLE IF NOT EXISTS public.alert_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
    risk_level TEXT NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    order_id UUID
);

ALTER TABLE public.alert_log ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE public.alert_log ADD COLUMN IF NOT EXISTS acknowledged_by TEXT;
ALTER TABLE public.alert_log ADD COLUMN IF NOT EXISTS order_id UUID;

-- 4. Create evacuation_orders table (for persistent evacuation authorization)
CREATE TABLE IF NOT EXISTS public.evacuation_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
    risk_level TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Authorized', -- Authorized, Dispatched, In Progress, Completed, Cancelled
    authorized_by TEXT NOT NULL,
    commander_phone TEXT,
    authorization_code TEXT NOT NULL,
    deployed_units JSONB DEFAULT '[]'::jsonb,
    incident_notes TEXT,
    authorized_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 5. Create shelters table
CREATE TABLE IF NOT EXISTS public.shelters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INT NOT NULL,
    current_occupancy INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Open', -- Open, Standby, Full
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create evacuation_routes table
CREATE TABLE IF NOT EXISTS public.evacuation_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Clear', -- Clear, Restricted, Flooded
    eta TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create broadcast_logs table
CREATE TABLE IF NOT EXISTS public.broadcast_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'Cell Broadcast CAP',
    population_reached INT,
    broadcast_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evacuation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evacuation_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for the Next.js frontend using Anon key)
CREATE POLICY "Allow public read on zones" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Allow public read on predictions" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Allow public read on alert_log" ON public.alert_log FOR SELECT USING (true);
CREATE POLICY "Allow public read on evacuation_orders" ON public.evacuation_orders FOR SELECT USING (true);
CREATE POLICY "Allow public read on shelters" ON public.shelters FOR SELECT USING (true);
CREATE POLICY "Allow public read on evacuation_routes" ON public.evacuation_routes FOR SELECT USING (true);
CREATE POLICY "Allow public read on broadcast_logs" ON public.broadcast_logs FOR SELECT USING (true);

-- Allow public / backend insert & update access
CREATE POLICY "Allow insert on zones" ON public.zones FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on zones" ON public.zones FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert on predictions" ON public.predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on predictions" ON public.predictions FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert on alert_log" ON public.alert_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on alert_log" ON public.alert_log FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert on evacuation_orders" ON public.evacuation_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on evacuation_orders" ON public.evacuation_orders FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert on shelters" ON public.shelters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on shelters" ON public.shelters FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert on evacuation_routes" ON public.evacuation_routes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on evacuation_routes" ON public.evacuation_routes FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert on broadcast_logs" ON public.broadcast_logs FOR INSERT WITH CHECK (true);

-- Enable Supabase Realtime for live updates on the frontend
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evacuation_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shelters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evacuation_routes;

-- Seed default zones with full demographics
INSERT INTO public.zones (id, name, latitude, longitude, elevation, district, state, river_basin, population, commander_name, commander_phone)
VALUES
    ('7f8b9c1d-1111-4444-8888-abcdef000001', 'Kolkata North', 22.5726, 88.3639, 9.0, 'Kolkata', 'West Bengal', 'Hooghly / Ganga Delta', 142500, 'S. K. Mukherjee, IAS', '+91 33 2214-5555'),
    ('7f8b9c1d-2222-4444-8888-abcdef000002', 'Guwahati Riverfront', 26.1445, 91.7362, 55.0, 'Kamrup Metropolitan', 'Assam', 'Brahmaputra Valley', 96000, 'D. H. Saikia, ACS', '+91 361 223-7000'),
    ('7f8b9c1d-3333-4444-8888-abcdef000003', 'Patna Ganga Basin', 25.5941, 85.1376, 53.0, 'Patna', 'Bihar', 'Middle Ganga Plains', 115000, 'R. K. Verma, IAS', '+91 612 221-5000'),
    ('7f8b9c1d-4444-4444-8888-abcdef000004', 'Cuttack Mahanadi', 20.4625, 85.8828, 36.0, 'Cuttack', 'Odisha', 'Mahanadi Delta', 78000, 'P. K. Mohapatra, OAS', '+91 671 250-8000'),
    ('7f8b9c1d-5555-4444-8888-abcdef000005', 'Mumbai Mithi River', 19.0760, 72.8777, 14.0, 'Mumbai Suburban', 'Maharashtra', 'Mithi Catchment', 185000, 'A. S. Chahal, IAS', '+91 22 2262-0200')
ON CONFLICT (id) DO UPDATE SET
    river_basin = EXCLUDED.river_basin,
    population = EXCLUDED.population,
    commander_name = EXCLUDED.commander_name,
    commander_phone = EXCLUDED.commander_phone;

-- Seed default designated shelters
INSERT INTO public.shelters (zone_id, name, capacity, current_occupancy, status, address)
VALUES
    ('7f8b9c1d-1111-4444-8888-abcdef000001', 'Salt Lake Central Indoor Stadium', 3500, 420, 'Open', 'Sector III, Bidhannagar, Kolkata'),
    ('7f8b9c1d-1111-4444-8888-abcdef000001', 'North 24 Parganas District College', 2200, 180, 'Open', 'Jessore Road, Kolkata'),
    ('7f8b9c1d-1111-4444-8888-abcdef000001', 'Bagbazar Multi-Purpose Relief Shelter', 1800, 1450, 'Standby', 'Bagbazar Circular Road, Kolkata'),

    ('7f8b9c1d-2222-4444-8888-abcdef000002', 'Sarusajai Stadium Evacuation Hub', 4000, 600, 'Open', 'Lokhra Road, Guwahati'),
    ('7f8b9c1d-2222-4444-8888-abcdef000002', 'Kamrup Metro Disaster Transit Center', 2000, 310, 'Open', 'Panbazar, Guwahati'),

    ('7f8b9c1d-3333-4444-8888-abcdef000003', 'Patliputra Sports Complex Shelter', 3000, 450, 'Open', 'Kankarbagh, Patna'),
    ('7f8b9c1d-3333-4444-8888-abcdef000003', 'Danapur Multi-Purpose Relief Hall', 1800, 200, 'Open', 'Danapur Cantonment, Patna'),

    ('7f8b9c1d-4444-4444-8888-abcdef000004', 'Barabati Indoor Relief Center', 2800, 350, 'Open', 'Stadium Road, Cuttack'),
    ('7f8b9c1d-4444-4444-8888-abcdef000004', 'Mahanadi Barrage Emergency Camp', 1600, 120, 'Open', 'Jobra, Cuttack'),

    ('7f8b9c1d-5555-4444-8888-abcdef000005', 'Bandra Kurla Complex Transit Hub', 5000, 850, 'Open', 'BKC MMRDA Ground, Mumbai'),
    ('7f8b9c1d-5555-4444-8888-abcdef000005', 'Kurla Municipal High School Shelter', 2000, 400, 'Open', 'LBS Marg, Kurla West, Mumbai')
ON CONFLICT DO NOTHING;

-- Seed default evacuation routes
INSERT INTO public.evacuation_routes (zone_id, name, status, eta)
VALUES
    ('7f8b9c1d-1111-4444-8888-abcdef000001', 'VIP Road Arterial Highway', 'Clear', '15 min'),
    ('7f8b9c1d-1111-4444-8888-abcdef000001', 'Belghoria Elevated Expressway', 'Clear', '12 min'),
    ('7f8b9c1d-1111-4444-8888-abcdef000001', 'Strand Road Riverfront Access', 'Flooded', 'CLOSED'),

    ('7f8b9c1d-2222-4444-8888-abcdef000002', 'GS Road Elevated Corridor', 'Clear', '10 min'),
    ('7f8b9c1d-2222-4444-8888-abcdef000002', 'Brahmaputra Embankment Road', 'Flooded', 'CLOSED'),

    ('7f8b9c1d-3333-4444-8888-abcdef000003', 'Bailey Road Flyover Corridor', 'Clear', '14 min'),
    ('7f8b9c1d-3333-4444-8888-abcdef000003', 'Ganga Pathway Ring Route', 'Restricted', '25 min'),

    ('7f8b9c1d-4444-4444-8888-abcdef000004', 'NH-16 Bhubaneswar Expressway', 'Clear', '18 min'),
    ('7f8b9c1d-4444-4444-8888-abcdef000004', 'Ring Road Embankment Route', 'Restricted', '22 min'),

    ('7f8b9c1d-5555-4444-8888-abcdef000005', 'Western Express Highway Elevated', 'Clear', '15 min'),
    ('7f8b9c1d-5555-4444-8888-abcdef000005', 'SCLR East-West Corridor', 'Clear', '12 min'),
    ('7f8b9c1d-5555-4444-8888-abcdef000005', 'Mithi River Low-Level Service Lane', 'Flooded', 'CLOSED')
ON CONFLICT DO NOTHING;

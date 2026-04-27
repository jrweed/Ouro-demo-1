-- =============================================================================
-- Seed Demo Profiles — Run AFTER schema.sql in Supabase SQL Editor
-- =============================================================================
-- Demo auth users already created via API:
--   broker@test.com  → 5fec172e-db29-4736-82c5-8a60616e33b8
--   carrier@test.com → a90f0ec7-7ad7-4836-834e-d36346181656
-- =============================================================================

INSERT INTO profiles (id, role, company_name, contact_name, city, state)
VALUES (
  '5fec172e-db29-4736-82c5-8a60616e33b8',
  '3pl',
  'Lowcountry Logistics',
  'Jamie Carter',
  'Charleston',
  'SC'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, role, company_name, contact_name, city, state, mc_number)
VALUES (
  'a90f0ec7-7ad7-4836-834e-d36346181656',
  'carrier',
  'Coastal Freight LLC',
  'Chris Reyes',
  'Savannah',
  'GA',
  'MC-482910'
) ON CONFLICT (id) DO NOTHING;

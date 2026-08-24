/*
# NextOS — KPI & Expense Operating System: Core Schema

## Overview
Creates the full data model for a real-estate wholesaling/investing ops tool.
Single shared workspace — all verified users see the same data (no per-user partitioning).

## New Tables

1. **acq_activity** — Daily Acquisition KPI activity (one row per employee per day)
   - date, employee, role, dials, conversations, leads_pushed, pass_offs, process, appts_set, offers, contracts, closed, dropped, notes
   - Derived: year, month, quarter, week_start (computed via generated columns)

2. **dispo_activity** — Daily Disposition KPI activity (one row per employee per day)
   - date, employee, role, total_dials, calls_connected, follow_ups, buyer_box_collected, scheduled_deals, deals_pitched, queries, offers, offers_made, deals_locked_up, notes
   - Derived: year, month, quarter, week_start

3. **ledger_entries** — Money transactions (import-only in this build)
   - date, description, category, type, amount, payment_method, payment_type, bucket, notes
   - Derived: year, month, quarter, expense_amt, income_amt

4. **marketing_channels** — Config table for marketing channels
   - name, aliases (text[])

5. **category_mappings** — Category → Bucket → Channel classification
   - category, bucket, channel

6. **app_config** — Key-value config store
   - key, value (jsonb)

## Security
- RLS enabled on all tables.
- All tables use `TO authenticated` since this app has a sign-in screen.
- Shared workspace model: all authenticated users see all data (USING (true) is correct here — data is intentionally shared among the team, not per-user partitioned).
*/

-- ============================================================
-- ACQ ACTIVITY
-- ============================================================
CREATE TABLE IF NOT EXISTS acq_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  employee text NOT NULL,
  role text NOT NULL DEFAULT 'Cold Caller',
  dials integer NOT NULL DEFAULT 0,
  conversations integer NOT NULL DEFAULT 0,
  leads_pushed integer NOT NULL DEFAULT 0,
  pass_offs integer NOT NULL DEFAULT 0,
  process integer NOT NULL DEFAULT 0,
  appts_set integer NOT NULL DEFAULT 0,
  offers integer NOT NULL DEFAULT 0,
  contracts integer NOT NULL DEFAULT 0,
  closed integer NOT NULL DEFAULT 0,
  dropped integer NOT NULL DEFAULT 0,
  notes text,
  year integer GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)) STORED,
  month integer GENERATED ALWAYS AS (EXTRACT(MONTH FROM date)) STORED,
  quarter integer GENERATED ALWAYS AS (CEIL(EXTRACT(MONTH FROM date) / 3.0)) STORED,
  week_start date GENERATED ALWAYS AS (date - (EXTRACT(DOW FROM date)::integer)) STORED,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acq_date ON acq_activity(date);
CREATE INDEX IF NOT EXISTS idx_acq_year_quarter ON acq_activity(year, quarter);
CREATE INDEX IF NOT EXISTS idx_acq_employee ON acq_activity(employee);

ALTER TABLE acq_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_acq" ON acq_activity;
CREATE POLICY "auth_select_acq" ON acq_activity FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_acq" ON acq_activity;
CREATE POLICY "auth_insert_acq" ON acq_activity FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_acq" ON acq_activity;
CREATE POLICY "auth_update_acq" ON acq_activity FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_acq" ON acq_activity;
CREATE POLICY "auth_delete_acq" ON acq_activity FOR DELETE TO authenticated USING (true);

-- ============================================================
-- DISPO ACTIVITY
-- ============================================================
CREATE TABLE IF NOT EXISTS dispo_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  employee text NOT NULL,
  role text NOT NULL DEFAULT 'Disposition Agent',
  total_dials integer NOT NULL DEFAULT 0,
  calls_connected integer NOT NULL DEFAULT 0,
  follow_ups integer NOT NULL DEFAULT 0,
  buyer_box_collected integer NOT NULL DEFAULT 0,
  scheduled_deals integer NOT NULL DEFAULT 0,
  deals_pitched integer NOT NULL DEFAULT 0,
  queries integer NOT NULL DEFAULT 0,
  offers integer NOT NULL DEFAULT 0,
  offers_made integer NOT NULL DEFAULT 0,
  deals_locked_up integer NOT NULL DEFAULT 0,
  notes text,
  year integer GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)) STORED,
  month integer GENERATED ALWAYS AS (EXTRACT(MONTH FROM date)) STORED,
  quarter integer GENERATED ALWAYS AS (CEIL(EXTRACT(MONTH FROM date) / 3.0)) STORED,
  week_start date GENERATED ALWAYS AS (date - (EXTRACT(DOW FROM date)::integer)) STORED,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispo_date ON dispo_activity(date);
CREATE INDEX IF NOT EXISTS idx_dispo_year_quarter ON dispo_activity(year, quarter);
CREATE INDEX IF NOT EXISTS idx_dispo_employee ON dispo_activity(employee);

ALTER TABLE dispo_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_dispo" ON dispo_activity;
CREATE POLICY "auth_select_dispo" ON dispo_activity FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_dispo" ON dispo_activity;
CREATE POLICY "auth_insert_dispo" ON dispo_activity FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_dispo" ON dispo_activity;
CREATE POLICY "auth_update_dispo" ON dispo_activity FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_dispo" ON dispo_activity;
CREATE POLICY "auth_delete_dispo" ON dispo_activity FOR DELETE TO authenticated USING (true);

-- ============================================================
-- LEDGER ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  type text NOT NULL DEFAULT 'Expense',
  amount decimal(14,2) NOT NULL,
  payment_method text,
  payment_type text,
  bucket text NOT NULL DEFAULT 'Misc',
  notes text,
  year integer GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)) STORED,
  month integer GENERATED ALWAYS AS (EXTRACT(MONTH FROM date)) STORED,
  quarter integer GENERATED ALWAYS AS (CEIL(EXTRACT(MONTH FROM date) / 3.0)) STORED,
  expense_amt decimal(14,2) GENERATED ALWAYS AS (CASE WHEN amount < 0 THEN abs(amount) ELSE 0 END) STORED,
  income_amt decimal(14,2) GENERATED ALWAYS AS (CASE WHEN amount > 0 THEN amount ELSE 0 END) STORED,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(date);
CREATE INDEX IF NOT EXISTS idx_ledger_year_quarter ON ledger_entries(year, quarter);
CREATE INDEX IF NOT EXISTS idx_ledger_bucket ON ledger_entries(bucket);
CREATE INDEX IF NOT EXISTS idx_ledger_category ON ledger_entries(category);

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_ledger" ON ledger_entries;
CREATE POLICY "auth_select_ledger" ON ledger_entries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_ledger" ON ledger_entries;
CREATE POLICY "auth_insert_ledger" ON ledger_entries FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_ledger" ON ledger_entries;
CREATE POLICY "auth_update_ledger" ON ledger_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_ledger" ON ledger_entries;
CREATE POLICY "auth_delete_ledger" ON ledger_entries FOR DELETE TO authenticated USING (true);

-- ============================================================
-- MARKETING CHANNELS
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  aliases text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE marketing_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_channels" ON marketing_channels;
CREATE POLICY "auth_select_channels" ON marketing_channels FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_channels" ON marketing_channels;
CREATE POLICY "auth_insert_channels" ON marketing_channels FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_channels" ON marketing_channels;
CREATE POLICY "auth_update_channels" ON marketing_channels FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_channels" ON marketing_channels;
CREATE POLICY "auth_delete_channels" ON marketing_channels FOR DELETE TO authenticated USING (true);

-- ============================================================
-- CATEGORY MAPPINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS category_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  bucket text NOT NULL DEFAULT 'Misc',
  channel text,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_unique ON category_mappings(category);

ALTER TABLE category_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_mappings" ON category_mappings;
CREATE POLICY "auth_select_mappings" ON category_mappings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_mappings" ON category_mappings;
CREATE POLICY "auth_insert_mappings" ON category_mappings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_mappings" ON category_mappings;
CREATE POLICY "auth_update_mappings" ON category_mappings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_mappings" ON category_mappings;
CREATE POLICY "auth_delete_mappings" ON category_mappings FOR DELETE TO authenticated USING (true);

-- ============================================================
-- APP CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_config" ON app_config;
CREATE POLICY "auth_select_config" ON app_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_config" ON app_config;
CREATE POLICY "auth_insert_config" ON app_config FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_config" ON app_config;
CREATE POLICY "auth_update_config" ON app_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_config" ON app_config;
CREATE POLICY "auth_delete_config" ON app_config FOR DELETE TO authenticated USING (true);

-- ============================================================
-- PROFILES (extends auth.users with display name)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  email text,
  role text NOT NULL DEFAULT 'Member',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_profiles" ON profiles;
CREATE POLICY "auth_select_profiles" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_profiles" ON profiles;
CREATE POLICY "auth_insert_profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "auth_update_profiles" ON profiles;
CREATE POLICY "auth_update_profiles" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

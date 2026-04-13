-- ═══════════════════════════════════════════════════════
-- SakanArbab — Supabase Schema (matches actual app code)
-- Run this in Supabase SQL Editor AFTER dropping old tables
-- ═══════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents (one per user — business profile)
CREATE TABLE agents (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_id TEXT DEFAULT 'LOCAL_AGENT',
  full_name TEXT NOT NULL DEFAULT 'Agent',
  email TEXT NOT NULL DEFAULT 'local@sakanarbab',
  photo_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  business_name TEXT,
  business_logo_uri TEXT,
  business_phone TEXT,
  business_email TEXT,
  business_address TEXT,
  business_tagline TEXT,
  business_trn TEXT,
  currency TEXT DEFAULT 'AED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Properties
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bed Units
CREATE TABLE bed_units (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  owner_rent REAL DEFAULT 0,
  actual_rent REAL DEFAULT 0,
  commission REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenancy Contracts
CREATE TABLE tenancy_contracts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bed_unit_id INTEGER NOT NULL REFERENCES bed_units(id),
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  tenant_name TEXT NOT NULL,
  tenant_phone TEXT,
  tenant_email TEXT,
  tenant_id_no TEXT,
  check_in_date TEXT NOT NULL,
  check_out_date TEXT,
  monthly_rent REAL NOT NULL,
  deposit_amount REAL DEFAULT 0,
  payment_due_day INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenancy_id INTEGER NOT NULL REFERENCES tenancy_contracts(id),
  bed_unit_id INTEGER NOT NULL REFERENCES bed_units(id),
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  txn_no TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  payment_mode TEXT,
  payment_for_month TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id),
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  expense_date TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Logs
CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  tenancy_id INTEGER NOT NULL REFERENCES tenancy_contracts(id),
  payment_id INTEGER,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  sent_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Agents
CREATE POLICY "Users own agents" ON agents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Properties
CREATE POLICY "Users own properties" ON properties FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rooms
CREATE POLICY "Users own rooms" ON rooms FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Bed Units
CREATE POLICY "Users own bed_units" ON bed_units FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tenancy Contracts
CREATE POLICY "Users own tenancy_contracts" ON tenancy_contracts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Payments
CREATE POLICY "Users own payments" ON payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Expenses
CREATE POLICY "Users own expenses" ON expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Email Logs
CREATE POLICY "Users own email_logs" ON email_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

/*
# NextOS: Seed Configuration Data

Seeds:
1. Marketing channels (10 defaults)
2. Category → Bucket → Channel mappings (from the source workbook)
3. App config: expense buckets, ACQ roles, Dispo roles, reporting year
*/

-- Marketing Channels
INSERT INTO marketing_channels (name, aliases) VALUES
  ('Cold Calling', '{}'),
  ('Facebook Marketing', '{"meta","facebook"}'),
  ('For Sale by Owner', '{}'),
  ('Foreclosure Auction', '{}'),
  ('Google Adwords/PPC', '{"google ads","google adwords"}'),
  ('Other Wholesalers', '{}'),
  ('Pay Per Lead', '{"ntsmhf","rei lead pros"}'),
  ('Referrals', '{}'),
  ('Website', '{}'),
  ('General / Multi-channel', '{"marketing"}')
ON CONFLICT (name) DO NOTHING;

-- Category Mappings (from source workbook)
INSERT INTO category_mappings (category, bucket, channel) VALUES
  ('Bank Fees', 'Admin', NULL),
  ('Bank fees', 'Admin', NULL),
  ('Bright MLS', 'Admin', NULL),
  ('Bright Mls', 'Admin', NULL),
  ('Claude', 'Admin', NULL),
  ('Commissions', 'Commissions', NULL),
  ('Contractor', 'Processing', NULL),
  ('Contractors', 'Processing', NULL),
  ('Deals Expense', 'Processing', NULL),
  ('Donation', 'Misc', NULL),
  ('Dotloop', 'Admin', NULL),
  ('Education', 'Admin', NULL),
  ('Google', 'Admin', NULL),
  ('Google Ads', 'Acquisition', 'Google Adwords/PPC'),
  ('Hostinger', 'Admin', NULL),
  ('Income', 'Misc', NULL),
  ('Interest Income', 'Non-Operating', NULL),
  ('Internal Transfer', 'Non-Operating', NULL),
  ('InvestorBase', 'Processing', NULL),
  ('InvestorBootz', 'Processing', NULL),
  ('InvestorLift', 'Processing', NULL),
  ('Legal', 'Admin', NULL),
  ('Licenses', 'Admin', NULL),
  ('Loan', 'Non-Operating', NULL),
  ('Loom', 'Admin', NULL),
  ('MLS', 'Admin', NULL),
  ('Marketing', 'Acquisition', 'General / Multi-channel'),
  ('Meals', 'Misc', NULL),
  ('Meta', 'Acquisition', 'Facebook Marketing'),
  ('Misc', 'Misc', NULL),
  ('NTSMHF', 'Acquisition', 'Pay Per Lead'),
  ('Notary', 'Admin', NULL),
  ('Office Supplies', 'Admin', NULL),
  ('OpenAI', 'Admin', NULL),
  ('Operations Cost', 'Admin', NULL),
  ('ProAgentVA', 'Processing', NULL),
  ('PropStream', 'Admin', NULL),
  ('REI Lead Pros', 'Acquisition', 'Pay Per Lead'),
  ('REsimpli', 'Processing', NULL),
  ('REsimpli Call Credits', 'Processing', NULL),
  ('Reimbursement', 'Non-Operating', NULL),
  ('Relay', 'Admin', NULL),
  ('Software', 'Admin', NULL),
  ('T-Mobile', 'Admin', NULL),
  ('Travel', 'Processing', NULL),
  ('Zapier', 'Admin', NULL)
ON CONFLICT (category) DO NOTHING;

-- App Config
INSERT INTO app_config (key, value) VALUES
  ('expense_buckets', '["Acquisition","Processing","Commissions","Admin","Misc","Non-Operating"]'),
  ('acq_roles', '["ACQ Manager","Cold Caller","FUS","OM","Admin","SMM","PPC","PPL"]'),
  ('dispo_roles', '["Disposition Agent","Sr Dispo","Jr Dispo"]'),
  ('reporting_year', '2026'),
  ('quarter_boundaries', '{"Q1":{"start":"01-01","end":"03-31"},"Q2":{"start":"04-01","end":"06-30"},"Q3":{"start":"07-01","end":"09-30"},"Q4":{"start":"10-01","end":"12-31"}}')
ON CONFLICT (key) DO NOTHING;

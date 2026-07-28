-- v1.8.0: WedPlanned commercial platform foundation.
-- Additive only: the existing `workspaces` table remains the durable tenant boundary,
-- while neutral business, team, category, service-area and entitlement records are added.

CREATE TABLE IF NOT EXISTS platform_users (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  platform_role TEXT NOT NULL DEFAULT 'member'
    CHECK (platform_role IN ('member', 'support', 'platform_admin')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'disabled')),
  last_signed_in_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_platform_users_status
  ON platform_users(status, email_normalized);

CREATE TABLE IF NOT EXISTS business_profiles (
  workspace_id TEXT PRIMARY KEY,
  public_name TEXT NOT NULL DEFAULT '',
  legal_name TEXT NOT NULL DEFAULT '',
  marketplace_slug TEXT NOT NULL DEFAULT '',
  business_type TEXT NOT NULL DEFAULT 'sole_trader'
    CHECK (business_type IN ('sole_trader', 'partnership', 'limited_company', 'charity', 'other')),
  summary TEXT NOT NULL DEFAULT '',
  year_established INTEGER,
  registration_country TEXT NOT NULL DEFAULT 'GB',
  company_number TEXT NOT NULL DEFAULT '',
  tax_number TEXT NOT NULL DEFAULT '',
  onboarding_status TEXT NOT NULL DEFAULT 'foundation'
    CHECK (onboarding_status IN ('foundation', 'profile', 'payments', 'ready', 'suspended')),
  marketplace_status TEXT NOT NULL DEFAULT 'private'
    CHECK (marketplace_status IN ('private', 'draft', 'review', 'published', 'suspended')),
  facebook TEXT NOT NULL DEFAULT '',
  tiktok TEXT NOT NULL DEFAULT '',
  linkedin TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profiles_marketplace_slug
  ON business_profiles(marketplace_slug)
  WHERE trim(marketplace_slug) <> '';

CREATE TABLE IF NOT EXISTS business_memberships (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  email_normalized TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('owner', 'admin', 'manager', 'content', 'finance', 'staff', 'viewer')),
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('active', 'invited', 'disabled')),
  permissions_json TEXT NOT NULL DEFAULT '{}',
  invited_at TEXT,
  accepted_at TEXT,
  last_active_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, email_normalized),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_business_memberships_workspace
  ON business_memberships(workspace_id, status, role);
CREATE INDEX IF NOT EXISTS idx_business_memberships_user
  ON business_memberships(user_id, status);

CREATE TABLE IF NOT EXISTS platform_categories (
  category_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'Wedding services',
  description TEXT NOT NULL DEFAULT '',
  icon_key TEXT NOT NULL DEFAULT 'sparkles',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_platform_categories_order
  ON platform_categories(status, group_name, sort_order, name);

CREATE TABLE IF NOT EXISTS business_category_links (
  workspace_id TEXT NOT NULL,
  category_key TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  profile_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, category_key),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (category_key) REFERENCES platform_categories(category_key)
);
CREATE INDEX IF NOT EXISTS idx_business_category_links_workspace
  ON business_category_links(workspace_id, status, is_primary DESC);

CREATE TABLE IF NOT EXISTS business_service_areas (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  label TEXT NOT NULL,
  area_type TEXT NOT NULL DEFAULT 'region'
    CHECK (area_type IN ('local', 'city', 'county', 'region', 'country', 'destination', 'remote', 'custom')),
  country_code TEXT NOT NULL DEFAULT 'GB',
  region_code TEXT NOT NULL DEFAULT '',
  radius_miles INTEGER,
  remote_available INTEGER NOT NULL DEFAULT 0 CHECK (remote_available IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_business_service_areas_workspace
  ON business_service_areas(workspace_id, status, sort_order, label);

CREATE TABLE IF NOT EXISTS platform_features (
  feature_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit_label TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_entitlements (
  workspace_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'plan'
    CHECK (source IN ('plan', 'trial', 'manual', 'internal')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  limit_value INTEGER,
  starts_at TEXT,
  ends_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, feature_key),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (feature_key) REFERENCES platform_features(feature_key)
);
CREATE INDEX IF NOT EXISTS idx_workspace_entitlements_workspace
  ON workspace_entitlements(workspace_id, enabled, feature_key);

CREATE TABLE IF NOT EXISTS platform_audit_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  actor_user_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (actor_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_audit_events_workspace
  ON platform_audit_events(workspace_id, created_at DESC);

INSERT OR IGNORE INTO business_profiles (
  workspace_id, public_name, legal_name, marketplace_slug, business_type,
  summary, registration_country, onboarding_status, marketplace_status
) VALUES (
  'workspace_mkb_weddings',
  'MKB Weddings',
  'MKB Weddings',
  'mkb-weddings',
  'sole_trader',
  'Wedding photography, galleries and content operated as the first WedPlanned business.',
  'GB',
  'foundation',
  'private'
);

INSERT OR IGNORE INTO platform_categories
  (category_key, name, group_name, description, icon_key, sort_order)
VALUES
  ('venue', 'Wedding venue', 'Places and planning', 'Venues, hotels, estates and ceremony locations.', 'building', 10),
  ('planner', 'Wedding planner', 'Places and planning', 'Wedding planning, coordination and on-the-day management.', 'calendar-check', 20),
  ('photographer', 'Photographer', 'Photo and film', 'Wedding photography and image delivery.', 'camera', 30),
  ('videographer', 'Videographer', 'Photo and film', 'Wedding films, highlights and cinematic coverage.', 'video', 40),
  ('content-creator', 'Wedding content creator', 'Photo and film', 'Short-form behind-the-scenes wedding content.', 'smartphone', 50),
  ('florist', 'Florist', 'Design and styling', 'Wedding flowers, installations and floral styling.', 'flower-2', 60),
  ('decor-styling', 'Decor and styling', 'Design and styling', 'Venue styling, decor, props and installations.', 'sparkles', 70),
  ('stationery', 'Stationery and signage', 'Design and styling', 'Invitations, stationery, signage and printed details.', 'notebook-tabs', 80),
  ('caterer', 'Caterer', 'Food and drink', 'Wedding catering and food service.', 'utensils', 90),
  ('cake', 'Cake maker', 'Food and drink', 'Wedding cakes, desserts and favours.', 'cake-slice', 100),
  ('bar', 'Bar and drinks', 'Food and drink', 'Mobile bars, drinks service and beverage suppliers.', 'wine', 110),
  ('band', 'Live band', 'Entertainment', 'Live wedding bands and musicians.', 'music-2', 120),
  ('dj', 'DJ', 'Entertainment', 'Wedding DJs, sound and evening entertainment.', 'disc-3', 130),
  ('entertainment', 'Entertainment', 'Entertainment', 'Performers, magicians, photo booths and guest entertainment.', 'party-popper', 140),
  ('celebrant', 'Celebrant', 'Ceremony', 'Wedding celebrants and personalised ceremonies.', 'heart-handshake', 150),
  ('officiant', 'Officiant', 'Ceremony', 'Religious and civil ceremony professionals.', 'book-open', 160),
  ('hair', 'Hair stylist', 'Beauty and attire', 'Bridal and wedding-party hair styling.', 'scissors', 170),
  ('makeup', 'Makeup artist', 'Beauty and attire', 'Bridal and wedding-party makeup.', 'brush', 180),
  ('attire', 'Wedding attire', 'Beauty and attire', 'Dresses, suits, accessories and alterations.', 'shirt', 190),
  ('jewellery', 'Jewellery', 'Beauty and attire', 'Wedding rings, jewellery and accessories.', 'gem', 200),
  ('transport', 'Wedding transport', 'Travel and accommodation', 'Cars, coaches and specialist wedding transport.', 'car-front', 210),
  ('accommodation', 'Accommodation', 'Travel and accommodation', 'Guest accommodation and wedding stays.', 'bed-double', 220),
  ('rentals', 'Hire and rentals', 'Services', 'Furniture, equipment, marquees and wedding hire.', 'package-open', 230),
  ('other', 'Other wedding professional', 'Services', 'A wedding service not covered by another category.', 'briefcase-business', 999);

INSERT OR IGNORE INTO business_category_links
  (workspace_id, category_key, is_primary, status)
VALUES ('workspace_mkb_weddings', 'photographer', 1, 'active');

INSERT OR IGNORE INTO platform_features
  (feature_key, name, description, unit_label, sort_order)
VALUES
  ('business-profile', 'Business profile', 'Business identity, categories and service areas.', '', 10),
  ('team', 'Team members', 'Role-based access for business staff.', 'members', 20),
  ('crm', 'CRM', 'Contacts, enquiries, tasks and pipelines.', 'contacts', 30),
  ('bookings', 'Bookings', 'Services, availability, quotes and bookings.', 'bookings', 40),
  ('contracts', 'Contracts', 'Digital agreements and signatures.', 'contracts', 50),
  ('invoices', 'Invoices', 'Invoices, payment schedules and balances.', 'invoices', 60),
  ('connected-payments', 'Connected payments', 'Business-owned Stripe payments through WedPlanned.', 'payments', 70),
  ('marketplace', 'Marketplace profile', 'Public supplier discovery and advertising.', '', 80),
  ('content-tools', 'Content tools', 'Business content, social and collaborative real weddings.', '', 90),
  ('client-portal', 'Client portal', 'Private couple and client workspaces.', 'portals', 100),
  ('client-galleries', 'Client galleries', 'Private galleries, selections and delivery.', 'galleries', 110),
  ('print-store', 'Print store', 'Print ordering, payments and fulfilment.', 'orders', 120),
  ('analytics', 'Analytics', 'Business, marketing and conversion reporting.', '', 130);

INSERT OR IGNORE INTO workspace_entitlements
  (workspace_id, feature_key, source, enabled, limit_value)
SELECT 'workspace_mkb_weddings', feature_key, 'internal', 1, NULL
FROM platform_features;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '23', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

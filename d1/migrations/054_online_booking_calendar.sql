-- v1.10.15a — Online booking and Calendar. Schema 53 -> 54.
-- Additive storage; no existing business rows are changed. Public booking requires separate activation.
-- Run once, after a backup and schema-53 preflight. A repeat or wrong-version run aborts.
CREATE TABLE _migration_054_guard (version TEXT NOT NULL CHECK(version='53'));
INSERT INTO _migration_054_guard VALUES(COALESCE((SELECT value FROM schema_meta WHERE key='schema_version'),''));
DROP TABLE _migration_054_guard;

CREATE TABLE crm_online_booking_pages (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
  public_slug TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  revision INTEGER NOT NULL DEFAULT 1,
  document_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE crm_calendar_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  resource_id TEXT NOT NULL,
  staff_user_id TEXT,
  kind TEXT NOT NULL CHECK(kind IN ('booking','blocked')),
  status TEXT NOT NULL CHECK(status IN ('held','requested','confirmed','cancelled','declined','expired','payment_review')),
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  busy_from INTEGER NOT NULL,
  busy_to INTEGER NOT NULL,
  local_date TEXT NOT NULL,
  expires_at INTEGER,
  page_revision INTEGER,
  enquiry_id TEXT,
  job_id TEXT,
  invoice_id TEXT,
  required_amount INTEGER NOT NULL DEFAULT 0,
  confirmation_mode TEXT NOT NULL DEFAULT 'instant',
  idempotency_key TEXT NOT NULL,
  token_hash TEXT NOT NULL DEFAULT '',
  request_hash TEXT NOT NULL DEFAULT '',
  document_json TEXT NOT NULL,
  icloud_sync_status TEXT NOT NULL DEFAULT 'pending',
  icloud_sync_error TEXT NOT NULL DEFAULT '',
  google_sync_status TEXT NOT NULL DEFAULT 'pending',
  google_sync_error TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id,idempotency_key),
  CHECK(ends_at > starts_at AND busy_from <= starts_at AND busy_to >= ends_at)
);
CREATE INDEX idx_crm_calendar_range ON crm_calendar_events(workspace_id,busy_from,busy_to);
CREATE INDEX idx_crm_calendar_invoice ON crm_calendar_events(workspace_id,invoice_id);
CREATE TABLE crm_google_calendar_connections (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  resource_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  checked_calendar_ids_json TEXT NOT NULL DEFAULT '[]',
  credential_json TEXT NOT NULL,
  connected_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(workspace_id,resource_id)
);
CREATE TABLE crm_calendar_oauth_states (
  state_hash TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  verifier TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE crm_booking_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE crm_calendar_google_links (
  workspace_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  PRIMARY KEY(workspace_id,event_id,resource_id)
);
CREATE TABLE crm_calendar_sync_leases (
  workspace_id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TRIGGER trg_calendar_revision_insert BEFORE INSERT ON crm_calendar_events
WHEN NEW.kind='booking' AND NOT EXISTS (
  SELECT 1 FROM crm_online_booking_pages p WHERE p.workspace_id=NEW.workspace_id AND p.enabled=1 AND p.revision=NEW.page_revision
)
BEGIN SELECT RAISE(ABORT,'Booking settings changed. Refresh availability.'); END;
CREATE TRIGGER trg_calendar_overlap_insert BEFORE INSERT ON crm_calendar_events
WHEN NEW.status IN ('held','requested','confirmed') AND EXISTS (
  SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=NEW.workspace_id
  AND (e.resource_id=NEW.resource_id OR e.resource_id='*' OR NEW.resource_id='*')
  AND e.status IN ('held','requested','confirmed') AND (e.status<>'held' OR e.expires_at>unixepoch('now')*1000)
  AND e.busy_from<NEW.busy_to AND e.busy_to>NEW.busy_from
)
BEGIN SELECT RAISE(ABORT,'That time is no longer available.'); END;
CREATE TRIGGER trg_calendar_overlap_update BEFORE UPDATE OF starts_at,ends_at,busy_from,busy_to,status,resource_id ON crm_calendar_events
WHEN NEW.status IN ('held','requested','confirmed') AND EXISTS (
  SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=NEW.workspace_id AND e.id<>NEW.id
  AND (e.resource_id=NEW.resource_id OR e.resource_id='*' OR NEW.resource_id='*')
  AND e.status IN ('held','requested','confirmed') AND (e.status<>'held' OR e.expires_at>unixepoch('now')*1000)
  AND e.busy_from<NEW.busy_to AND e.busy_to>NEW.busy_from
)
BEGIN SELECT RAISE(ABORT,'That time is no longer available.'); END;
CREATE TRIGGER trg_calendar_tenant_update BEFORE UPDATE OF workspace_id ON crm_calendar_events
WHEN NEW.workspace_id<>OLD.workspace_id
BEGIN SELECT RAISE(ABORT,'Calendar workspace is immutable.'); END;
CREATE TRIGGER trg_calendar_job_insert BEFORE INSERT ON crm_calendar_events
WHEN NEW.job_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM crm_jobs j WHERE j.id=NEW.job_id AND j.workspace_id=NEW.workspace_id)
BEGIN SELECT RAISE(ABORT,'Calendar Job workspace mismatch.'); END;
CREATE TRIGGER trg_calendar_existing_jobs_insert BEFORE INSERT ON crm_calendar_events
WHEN NEW.kind='booking' AND EXISTS (
 SELECT 1 FROM crm_jobs j WHERE j.workspace_id=NEW.workspace_id AND j.event_date=NEW.local_date
 AND COALESCE((SELECT json_extract(document_json,'$.conflicts.jobs') FROM crm_online_booking_pages WHERE workspace_id=NEW.workspace_id),1)<>0
 AND j.status IN ('provisional','booked','active') AND j.id<>COALESCE(NEW.job_id,'')
 AND (j.assigned_user_id IS NULL OR j.assigned_user_id=NEW.staff_user_id)
 AND NOT EXISTS(SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=j.workspace_id AND e.job_id=j.id)
)
BEGIN SELECT RAISE(ABORT,'An existing Job occupies that day.'); END;
CREATE TRIGGER trg_calendar_existing_jobs_update BEFORE UPDATE OF starts_at,status,resource_id ON crm_calendar_events
WHEN NEW.kind='booking' AND NEW.status IN ('held','requested','confirmed') AND EXISTS (
 SELECT 1 FROM crm_jobs j WHERE j.workspace_id=NEW.workspace_id AND j.event_date=NEW.local_date
 AND COALESCE((SELECT json_extract(document_json,'$.conflicts.jobs') FROM crm_online_booking_pages WHERE workspace_id=NEW.workspace_id),1)<>0
 AND j.status IN ('provisional','booked','active') AND j.id<>COALESCE(NEW.job_id,'')
 AND (j.assigned_user_id IS NULL OR j.assigned_user_id=NEW.staff_user_id)
 AND NOT EXISTS(SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=j.workspace_id AND e.job_id=j.id)
)
BEGIN SELECT RAISE(ABORT,'An existing Job occupies that day.'); END;

-- Optimistic version changes abort the whole batch, including Job/Lead updates.
CREATE TRIGGER trg_calendar_version_update BEFORE UPDATE OF status,starts_at,ends_at,busy_from,busy_to,resource_id ON crm_calendar_events
WHEN NEW.version<>OLD.version+1
BEGIN SELECT RAISE(ABORT,'Calendar version changed. Refresh the calendar.'); END;
CREATE TRIGGER trg_calendar_paid_update BEFORE UPDATE OF status ON crm_calendar_events
WHEN NEW.kind='booking' AND NEW.required_amount>0 AND NEW.status IN ('requested','confirmed') AND
 COALESCE((SELECT SUM(CASE WHEN p.payment_type='payment' THEN p.amount ELSE -p.amount END) FROM crm_invoice_payments p WHERE p.workspace_id=NEW.workspace_id AND p.invoice_id=NEW.invoice_id),0)<NEW.required_amount
BEGIN SELECT RAISE(ABORT,'Booking payment has not been received.'); END;

-- Existing Job editors cannot silently move a timed booking independently.
-- Calendar batches update the calendar entry first, then its matching Job.
CREATE TRIGGER trg_calendar_job_schedule_update BEFORE UPDATE OF event_date,assigned_user_id,status ON crm_jobs
WHEN EXISTS (
 SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=OLD.workspace_id AND e.job_id=OLD.id AND
 (NEW.event_date<>e.local_date OR COALESCE(NEW.assigned_user_id,'')<>COALESCE(e.staff_user_id,'') OR
  (NEW.status IN ('cancelled','archived') AND e.status IN ('held','requested','confirmed')))
)
BEGIN SELECT RAISE(ABORT,'Manage this appointment date, team member and cancellation in Calendar.'); END;
CREATE TRIGGER trg_calendar_job_delete BEFORE DELETE ON crm_jobs
WHEN EXISTS(SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=OLD.workspace_id AND e.job_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'This Job has a booking history. Cancel its appointment in Calendar.'); END;
CREATE TRIGGER trg_calendar_member_insert BEFORE INSERT ON crm_calendar_events
WHEN NEW.staff_user_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM business_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.staff_user_id AND m.status='active'
)
BEGIN SELECT RAISE(ABORT,'This team member is no longer available.'); END;
CREATE TRIGGER trg_calendar_address_update BEFORE UPDATE OF public_slug ON crm_online_booking_pages
WHEN NEW.public_slug<>OLD.public_slug AND EXISTS(
 SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=OLD.workspace_id AND e.kind='booking'
)
BEGIN SELECT RAISE(ABORT,'The booking address is used by existing bookings.'); END;
CREATE TRIGGER trg_calendar_resource_settings_update BEFORE UPDATE OF document_json ON crm_online_booking_pages
WHEN EXISTS(
 SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=OLD.workspace_id AND e.kind='booking'
 AND e.ends_at>unixepoch('now')*1000 AND e.status IN ('held','requested','confirmed','payment_review')
 AND NOT EXISTS(SELECT 1 FROM json_each(NEW.document_json,'$.resources') r
   WHERE json_extract(r.value,'$.id')=e.resource_id AND COALESCE(json_extract(r.value,'$.userId'),'')=COALESCE(e.staff_user_id,''))
)
BEGIN SELECT RAISE(ABORT,'Move existing appointments before changing the team assignment.'); END;
CREATE TRIGGER trg_calendar_member_update BEFORE UPDATE OF staff_user_id,status ON crm_calendar_events
WHEN NEW.status IN ('held','requested','confirmed') AND NEW.staff_user_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM business_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.staff_user_id AND m.status='active'
)
BEGIN SELECT RAISE(ABORT,'This team member is no longer available.'); END;
-- Manual all-day Jobs must respect already reserved appointment times too.
CREATE TRIGGER trg_job_calendar_overlap_insert BEFORE INSERT ON crm_jobs
WHEN NEW.status IN ('provisional','booked','active')
AND NOT EXISTS(SELECT 1 FROM crm_enquiries q WHERE q.id=NEW.enquiry_id AND q.workspace_id=NEW.workspace_id AND q.source='online_booking')
AND EXISTS(SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=NEW.workspace_id
 AND e.local_date<=NEW.event_date AND COALESCE(json_extract(e.document_json,'$.endLocalDate'),e.local_date)>=NEW.event_date
 AND e.status IN ('held','requested','confirmed') AND (e.status<>'held' OR e.expires_at>unixepoch('now')*1000)
 AND (NEW.assigned_user_id IS NULL OR e.resource_id='*' OR e.staff_user_id=NEW.assigned_user_id))
BEGIN SELECT RAISE(ABORT,'A calendar booking occupies that day. Choose another date or team member.'); END;
CREATE TRIGGER trg_job_calendar_overlap_update BEFORE UPDATE OF event_date,assigned_user_id,status ON crm_jobs
WHEN NEW.status IN ('provisional','booked','active')
AND NOT EXISTS(SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=NEW.workspace_id AND e.job_id=NEW.id)
AND EXISTS(SELECT 1 FROM crm_calendar_events e WHERE e.workspace_id=NEW.workspace_id
 AND e.local_date<=NEW.event_date AND COALESCE(json_extract(e.document_json,'$.endLocalDate'),e.local_date)>=NEW.event_date
 AND e.status IN ('held','requested','confirmed') AND (e.status<>'held' OR e.expires_at>unixepoch('now')*1000)
 AND (NEW.assigned_user_id IS NULL OR e.resource_id='*' OR e.staff_user_id=NEW.assigned_user_id))
BEGIN SELECT RAISE(ABORT,'A calendar booking occupies that day. Choose another date or team member.'); END;

-- Workspace-scoped private iCloud connections.
CREATE TABLE crm_icloud_calendar_connections (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  resource_id TEXT NOT NULL,
  calendar_url TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  busy_calendars_json TEXT NOT NULL DEFAULT '[]',
  timezone TEXT NOT NULL,
  credential_json TEXT NOT NULL,
  connected_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(workspace_id,resource_id),
  UNIQUE(workspace_id,calendar_url)
);
CREATE TABLE crm_calendar_icloud_links (
  workspace_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  calendar_url TEXT NOT NULL,
  PRIMARY KEY(workspace_id,event_id,resource_id)
);
CREATE TRIGGER trg_calendar_icloud_pending AFTER UPDATE OF version ON crm_calendar_events
WHEN NEW.version<>OLD.version
BEGIN
  UPDATE crm_calendar_events SET icloud_sync_status='pending',icloud_sync_error=''
  WHERE workspace_id=NEW.workspace_id AND id=NEW.id;
END;

CREATE TRIGGER trg_calendar_existing_leads_insert BEFORE INSERT ON crm_calendar_events
WHEN NEW.kind='booking' AND EXISTS (
 SELECT 1 FROM crm_enquiries l JOIN crm_online_booking_pages p ON p.workspace_id=l.workspace_id
 WHERE l.workspace_id=NEW.workspace_id AND l.event_date=NEW.local_date AND l.status='open' AND l.accepted_job_id IS NULL
 AND json_extract(p.document_json,'$.conflicts.leads')=1 AND (l.assigned_user_id IS NULL OR l.assigned_user_id=NEW.staff_user_id)
) BEGIN SELECT RAISE(ABORT,'An existing Lead occupies that day.'); END;
CREATE TRIGGER trg_calendar_existing_leads_update BEFORE UPDATE OF starts_at,status,resource_id ON crm_calendar_events
WHEN NEW.kind='booking' AND NEW.status IN ('held','requested','confirmed') AND EXISTS (
 SELECT 1 FROM crm_enquiries l JOIN crm_online_booking_pages p ON p.workspace_id=l.workspace_id
 WHERE l.workspace_id=NEW.workspace_id AND l.event_date=NEW.local_date AND l.status='open' AND l.accepted_job_id IS NULL
 AND json_extract(p.document_json,'$.conflicts.leads')=1 AND (l.assigned_user_id IS NULL OR l.assigned_user_id=NEW.staff_user_id)
) BEGIN SELECT RAISE(ABORT,'An existing Lead occupies that day.'); END;

-- Booking-only document capabilities never authorize a payment or calendar edit.
CREATE TABLE IF NOT EXISTS crm_booking_document_tokens (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  event_id TEXT NOT NULL REFERENCES crm_calendar_events(id) ON DELETE CASCADE,
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_booking_document_event ON crm_booking_document_tokens(workspace_id,event_id);
CREATE TABLE IF NOT EXISTS crm_booking_workflow_applied (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  event_id TEXT PRIMARY KEY REFERENCES crm_calendar_events(id) ON DELETE CASCADE
);

INSERT INTO schema_meta(key,value,updated_at) VALUES('schema_version','54',CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP;

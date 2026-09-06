import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const { outputFiles } = await build({
  stdin: { contents: "export * from './shared/crm-dashboard'; export {getCrmDashboard} from './serverless/crm-dashboard-d1'; export {onRequestGet as route} from './functions/api/crm/dashboard';", resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'node',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
const sql = new DatabaseSync(':memory:');
sql.exec(readFileSync('d1/schema.sql', 'utf8'));
const ws = 'workspace_mkb_weddings', other = 'dashboard-other';
const actor = { workspaceId: ws, permissions: ['crm:read'] };
const access = { bookings: true, payments: true };
const range = { from: '2026-08-30', to: '2026-09-05' };
const reads = [];
const db = { prepare(query) {
  assert.match(query.trim(), /^SELECT\b/i, 'Dashboard must only read the database');
  reads.push(query);
  return { args: [], bind(...args) { this.args = args; return this; },
    async first(column) { const row = sql.prepare(query).get(...this.args); return column ? row?.[column] ?? null : row ?? null; },
    async all() { return { results: sql.prepare(query).all(...this.args) }; },
    async run() { assert.fail('Dashboard attempted a write'); },
  };
} };
const run = (query, ...args) => sql.prepare(query).run(...args);
run("INSERT INTO workspaces(id,slug,name) VALUES(?,?,'Other')", other, other);
run("INSERT INTO crm_pipeline_stages(id,workspace_id,stage_key,name) VALUES('other-stage',?,'new','New')", other);
function lead(id, workspace, type, date, source = '', fallback = '') {
  run('INSERT INTO crm_enquiries(id,workspace_id,reference,stage_id,event_type,created_at,lead_source,source) VALUES(?,?,?,?,?,?,?,?)', id, workspace, id, workspace === ws ? 'crm_stage_' + ws + '_new' : 'other-stage', type, date, source, fallback);
}
function job(id, type = 'wedding', event = '2026-09-12', booked = '2026-09-02', workspace = ws, status = 'booked') {
  run('INSERT INTO crm_jobs(id,workspace_id,reference,title,job_type,event_date,booking_date,status,venue_text) VALUES(?,?,?,?,?,?,?,?,?)', id, workspace, id, id, type, event, booked, status, 'Sample venue');
}
function invoice(id, jobId, workspace = ws, currency = 'GBP', status = 'issued') {
  run('INSERT INTO crm_invoices(id,workspace_id,job_id,reference,currency,status,total_amount,due_date) VALUES(?,?,?,?,?,?,20000,?)', id, workspace, jobId, id, currency, 'draft', '2026-09-01');
  run('INSERT INTO crm_invoice_schedule_items(id,workspace_id,invoice_id,label,amount,due_date) VALUES(?,?,?,?,20000,?)', id + '-due', workspace, id, 'Balance', '2026-09-01');
  run('UPDATE crm_invoices SET status=? WHERE id=?', status, id);
}
function payment(id, invoiceId, date, amount, kind = 'payment', workspace = ws, currency = 'GBP') {
  run('INSERT INTO crm_invoice_payments(id,workspace_id,invoice_id,paid_at,amount,payment_type,currency) VALUES(?,?,?,?,?,?,?)', id, workspace, invoiceId, date, amount, kind, currency);
}
lead('lead-now', ws, 'wedding', '2026-09-01 10:00:00', 'Instagram');
lead('lead-fallback', ws, 'wedding', '2026-08-30', '', 'Referral');
lead('lead-source-case', ws, 'wedding', '2026-09-01', 'instagram');
lead('lead-unknown', ws, 'portrait', '2026-09-05');
lead('lead-prior', ws, 'wedding', '2026-08-29', 'Website');
lead('lead-archived', ws, 'wedding', '2026-09-02', 'Hidden');
run("UPDATE crm_enquiries SET status='archived' WHERE id='lead-archived'");
lead('lead-other', other, 'wedding', '2026-09-01', 'Other tenant');
// Totals must not silently inherit the overview's 200-Job limit.
for (let i = 0; i < 205; i++) job('job-' + i);
job('portrait', 'portrait', '2026-09-03', '2026-08-28');
job('today', 'wedding', '2026-09-05', '2026-08-20');
job('cancelled', 'wedding', '2026-09-04', '2026-08-20', ws, 'cancelled');
job('completed', 'wedding', '2026-09-04', '2026-08-20', ws, 'completed');
job('archived', 'wedding', '2026-09-12', '2026-09-02', ws, 'archived');
job('other-job', 'wedding', '2026-09-12', '2026-09-02', other);
for (const [id, jobId, due, status] of [['task-overdue','job-0','2026-08-31','pending'], ['task-future','job-1','2026-10-01','pending'], ['task-completed','job-0','2026-09-01','completed'], ['task-undated','job-0','','pending'], ['task-cancelled-job','cancelled','2026-09-01','pending']]) {
  run('INSERT INTO crm_tasks(id,workspace_id,job_id,title,due_at,status) VALUES(?,?,?,?,?,?)', id, ws, jobId, id, due, status);
}
run("INSERT INTO crm_tasks(id,workspace_id,job_id,title,due_at) VALUES('other-task',?,'other-job','Hidden task','2026-09-01')", other);
invoice('inv-gbp','job-0'); invoice('inv-eur','portrait',ws,'EUR'); invoice('inv-other','other-job',other); invoice('inv-draft','job-1',ws,'GBP','draft');
payment('old-part','inv-gbp','2026-08-24',5000);
payment('new-part','inv-gbp','2026-09-01',3000);
payment('second-part','inv-gbp','2026-09-02',2000);
payment('refund','inv-gbp','2026-09-03',1000,'refund');
payment('eur-part','inv-eur','2026-09-04',7000,'payment',ws,'EUR');
payment('other-part','inv-other','2026-09-01',15000,'payment',other);

assert.deepEqual(api.dashboardRange('7d','2026-09-05'), range);
assert.deepEqual(api.dashboardRange('30d','2026-09-05'), {from:'2026-08-07',to:'2026-09-05'});
assert.deepEqual(api.dashboardRange('mtd','2026-09-05'), {from:'2026-09-01',to:'2026-09-05'});
assert.equal(api.dashboardRange('ytd','2024-12-31').from, '2024-01-01');
assert.equal(api.dashboardDays('2024-02-28','2024-03-01').length, 3);
assert.equal(api.validateDashboardRange('2024-01-01','2024-12-31').previousTo, '2023-12-31');
for (const [from,to] of [['2026-02-30','2026-03-01'],['2026-09-05','2026-09-01'],['2025-01-01','2026-01-02'],['','2026-09-05']]) assert.throws(() => api.validateDashboardRange(from,to), {statusCode:400});
const data = await api.getCrmDashboard(db, actor, range, access, '2026-09-05');
const total = (days, key) => days.reduce((sum, day) => sum + day[key], 0);
const paid = (days, currency) => days.reduce((sum, day) => sum + (day.payments[currency] || 0), 0);
assert.equal(data.sources.find(row => row.name.toLowerCase() === 'instagram').count, 2);
assert.equal(data.days.length, 7); assert.equal(data.previousDays.length, 7);
assert.equal(total(data.days, 'leads'), 4); assert.equal(total(data.previousDays, 'leads'), 1);
assert.equal(total(data.days, 'bookings'), 205); assert.equal(total(data.previousDays, 'bookings'), 1);
assert.equal(total(data.days, 'weddings'), 3);
assert.deepEqual(data.sources.map(row => row.name).sort(), ['Instagram','Not recorded','Referral']);
assert.equal(paid(data.days,'GBP'), 4000); assert.equal(paid(data.previousDays,'GBP'), 5000); assert.equal(paid(data.days,'EUR'), 7000);
assert.equal(data.days.find(day => day.date === '2026-09-03').payments.GBP, -1000);
assert.deepEqual(data.currencies, ['EUR','GBP']);
assert.equal(data.upcoming.length, 206); assert.equal(data.upcoming[0].id, 'today');
assert.deepEqual(data.tasks.map(row => row.id), ['task-overdue','task-future']);
assert.equal(data.payments.find(row => row.invoiceId === 'inv-gbp').amount, 11000);
assert.equal(data.payments.find(row => row.invoiceId === 'inv-eur').amount, 13000);
assert.equal(data.payments.length, 2);
assert.ok(!JSON.stringify(data).includes('other-'));
const filtered = await api.getCrmDashboard(db, actor, {...range,jobType:'portrait'}, access, '2026-09-05');
assert.equal(total(filtered.days,'leads'), 1); assert.equal(paid(filtered.days,'GBP'), 0); assert.equal(paid(filtered.days,'EUR'), 7000);
assert.deepEqual(filtered.tasks, []); assert.equal(filtered.payments.length, 1);
assert.deepEqual(filtered.jobTypes, ['portrait','wedding']);
reads.length = 0;
const limited = await api.getCrmDashboard(db, actor, range, {bookings:false,payments:true});
assert.deepEqual(limited.capabilities,{bookings:false,payments:false});
assert.deepEqual(limited.payments,[]); assert.deepEqual(limited.tasks,[]); assert.deepEqual(limited.upcoming,[]);
assert.equal(paid(limited.days,'GBP'),0); assert.equal(total(limited.days,'bookings'),0);
assert.ok(reads.every(query => !/crm_jobs|crm_invoice|crm_tasks/.test(query)));
await assert.rejects(api.getCrmDashboard(db,{...actor,permissions:[]},range,access), {statusCode:403});
await assert.rejects(api.getCrmDashboard(db,{...actor,workspaceId:''},range,access), {statusCode:403});
await assert.rejects(api.getCrmDashboard(db,actor,{...range,jobType:'x'.repeat(101)},access), {statusCode:400});
const response = await api.route({env:{MKB_DB:db,ADMIN_API_ENABLED:'true',ADMIN_HOSTNAME:'127.0.0.1'},data:{professionalContext:actor},request:new Request('http://127.0.0.1/api/crm/dashboard?from=2026-08-30&to=2026-09-05')});
assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'),'private, no-store');
assert.equal((await response.json()).dashboard.days.length, 7);
const routeContext = () => ({env:{MKB_DB:db,ADMIN_API_ENABLED:'true',ADMIN_HOSTNAME:'127.0.0.1'},data:{professionalContext:actor},request:new Request('http://127.0.0.1/api/crm/dashboard?from=2026-08-30&to=2026-09-05&workspaceId=dashboard-other')});
run("INSERT INTO workspace_entitlements(workspace_id,feature_key,source,enabled) VALUES(?,'invoices','manual',0) ON CONFLICT(workspace_id,feature_key) DO UPDATE SET enabled=0",ws);
const noInvoices = await api.route(routeContext());
assert.equal(noInvoices.status,200);
const limitedRoute = (await noInvoices.json()).dashboard;
assert.deepEqual(limitedRoute.capabilities,{bookings:true,payments:false});
assert.deepEqual(limitedRoute.payments,[]); assert.equal(paid(limitedRoute.days,'GBP'),0);
assert.equal(total(limitedRoute.days,'leads'),4, 'Query-string workspace cannot change the authenticated workspace');
run("INSERT INTO workspace_entitlements(workspace_id,feature_key,source,enabled) VALUES(?,'bookings','manual',0) ON CONFLICT(workspace_id,feature_key) DO UPDATE SET enabled=0",ws);
assert.deepEqual((await (await api.route(routeContext())).json()).dashboard.capabilities,{bookings:false,payments:false});
run("INSERT INTO workspace_entitlements(workspace_id,feature_key,source,enabled) VALUES(?,'crm','manual',0) ON CONFLICT(workspace_id,feature_key) DO UPDATE SET enabled=0",ws);
assert.equal((await api.route(routeContext())).status,403);
assert.equal(sql.prepare("SELECT value FROM schema_meta WHERE key='schema_version'").get().value,'54');
console.log('PASS: dashboard dates, >200 Jobs, sources, booking/event distinction, separate-currency receipt/refund dates, outstanding allocation, tasks, workspace isolation, entitlement capabilities, read-only route and schema 54');

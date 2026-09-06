import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
const {outputFiles}=await build({stdin:{contents:`export * from './serverless/supplier-d1'; export * from './shared/supplier-quality'; export * from './src/admin/navigation/adminSettings'; export {resolveAdminModule,requiredEntitlementsForAdminPath,visibleModuleItems} from './src/admin/navigation/adminModules';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const api=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const sql=new DatabaseSync(':memory:');
sql.exec(readFileSync('d1/schema.sql','utf8'));
const db={prepare(query){return {args:[],bind(...args){this.args=args;return this},async first(){return sql.prepare(query).get(...this.args)||null},async all(){return {results:sql.prepare(query).all(...this.args)}},async run(){return sql.prepare(query).run(...this.args)}}}};
const ws='workspace_mkb_weddings';
const empty=await api.createMasterSupplier(db,{name:'Incomplete',qualityState:'complete'},ws);
assert.equal(empty.qualityState,'needs_details');
assert.deepEqual(empty.missingDetails,['Category','Website, email, phone or Instagram','Location or county']);
const full=await api.updateMasterSupplier(db,{...empty,category:'Florist',instagram:'flowers',county:'Antrim'},ws);
assert.equal(full.qualityState,'complete');
assert.deepEqual(full.missingDetails,[]);
sql.prepare("INSERT INTO crm_jobs(id,workspace_id,reference,title) VALUES('review-job',?,'REVIEW','Review')").run(ws);
sql.prepare("INSERT INTO crm_questionnaire_instances(id,workspace_id,job_id,title) VALUES('review-form',?,'review-job','Review')").run(ws);
sql.prepare("INSERT INTO crm_supplier_submissions(id,workspace_id,job_id,instance_id,field_key,proposed_name,supplier_id) VALUES('review-source',?,'review-job','review-form','team','Incomplete',?)").run(ws,full.id);
assert.equal((await api.getMasterSupplier(db,full.id,ws)).qualityState,'needs_review');
assert.equal((await api.listMasterSuppliers(db,true,ws))[0].pendingReviewCount,1);
assert.equal(await api.getMasterSupplier(db,full.id,'other-workspace'),null);
assert.deepEqual(await api.listMasterSuppliers(db,true,'other-workspace'),[]);
sql.prepare("UPDATE crm_supplier_submissions SET status='rejected' WHERE id='review-source'").run();
assert.equal((await api.getMasterSupplier(db,full.id,ws)).qualityState,'complete');
assert.equal(sql.prepare("SELECT value FROM schema_meta WHERE key='schema_version'").get().value,'54');
const limited=api.visibleSettingsGroups(['crm:read'],new Set(['crm'])).flatMap(g=>g.items);
assert.ok(limited.some(i=>i.label==='Email'));
assert.ok(!limited.some(i=>i.label==='Packages & add-ons'||i.label==='Plan & billing'||i.label==='Team'));
assert.ok(!api.visibleSettingsGroups(['crm:read'],null).flatMap(g=>g.items).some(i=>i.entitlements?.length));
for(const path of ['/admin/crm/contracts/templates/abc','/admin/crm/questionnaires/abc','/admin/crm/templates/quotes/abc','/admin/settings/workspace']) assert.ok(api.isSettingsEditor(path,''));
assert.equal(api.isSettingsEditor('/admin/crm/jobs/abc',''),false);
assert.equal(api.isSettingsEditor('/admin/crm','?view=jobs'),false);
assert.equal(api.isSettingsEditor('/admin/settings',''),false);
console.log('PASS: supplier completeness, review transitions, workspace isolation, schema 54, Settings access and return navigation');

// CRM configuration stays within its own module; the Templates hub has one Settings entry.
const allEntitlements = new Set(['crm','bookings','contracts','client-portal','connected-payments','content-tools','print-store','client-galleries']);
const crmSettings = api.visibleSettingsGroups(['crm:read'],allEntitlements,'crm').flatMap(g=>g.items);
const businessSettings = api.visibleSettingsGroups(['crm:read'],allEntitlements,'business').flatMap(g=>g.items);
assert.equal(crmSettings.filter(i=>i.to === '/admin/crm/templates').length,1);
assert.ok(!businessSettings.some(i=>i.to.startsWith('/admin/crm') || i.to === '/admin/settings/client-portal'));
const options=api.visibleTemplateOptions(['crm:read'],allEntitlements);
assert.equal(options.length,6);
assert.equal(new Set(options.map(i=>i.to)).size,6);
assert.ok(options.find(i=>i.label === 'Contract templates').to === '/admin/crm/templates/contracts');
assert.deepEqual(api.visibleTemplateOptions(['crm:read'],new Set(['crm'])).map(i=>i.label),['Email templates','Workflow templates']);
assert.deepEqual(api.visibleTemplateOptions(['crm:read'],null),[]);
assert.deepEqual(api.visibleTemplateOptions([],allEntitlements),[]);
for(const item of [...crmSettings,...options]) assert.equal(api.resolveAdminModule(item.to.split('?')[0]).key,'crm');
assert.equal(api.resolveAdminModule('/admin/crm/settings').key,'crm');
assert.equal(api.resolveAdminModule('/admin/settings').key,'business');
assert.deepEqual(api.requiredEntitlementsForAdminPath('/admin/crm/templates/quotes'),['bookings']);
assert.deepEqual(api.requiredEntitlementsForAdminPath('/admin/crm/templates/contracts'),['contracts']);
const returns = [
 ['/admin/crm/templates','','/admin/crm/settings'],
 ['/admin/crm/templates/quotes','','/admin/crm/templates'],
 ['/admin/crm/templates/emails','','/admin/crm/templates'],
 ['/admin/crm/templates/contracts','','/admin/crm/templates'],
 ['/admin/crm/templates/quotes/abc','','/admin/crm/templates/quotes'],
 ['/admin/crm/contracts/templates/abc','','/admin/crm/templates/contracts'],
 ['/admin/crm','?view=commercial-settings','/admin/crm/settings'],
 ['/admin/crm','?view=questionnaires','/admin/crm/templates'],
 ['/admin/crm/questionnaires/abc','','/admin/crm/templates/questionnaires'],
 ['/admin/settings/client-portal','','/admin/crm/settings'],
];
for (const [path,search,to] of returns) assert.equal(api.settingsReturnLink(path,search)?.to,to);
assert.equal(api.settingsReturnLink('/admin/crm/settings',''),null);
assert.equal(api.settingsReturnLink('/admin/crm/jobs/abc',''),null);
console.log('PASS: CRM Settings ownership, all template destinations, entitlement filtering and hierarchical returns');

const crmSettingsNav=api.visibleModuleItems(api.resolveAdminModule('/admin/crm/settings'),['crm:read'],allEntitlements).find(i=>i.key==='settings');
assert.equal(crmSettingsNav.to,'/admin/crm/settings');
for(const path of ['/admin/crm/templates','/admin/crm/templates/contracts','/admin/crm/contracts/templates/abc','/admin/settings/client-portal']) assert.equal(crmSettingsNav.match(path,new URLSearchParams()),true);
assert.equal(crmSettingsNav.match('/admin/crm',new URLSearchParams('view=questionnaires')),false);

// Quote navigation is owned by Leads and Jobs, while route entitlements remain enforced.
const crmNav=api.visibleModuleItems(api.resolveAdminModule('/admin/crm'),['crm:read'],allEntitlements);
assert.ok(!crmNav.some(item=>item.key==='quotes' || item.to==='/admin/crm/quotes'));
assert.equal(crmNav.find(item=>item.key==='leads').match('/admin/crm/quotes/abc',new URLSearchParams()),true);
assert.equal(crmNav.find(item=>item.key==='jobs').match('/admin/crm/quotes/abc',new URLSearchParams('jobId=job')),true);
assert.deepEqual(api.requiredEntitlementsForAdminPath('/admin/crm/quotes/abc'),['bookings']);
console.log('PASS: quotes stay within Lead/Job navigation and retain bookings entitlement guards');

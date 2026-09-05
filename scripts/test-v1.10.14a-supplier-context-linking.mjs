#!/usr/bin/env node
// Execute the actual supplier functions against a fresh, isolated schema-53 SQLite DB.
// Only permission/activity/workspace rendering collaborators are stubbed for approval.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(path.join(root, p), 'utf8');
const portal = read('serverless/client-portal-d1.ts');
const section = (start, end) => portal.slice(portal.indexOf(start), portal.indexOf(end, portal.indexOf(start)));
const code = `
import {getMasterSupplier, createMasterSupplier, updateMasterSupplier} from './serverless/supplier-d1';
export {getMasterSupplier, createMasterSupplier, updateMasterSupplier};
export * from './serverless/wedding-d1';
import {captureSupplierContext, commitSupplierContext} from './serverless/wedding-d1';
const json = (v: any, fallback: any) => {try {return typeof v === 'string' ? JSON.parse(v) : v ?? fallback;} catch {return fallback;}};
const text = (v: unknown) => String(v ?? '').trim();
const httpError = (message: string, statusCode = 400) => Object.assign(new Error(message), {statusCode});
const requirePermission = (actor: any) => { if (!actor.allowed) throw httpError('Forbidden', 403); };
const recordJobActivity = async () => {};
const getCrmJobWorkspace = async () => ({});
${section('async function linkSupplierToWedding(', '\nfunction hydrateJob(')}
${section('export async function approveSupplierSubmission(', '\nexport async function rejectSupplierSubmission(')}
const lower=(v:unknown)=>text(v).toLowerCase();
const sanitiseSchema=(v:any)=>json(v,[]);
const validateSubmission=()=>[];
const instanceFiles=async()=>[];
const instanceRow=async(db:any,ws:string,id:string)=>db.prepare('SELECT qi.*, job.wedding_slug FROM crm_questionnaire_instances qi JOIN crm_jobs job ON job.id=qi.job_id AND job.workspace_id=qi.workspace_id WHERE qi.id=? AND qi.workspace_id=?').bind(id,ws).first();
const instanceResponses=async(db:any,ws:string,id:string)=>Object.fromEntries((await db.prepare('SELECT field_key,value_json FROM crm_questionnaire_responses WHERE workspace_id=? AND instance_id=?').bind(ws,id).all()).results.map((r:any)=>[r.field_key,JSON.parse(r.value_json)]));
const authorisedPublicInstance=async(db:any,request:any,ws:string,id:string)=>({identity:{id:null,email:'synthetic@example.test'},row:await instanceRow(db,ws,id)});
const hydrateInstance=(row:any)=>row;
const getQuestionnaireInstanceAdmin=async()=>({});
const sendProfessionalClientActionNotification=async()=>({sent:false});
${section('export async function savePublicQuestionnaire(', '\n\nfunction hydrateJobFile(')}
${section('export async function saveQuestionnaireInstanceAdmin(', '\nexport async function uploadQuestionnaireFile(')}
export {syncSupplierAnswers, captureQuestionnaireSave, commitQuestionnaireAnswers};
`;
const built = await build({stdin: {contents: code, loader: 'ts', resolveDir: root}, bundle: true, write: false, format: 'esm', platform: 'node'});
const api = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const sql = new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys=OFF');
sql.exec(read('d1/schema.sql'));
sql.exec('PRAGMA foreign_keys=ON');
assert.equal(sql.prepare("SELECT value FROM schema_meta WHERE key='schema_version'").get().value, '53');
const db = {
  prepare(query) {
    const stmt = {args: [], bind(...args) { this.args = args; return this; },
      async first() { return sql.prepare(query).get(...this.args) ?? null; },
      async all() { return {results: sql.prepare(query).all(...this.args)}; },
      async run() { return {meta: sql.prepare(query).run(...this.args)}; }};
    return stmt;
  },
  async batch(statements) {
    sql.exec('BEGIN');
    try { const result = []; for (const s of statements) result.push(await s.run()); sql.exec('COMMIT'); return result; }
    catch (e) { sql.exec('ROLLBACK'); throw e; }
  },
};
const A = 'workspace_mkb_weddings', B = 'supplier-context-b';
sql.prepare('INSERT INTO workspaces(id,slug,name) VALUES(?,?,?)').run(B,B,B);
const fields = [{id: 'team', type: 'supplier', label: 'Team', supplierRole: 'Florist'}];
for (const [ws, suffix] of [[A,'a'],[B,'b']]) {
  await api.createAdminWedding(db, {slug: `wedding-${suffix}`, title: 'Wedding', couple: 'Couple', venue: 'Venue', weddingDate: '2026-09-04'}, ws);
  sql.prepare('INSERT INTO crm_jobs(id,workspace_id,reference,title,wedding_slug) VALUES(?,?,?,?,?)').run(`job-${suffix}`,ws,`REF-${suffix}`,'Job',`wedding-${suffix}`);
  sql.prepare('INSERT INTO crm_questionnaire_instances(id,workspace_id,job_id,title) VALUES(?,?,?,?)').run(`instance-${suffix}`,ws,`job-${suffix}`,'Team');
}
const actor = {workspaceId: A, allowed: true};
// Use the professional save's actual lookup: it must carry the Job's Wedding.
const adminSave = portal.slice(portal.indexOf('export async function saveQuestionnaireInstanceAdmin('));
const lookup = adminSave.match(/db\.prepare\(`([\s\S]*?)`\)/)[1];
const row = sql.prepare(lookup).get('instance-a', A);
assert.equal(row.wedding_slug, 'wedding-a');
assert.equal(sql.prepare(lookup).get('instance-a', B), undefined);
const answers = {team: [{mode:'unlisted', name:'Candidate', role:'Florist', email:'candidate@example.test'}]};
const submissions = () => sql.prepare('SELECT * FROM crm_supplier_submissions WHERE workspace_id=? ORDER BY response_index').all(A);
const links = () => sql.prepare('SELECT * FROM wedding_supplier_links WHERE workspace_id=?').all(A);
await api.syncSupplierAnswers(db,A,row,fields,answers,{});
const candidate = submissions()[0];
assert.equal(candidate.status,'pending');
assert.equal(links().length,0);
await assert.rejects(api.approveSupplierSubmission(db,{workspaceId:B,allowed:true},'job-a',candidate.id,{}),{statusCode:404});
await api.approveSupplierSubmission(db,actor,'job-a',candidate.id,{role:'Floral design',reviewNotes:'Professional approval'});
const approved = submissions()[0];
const supplierId = approved.resolved_supplier_id;
assert.equal(approved.status,'approved');
assert.equal((await api.getMasterSupplier(db,supplierId,A)).linkedWeddingCount,1);
await api.updateMasterSupplier(db,{id:supplierId,name:'Renamed supplier'},A);
assert.equal(links()[0].role,'Floral design');
// The exact orphaning path: a stale Wedding document supplies no supplier rows.
await api.updateAdminWedding(db,'wedding-a',{title:'Updated title',suppliers:[]},A);
assert.equal((await api.getMasterSupplier(db,supplierId,A)).linkedWeddingCount,1);
assert.equal(links()[0].role,'Floral design');
assert.equal((await api.getAdminWedding(db,'wedding-a',A)).suppliers[0].name,'Renamed supplier');
await assert.rejects(api.saveWeddingSuppliers(db,'wedding-a',[],A),{statusCode:409});
await api.saveWeddingSuppliers(db,'wedding-a',await api.getWeddingSuppliers(db,'wedding-a',A),A);
assert.equal(links().length,1);
assert.equal(sql.prepare('SELECT count(*) n FROM wedding_suppliers WHERE workspace_id=?').get(A).n,1);
// Unchanged/resorted responses retain identity, professional role, notes and timestamps.
await api.syncSupplierAnswers(db,A,row,fields,answers,answers);
assert.deepEqual({...submissions()[0]}, {...approved});
const reordered = {team:[{mode:'unlisted',name:'Other candidate',role:'Music'},...answers.team]};
await api.syncSupplierAnswers(db,A,row,fields,reordered,answers);
assert.equal(submissions().find(s=>s.id===candidate.id).response_index,1);
const changed = {team:[{mode:'unlisted',name:'Changed candidate',role:'Music'}]};
await api.syncSupplierAnswers(db,A,row,fields,changed,reordered);
const history = submissions().find(s=>s.id===candidate.id);
assert.ok(history.response_index < 0);
assert.equal(history.resolved_supplier_id,supplierId);
assert.equal(history.review_notes,'Professional approval');
await assert.rejects(api.saveWeddingSuppliers(db,'wedding-a',[],A),{statusCode:409});
await api.saveWeddingSuppliers(db,'wedding-a',await api.getWeddingSuppliers(db,'wedding-a',A),A);
assert.equal(links().length,1);
// Resolve the new candidate to the same master in another role.
await api.approveSupplierSubmission(db,actor,'job-a',submissions().find(s=>s.status==='pending').id,{supplierId,role:'Music'});
await assert.rejects(api.saveWeddingSuppliers(db,'wedding-a',[],A),{statusCode:409});
await api.saveWeddingSuppliers(db,'wedding-a',await api.getWeddingSuppliers(db,'wedding-a',A),A);
assert.equal(links().length,2);
assert.equal((await api.getMasterSupplier(db,supplierId,A)).linkedWeddingCount,1);
// Slug changes preserve both live and historical source rows.
await api.updateAdminWedding(db,'wedding-a',{slug:'renamed-wedding'},A);
assert.ok(submissions().every(s=>s.wedding_slug==='renamed-wedding'));
assert.ok(links().every(l=>l.wedding_slug==='renamed-wedding'));
assert.equal(sql.prepare("SELECT wedding_slug FROM crm_jobs WHERE id='job-a'").get().wedding_slug,'renamed-wedding');
assert.equal((await api.getMasterSupplier(db,supplierId,B)),null);
assert.equal((await api.getWeddingSuppliers(db,'wedding-b',B)).length,0);
// Ordinary editorial rows remain removable; source protection is limited to workflow membership.
await api.saveWeddingSuppliers(db,'renamed-wedding',[...await api.getWeddingSuppliers(db,'renamed-wedding',A),{name:'Editorial',role:'Video'}],A);
assert.equal(links().length,3);
await api.saveWeddingSuppliers(db,'renamed-wedding',(await api.getWeddingSuppliers(db,'renamed-wedding',A)).filter(s=>s.name!=='Editorial'),A);
assert.equal(links().length,2);
// Existing-master answers keep their source on resubmit too.
const existing = {team:[{mode:'existing',supplierId,name:'Renamed supplier',role:'Planning'}]};
row.wedding_slug='renamed-wedding';
await api.syncSupplierAnswers(db,A,row,fields,existing,changed);
const linked = submissions().find(s=>s.status==='linked');
await api.syncSupplierAnswers(db,A,row,fields,existing,existing);
assert.equal(submissions().find(s=>s.status==='linked').id,linked.id);
assert.equal(links().length,3);
// Missing Wedding approval must fail before any supplier is created.
const missing = {team:[{mode:'unlisted',name:'Must not create',role:'Other'}]};
await api.syncSupplierAnswers(db,A,{...row,wedding_slug:''},fields,missing,existing);
const before = sql.prepare('SELECT count(*) n FROM suppliers').get().n;
await assert.rejects(api.approveSupplierSubmission(db,actor,'job-a',submissions().find(s=>s.status==='pending').id,{}),{statusCode:409});
assert.equal(sql.prepare('SELECT count(*) n FROM suppliers').get().n,before);
// A failed rebuild rolls back the delete as well as all inserts.
const beforeLinks = links();
sql.exec("CREATE TEMP TRIGGER fail_links BEFORE INSERT ON wedding_supplier_links BEGIN SELECT RAISE(ABORT,'injected rebuild failure'); END;");
await assert.rejects(api.saveWeddingSuppliers(db,'renamed-wedding',await api.getWeddingSuppliers(db,'renamed-wedding',A),A),/injected rebuild failure/);
assert.deepEqual(links(),beforeLinks);
sql.exec('DROP TRIGGER fail_links');
assert.deepEqual(sql.prepare('PRAGMA foreign_key_check').all(),[]);
console.log('PASS Gate 2D1: actual source + schema 53; create/merge, stale Wedding save, supplier replace, master edit, resync/reorder/change, source history, slug continuity, tenant isolation, missing-Wedding guard, atomic rebuild rollback.');

// Gate 2D3: explicit unlink/reassignment with source history and atomic audit.
const originalLinks = links();
const change = {supplierId, role:'Planning', action:'unlink', reason:'Client changed the team'};
await assert.rejects(api.changeJobSupplierLink(db,{...actor,allowed:false},'job-a',change),{statusCode:403});
await assert.rejects(api.changeJobSupplierLink(db,{...actor,accessMode:'support'},'job-a',change),{statusCode:403});
await assert.rejects(api.changeJobSupplierLink(db,{workspaceId:B,allowed:true},'job-a',change),{statusCode:404});
await assert.rejects(api.changeJobSupplierLink(db,actor,'job-a',{...change,reason:''}),{statusCode:400});
assert.deepEqual(links(),originalLinks);
const replacement = await api.createMasterSupplier(db,{name:'Replacement team'},A);
const planningSource = submissions().find(s=>s.role==='Planning');
const staleDocument = await api.getAdminWedding(db,'renamed-wedding',A);
// Audit failure must roll back both membership and source writes.
sql.exec("CREATE TEMP TRIGGER fail_audit BEFORE INSERT ON crm_activities BEGIN SELECT RAISE(ABORT,'injected audit failure'); END;");
await assert.rejects(api.changeJobSupplierLink(db,actor,'job-a',change),/injected audit failure/);
assert.deepEqual(links(),originalLinks);
assert.equal(submissions().find(s=>s.id===planningSource.id).status,planningSource.status);
sql.exec('DROP TRIGGER fail_audit');
await api.changeJobSupplierLink(db,actor,'job-a',{...change,action:'reassign',replacementSupplierId:replacement.id,replacementRole:'Coordination'});
assert.ok(!links().some(l=>l.supplier_id===supplierId && l.role==='Planning'));
assert.ok(links().some(l=>l.supplier_id===replacement.id && l.role==='Coordination'));
const oldReview = submissions().find(s=>s.id===planningSource.id);
assert.equal(oldReview.status,'rejected');
assert.equal(oldReview.resolved_supplier_id,supplierId);
assert.equal(oldReview.review_notes,planningSource.review_notes);
assert.equal(oldReview.reviewed_at,planningSource.reviewed_at);
await api.updateAdminWedding(db,'renamed-wedding',staleDocument,A);
assert.ok(!links().some(l=>l.supplier_id===supplierId && l.role==='Planning'));
const snapshot = await api.getAdminWedding(db,'renamed-wedding',A);
await api.changeJobSupplierLink(db,actor,'job-a',{supplierId:replacement.id,role:'Coordination',action:'unlink',reason:'No longer needed'});
await api.updateAdminWedding(db,'renamed-wedding',snapshot,A);
assert.ok(!links().some(l=>l.supplier_id===replacement.id));
assert.ok(links().some(l=>l.supplier_id===supplierId && l.role==='Music'));
await assert.rejects(api.changeJobSupplierLink(db,actor,'job-a',{supplierId:replacement.id,role:'Coordination',action:'unlink',reason:'Repeat'}),{statusCode:404});
const automatic = {team:[{mode:'existing',supplierId:replacement.id,name:replacement.name,role:'Coordination'}]};
await api.syncSupplierAnswers(db,A,row,fields,automatic,missing);
assert.ok(!links().some(l=>l.supplier_id===replacement.id));
const candidateAgain = submissions().find(s=>s.status==='pending');
assert.ok(candidateAgain);
await api.approveSupplierSubmission(db,actor,'job-a',candidateAgain.id,{supplierId:replacement.id,role:'Coordination'});
assert.ok(links().some(l=>l.supplier_id===replacement.id && l.role==='Coordination'));
const events = sql.prepare("SELECT * FROM crm_activities WHERE event_type IN ('supplier.unlinked','supplier.reassigned')").all();
assert.equal(events.length,2);
assert.equal(JSON.parse(events[0].metadata_json).previousReviews[0].id,planningSource.id);
assert.deepEqual(sql.prepare('PRAGMA foreign_key_check').all(),[]);
console.log('PASS Gate 2D3: scoped unlink/reassign, preserved review, stale-save and questionnaire protection, deliberate reapproval, atomic activity rollback.');

const changedAfterReapproval = {team:[{...automatic.team[0],name:'Updated questionnaire display name'}]};
await api.syncSupplierAnswers(db,A,row,fields,changedAfterReapproval,automatic);
assert.ok(submissions().some(s=>s.status==='linked' && s.resolved_supplier_id===replacement.id));
await assert.rejects(api.saveWeddingSuppliers(db,'renamed-wedding',[...await api.getWeddingSuppliers(db,'renamed-wedding',A),{supplierId,name:'Renamed supplier',role:'Planning'}],A),{statusCode:409});
const otherTenant = await api.createMasterSupplier(db,{name:'Other tenant replacement'},B);
await assert.rejects(api.changeJobSupplierLink(db,actor,'job-a',{supplierId:replacement.id,role:'Coordination',action:'reassign',reason:'Invalid tenant',replacementSupplierId:otherTenant.id,replacementRole:'Coordination'}),{statusCode:400});
console.log('PASS reapproved membership remains usable; stale explicit restore and cross-tenant replacement denied.');

// Deterministic interleaving: pause one operation after all reads, before its batch.
const nextTarget = await api.createMasterSupplier(db,{name:'Concurrent replacement'},A);
let reachedBatch, releaseBatch;
const batchReached = new Promise(resolve=>reachedBatch=resolve);
const release = new Promise(resolve=>releaseBatch=resolve);
const pausedDb = {...db, async batch(statements){reachedBatch();await release;return db.batch(statements)}};
const pendingUnlink = api.changeJobSupplierLink(pausedDb,actor,'job-a',{supplierId:replacement.id,role:'Coordination',action:'unlink',reason:'First request, paused'});
await batchReached;
await api.changeJobSupplierLink(db,actor,'job-a',{supplierId:replacement.id,role:'Coordination',action:'reassign',replacementSupplierId:nextTarget.id,replacementRole:'Coordination',reason:'Second request commits first'});
releaseBatch();
await assert.rejects(pendingUnlink, {statusCode:409});
const committedLinks=await api.getWeddingSuppliers(db,'renamed-wedding',A);
const committedDraft=await api.getAdminWedding(db,'renamed-wedding',A);
assert.ok(committedLinks.some(s=>s.supplierId===nextTarget.id));
assert.ok(committedDraft.suppliers.some(s=>s.supplierId===nextTarget.id));
console.log('PASS concurrent stale unlink rejected; winning reassignment and draft retained.');
// Rebuild pauses after the withdrawn/source checks. Unlink then commits first.
let replaceReached, replaceRelease;
const replaceWaiting=new Promise(resolve=>replaceReached=resolve);
const replaceContinue=new Promise(resolve=>replaceRelease=resolve);
const delayedReplaceDb={...db,async batch(statements){replaceReached();await replaceContinue;return db.batch(statements)}};
const beforeRows=await api.getWeddingSuppliers(db,'renamed-wedding',A);
const pendingSave=api.saveWeddingSuppliers(delayedReplaceDb,'renamed-wedding',beforeRows,A);
await replaceWaiting;
await api.changeJobSupplierLink(db,actor,'job-a',{supplierId:nextTarget.id,role:'Coordination',action:'unlink',reason:'Unlink while earlier editorial save waits'});
replaceRelease();await assert.rejects(pendingSave, {statusCode:409});
assert.ok(!(await api.getWeddingSuppliers(db,'renamed-wedding',A)).some(s=>s.supplierId===nextTarget.id));
assert.ok(!submissions().some(s=>s.resolved_supplier_id===nextTarget.id && ['linked','approved'].includes(s.status)));
console.log('PASS in-flight stale supplier save rejected after explicit unlink.');

// Reapprove the original resolved source directly, without editing answers.
const withdrawnSource = submissions().find(s => s.resolved_supplier_id === nextTarget.id && s.status === 'rejected');
const originalReview = {...withdrawnSource};
await assert.rejects(api.reapproveSupplierSubmission(db, {...actor, allowed:false}, 'job-a', withdrawnSource.id, {reason:'Restore'}), {statusCode:403});
await assert.rejects(api.reapproveSupplierSubmission(db, {...actor, accessMode:'support'}, 'job-a', withdrawnSource.id, {reason:'Restore'}), {statusCode:403});
await assert.rejects(api.reapproveSupplierSubmission(db, {...actor, workspaceId:B}, 'job-a', withdrawnSource.id, {reason:'Restore'}), {statusCode:404});
await assert.rejects(api.reapproveSupplierSubmission(db, actor, 'job-a', withdrawnSource.id, {reason:''}), {statusCode:400});
sql.exec("CREATE TEMP TRIGGER fail_reapproval_audit BEFORE INSERT ON crm_activities WHEN NEW.event_type = 'supplier.reapproved' BEGIN SELECT RAISE(ABORT,'reapproval audit failure'); END;");
await assert.rejects(api.reapproveSupplierSubmission(db, actor, 'job-a', withdrawnSource.id, {reason:'Restore'}), /reapproval audit failure/);
assert.ok(!links().some(s=>s.supplier_id===nextTarget.id));
sql.exec('DROP TRIGGER fail_reapproval_audit');
await api.reapproveSupplierSubmission(db, actor, 'job-a', withdrawnSource.id, {reason:'Client confirmed original supplier again'});
assert.deepEqual({...submissions().find(s=>s.id===originalReview.id)}, originalReview);
assert.ok(submissions().some(s=>s.id!==originalReview.id && s.resolved_supplier_id===nextTarget.id && s.status==='approved' && s.review_notes==='Client confirmed original supplier again'));
assert.ok(links().some(s=>s.supplier_id===nextTarget.id));
assert.ok((await api.getAdminWedding(db,'renamed-wedding',A)).suppliers.some(s=>s.supplierId===nextTarget.id));
await assert.rejects(api.reapproveSupplierSubmission(db, actor, 'job-a', withdrawnSource.id, {reason:'Double click'}), {statusCode:409});
assert.deepEqual(sql.prepare('PRAGMA foreign_key_check').all(),[]);
console.log('PASS direct scoped reapproval, reason required, immutable withdrawn review, atomic rollback and repeat guard.');

// Full Wedding saves share the same transaction guard (including draft fields).
let fullReached, fullRelease;
const fullWaiting=new Promise(resolve=>fullReached=resolve), fullContinue=new Promise(resolve=>fullRelease=resolve);
const fullDb={...db,async batch(statements){fullReached();await fullContinue;return db.batch(statements)}};
const fullSnapshot=await api.getAdminWedding(db,'renamed-wedding',A);
const pendingFull=api.updateAdminWedding(fullDb,'renamed-wedding',{...fullSnapshot,title:'Stale title'},A);
await fullWaiting;
await api.changeJobSupplierLink(db,actor,'job-a',{supplierId:nextTarget.id,role:'Coordination',action:'unlink',reason:'Winning unlink during full save'});
fullRelease();await assert.rejects(pendingFull,{statusCode:409});
assert.ok(!links().some(s=>s.supplier_id===nextTarget.id));
assert.notEqual((await api.getAdminWedding(db,'renamed-wedding',A)).title,'Stale title');

// A new master is buffered with its approval; a stale approval creates nothing.
await api.syncSupplierAnswers(db,A,row,fields,{team:[{mode:'unlisted',name:'Atomic new supplier',role:'Florist'}]},changedAfterReapproval);
const freshCandidate=submissions().find(s=>s.status==='pending');
let approvalReached, approvalRelease;
const approvalWaiting=new Promise(resolve=>approvalReached=resolve), approvalContinue=new Promise(resolve=>approvalRelease=resolve);
const approvalDb={...db,async batch(statements){approvalReached();await approvalContinue;return db.batch(statements)}};
const pendingApproval=api.approveSupplierSubmission(approvalDb,actor,'job-a',freshCandidate.id,{});
await approvalWaiting;
sql.prepare("UPDATE weddings SET document_json=json_set(document_json,'$.intro','Concurrent content edit') WHERE workspace_id=? AND slug='renamed-wedding'").run(A);
approvalRelease();await assert.rejects(pendingApproval,{statusCode:409});
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM suppliers WHERE name='Atomic new supplier'").get().n,0);
assert.equal(submissions().find(s=>s.id===freshCandidate.id).status,'pending');
assert.equal(sql.prepare("SELECT json_extract(document_json,'$.intro') AS intro FROM weddings WHERE workspace_id=? AND slug='renamed-wedding'").get(A).intro,'Concurrent content edit');
await api.approveSupplierSubmission(db,actor,'job-a',freshCandidate.id,{});
const approvedNew=submissions().find(s=>s.id===freshCandidate.id);
assert.equal(approvedNew.status,'approved');assert.ok(links().some(s=>s.supplier_id===approvedNew.resolved_supplier_id));
assert.deepEqual(sql.prepare('PRAGMA foreign_key_check').all(),[]);
console.log('PASS full Wedding conflict rolls back metadata; new supplier approval conflict creates no orphan and remains retryable.');

// Both actual save callers: response and completion writes roll back with source conflict.
for (const caller of ['professional','public']) {
 const previousName=submissions().find(s=>s.response_index===0&&s.field_key==='team').proposed_name;
 const before={team:[{mode:'unlisted',name:previousName,role:'Florist'}]};
 const after={team:[{mode:'unlisted',name:'New candidate '+caller,role:'Florist'}]};
 sql.prepare("UPDATE crm_questionnaire_instances SET schema_json=?, status='completed' WHERE id='instance-a' AND workspace_id=?").run(JSON.stringify(fields),A);
 sql.prepare("INSERT INTO crm_questionnaire_responses(workspace_id,instance_id,field_key,value_json) VALUES(?,'instance-a','team',?) ON CONFLICT(instance_id,field_key) DO UPDATE SET value_json=excluded.value_json").run(A,JSON.stringify(before.team));
 const save=(adapter,responses)=>caller==='professional'?api.saveQuestionnaireInstanceAdmin(adapter,actor,'instance-a',{responses,complete:true}):api.savePublicQuestionnaire(adapter,{},A,'instance-a',{responses,submit:true});
 let reached,release;
 const waiting=new Promise(resolve=>reached=resolve),continued=new Promise(resolve=>release=resolve);
 const delayed={...db,async batch(statements){reached();await continued;return db.batch(statements)}};
 const operation=save(delayed,after);
 await waiting;
 sql.prepare("UPDATE weddings SET document_json=json_set(document_json,'$.concurrentQuestionnaireTest',?) WHERE workspace_id=? AND slug='renamed-wedding'").run(caller,A);
 release();await assert.rejects(operation,{statusCode:409});
 const persisted=()=>JSON.parse(sql.prepare("SELECT value_json FROM crm_questionnaire_responses WHERE workspace_id=? AND instance_id='instance-a' AND field_key='team'").get(A).value_json);
 assert.deepEqual(persisted(),before.team);
 await save(db,after);
 assert.deepEqual(persisted(),after.team);
 const candidate=submissions().find(s=>s.status==='pending'&&s.proposed_name==='New candidate '+caller);
 assert.ok(candidate,'new candidate must enter review after retry');
 await api.approveSupplierSubmission(db,actor,'job-a',candidate.id,{});
 // Invalid later supplier field must roll back every field and completion state.
 const twoFields=[...fields,{id:'second',type:'supplier',label:'Second'}];
 sql.prepare("UPDATE crm_questionnaire_instances SET schema_json=?,status='sent' WHERE id='instance-a' AND workspace_id=?").run(JSON.stringify(twoFields),A);
 await assert.rejects(save(db,{team:[{mode:'unlisted',name:'Must not persist',role:'Florist'}],second:[{mode:'existing',supplierId:'missing-master',name:'Missing',role:'Music'}]}),{statusCode:400});
 assert.deepEqual(persisted(),after.team);
 assert.equal(sql.prepare("SELECT status FROM crm_questionnaire_instances WHERE id='instance-a'").get().status,'sent');
 assert.ok(!submissions().some(s=>s.proposed_name==='Must not persist'));
}
console.log('PASS actual public/professional callers: conflict rolls back answers; retry queues new candidate; later-field failure rolls back all answers/completion.');

// Draft saves are fenced too, even when supplier synchronization is not required.
let draftReached,draftRelease;
const draftWaiting=new Promise(resolve=>draftReached=resolve),draftContinue=new Promise(resolve=>draftRelease=resolve);
const delayedDraft={...db,async batch(statements){draftReached();await draftContinue;return db.batch(statements)}};
const staleDraftSave=api.saveQuestionnaireInstanceAdmin(delayedDraft,actor,'instance-a',{responses:{team:[{mode:'unlisted',name:'Losing draft'}]}});
await draftWaiting;
await api.saveQuestionnaireInstanceAdmin(db,actor,'instance-a',{responses:{team:[{mode:'unlisted',name:'Winning draft'}]}});
draftRelease();await assert.rejects(staleDraftSave,{statusCode:409});
assert.equal(JSON.parse(sql.prepare("SELECT value_json FROM crm_questionnaire_responses WHERE instance_id='instance-a' AND field_key='team'").get().value_json)[0].name,'Winning draft');
console.log('PASS concurrent questionnaire-only draft save rejects stale request and keeps winning answers.');

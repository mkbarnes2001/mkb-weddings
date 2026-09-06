#!/usr/bin/env node
// Actual claim and orchestration code; synthetic collaborators, no provider calls.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('serverless/crm-payment-receipts-d1.ts',root),'utf8');
const claim = source.slice(source.indexOf('async function claimCommunication('),source.indexOf('\nexport async function markCommunicationSent('));
const orchestration = source.slice(source.indexOf('export async function deliverInvoicePaymentReceiptNotifications('));
const notificationError = source.slice(source.indexOf('function notificationError('),source.indexOf('\nasync function paymentContext('));
const contents = `
const text=(v:any)=>String(v??'').trim();
const lower=(v:any)=>text(v).toLowerCase();
const objectValue=(v:any)=>v?JSON.parse(v):{};
const normaliseHostname=text;
const receiptReference=()=>"synthetic-receipt";
${notificationError}
${claim}
const paymentContext=async()=>({workspace_id:'workspace_mkb_weddings'});
async function deliverClientReceipt(db:any, env:any) { return deliver(db,env,'client'); }
async function deliverProfessionalNotification(db:any, env:any) { return deliver(db,env,'professional'); }
async function deliver(db:any, env:any, channel:string) {
 const result = await claimCommunication(db, {id:channel,workspaceId:'workspace_mkb_weddings',jobId:'receipt-job',contactId:'',direction:'outbound',subject:'Synthetic',body:'Synthetic',occurredAt:new Date().toISOString(),metadata:{}});
 if (!result.claimed) return {state:result.state};
 env.calls.push(channel);
 if (env.fail===channel) throw new Error('simulated worker interruption');
 await db.prepare("UPDATE crm_communications SET status='sent' WHERE id=?").bind(channel).run();
 return {state:'sent'};
}
${orchestration}
`;
const compiled=await build({stdin:{contents,loader:'ts'},write:false,bundle:true,format:'esm',platform:'node'});
const api=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const sql=new DatabaseSync(':memory:');
sql.exec(readFileSync(new URL('d1/schema.sql',root),'utf8'));
sql.prepare("INSERT INTO crm_jobs(id,workspace_id,reference,title) VALUES('receipt-job','workspace_mkb_weddings','RECEIPT','Synthetic')").run();
const db={prepare(query){return {args:[],bind(...args){this.args=args;return this},async run(){return {meta:sql.prepare(query).run(...this.args)}},async first(){return sql.prepare(query).get(...this.args)}}}};
const env={calls:[],fail:'client'};
await assert.rejects(api.deliverInvoicePaymentReceiptNotifications(db,env,{}),{statusCode:502});
assert.deepEqual(env.calls,['client','professional']);
env.fail='';env.calls=[];
await assert.rejects(api.deliverInvoicePaymentReceiptNotifications(db,env,{}),{statusCode:502});
assert.deepEqual(env.calls,[],'live abandoned claim must not send or acknowledge success');
sql.exec("UPDATE crm_communications SET updated_at=datetime('now','-11 minutes') WHERE id='client'");
const recovered=await api.deliverInvoicePaymentReceiptNotifications(db,env,{});
assert.equal(recovered.client,'sent');assert.equal(recovered.professional,'already_sent');
assert.deepEqual(env.calls,['client']);
env.calls=[];
const repeated=await api.deliverInvoicePaymentReceiptNotifications(db,env,{});
assert.equal(repeated.client,'already_sent');assert.equal(repeated.professional,'already_sent');
assert.deepEqual(env.calls,[]);
console.log('PASS abandoned claim produces 502, expired lease retries only unfinished channel, completed duplicate skips both; no email/network.');

// Execute both Resend request builders with an in-memory fetch stub.
// A retry carries the same durable communication key; no request leaves this process.
const deliverySource=readFileSync(new URL('serverless/crm-email-delivery-d1.ts',root),'utf8');
const professionalSource=readFileSync(new URL('serverless/crm-client-action-notifications-d1.ts',root),'utf8');
const compiledDelivery=await build({stdin:{contents:deliverySource+'\nexport {sendManagedEmail};',loader:'ts',resolveDir:new URL('serverless/',root).pathname},write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'no-sockets',setup(b){b.onResolve({filter:/^cloudflare:sockets$/},()=>({path:'blocked',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const connect=()=>{throw Error("No sockets in test")}',loader:'js'}));}}]});
const compiledProfessional=await build({stdin:{contents:professionalSource,loader:'ts'},write:false,bundle:true,format:'esm',platform:'node'});
const managed=await import(`data:text/javascript;base64,${Buffer.from(compiledDelivery.outputFiles[0].text).toString('base64')}`);
const professional=await import(`data:text/javascript;base64,${Buffer.from(compiledProfessional.outputFiles[0].text).toString('base64')}`);
const originalFetch=globalThis.fetch, captured=[];
globalThis.fetch=async(url,input)=>{captured.push({url,...input});return new Response(JSON.stringify({id:'synthetic-provider-id'}),{status:200})};
try {
 const input={to:'client@example.test',fromName:'Test',fromEmail:'sender@example.test',replyToEmail:'',subject:'Synthetic',body:'Synthetic',idempotencyKey:'receipt-key'};
 await managed.sendManagedEmail({RESEND_API_KEY:'synthetic'},input);
 await managed.sendManagedEmail({RESEND_API_KEY:'synthetic'},input);
 const fakeDb={prepare(){return {bind(){return this},async first(){return {notification_email:'owner@example.test',business_name:'Test',job_title:'Test',job_reference:'TEST'}}}}};
 await professional.sendProfessionalClientActionNotification(fakeDb,{RESEND_API_KEY:'synthetic',WEDPLANNED_AUTH_FROM_EMAIL:'sender@example.test'}, {workspaceId:'synthetic',jobId:'synthetic',action:'payment_received',documentTitle:'Synthetic',clientName:'Client',clientEmail:'client@example.test',idempotencyKey:'notification-key'});
 assert.deepEqual(captured.map(r=>r.headers['Idempotency-Key']),['receipt-key','receipt-key','notification-key']);
 assert.equal(captured[0].body,captured[1].body);
 assert.ok(source.includes('idempotencyKey: communicationId'));
 assert.ok(deliverySource.includes('idempotencyKey: input.idempotencyKey'));
} finally { globalThis.fetch=originalFetch; }
console.log('PASS actual managed/professional request builders carry durable idempotency headers; all fetches intercepted, no email sent.');

// Gate 2D4B: actual receipt delivery functions and durable state transitions.
// Only the transport boundary is simulated; it must pass through prepareRequest.
const utilities=source.slice(source.indexOf('function text('),source.indexOf('\nasync function paymentContext('));
const deliveryFunctions=source.slice(source.indexOf('async function claimCommunication('));
const lifecycleCode=`
${utilities}
const paymentContext=async(db:any,input:any)=>input.context;
async function sendCrmEmail(db:any,env:any,actor:any,input:any) {
 const bytes=await input.prepareRequest(env.transport||'resend',JSON.stringify({to:input.to,subject:input.subject,body:input.body,from:env.from||'original@example.test'}),env.account||'synthetic-key');
 env.calls.push(bytes);
 if(env.fail)throw new Error('Provider outcome unknown');
 return {provider:env.transport||'resend',providerMessageId:'synthetic-accepted',deliveryMode:'managed'};
}
async function sendProfessionalClientActionNotification(db:any,env:any,input:any) {
 const bytes=await input.prepareRequest('resend',JSON.stringify({to:env.notificationRecipient||'owner@example.test',amount:input.amount,balance:input.balanceAmount}),env.account||'synthetic-key');
 env.calls.push(bytes);
 if(env.fail)throw new Error('Provider outcome unknown');
 return {sent:true,provider:'resend',providerMessageId:'synthetic-professional'};
}
${deliveryFunctions}
export {claimCommunication,deliverClientReceipt,deliverProfessionalNotification};
`;
const lifecycleCompiled=await build({stdin:{contents:lifecycleCode,loader:'ts'},write:false,bundle:true,format:'esm',platform:'node'});
const lifecycle=await import(`data:text/javascript;base64,${Buffer.from(lifecycleCompiled.outputFiles[0].text).toString('base64')}`);
const ws='workspace_mkb_weddings';
const details={receiptReference:'R-1',businessName:'Original business',clientName:'Original client',clientEmail:'original@example.test',invoiceReference:'INV-1',amount:100,currency:'GBP',totalPaidAmount:100,balanceAmount:900,paidAt:'2026-09-05T00:00:00Z',portalUrl:'https://example.test/client-portal'};
const ctx=payment_id=>({payment_id,workspace_id:ws,job_id:'receipt-job',invoice_id:'invoice-local'});
const rowFor=id=>sql.prepare('SELECT * FROM crm_communications WHERE id=?').get(id);
const expire=id=>sql.prepare("UPDATE crm_communications SET updated_at=datetime('now','-11 minutes') WHERE id=?").run(id);
const mock={calls:[],fail:true};
await assert.rejects(lifecycle.deliverClientReceipt(db,mock,ctx('frozen'),details),/Provider outcome unknown/);
const receiptId='crm_communication_payment_receipt_frozen';
const firstRow=rowFor(receiptId),firstMeta=JSON.parse(firstRow.metadata_json);
assert.equal(firstMeta._receiptRequest.body,mock.calls[0]);
assert.ok(!firstRow.metadata_json.includes('synthetic-key'),'credential must not be persisted');
mock.fail=false;mock.from='changed@example.test';
await lifecycle.deliverClientReceipt(db,mock,ctx('frozen'),{...details,clientEmail:'changed@example.test',balanceAmount:0,businessName:'Changed business'});
assert.equal(mock.calls[0],mock.calls[1],'retry must reuse exact first request bytes');
assert.equal(rowFor(receiptId).body,firstRow.body);
assert.equal(rowFor(receiptId).subject,firstRow.subject);
assert.equal(JSON.parse(rowFor(receiptId).metadata_json).recipient,'original@example.test');
assert.equal(rowFor(receiptId).status,'sent');
assert.equal((await lifecycle.deliverClientReceipt(db,mock,ctx('frozen'),details)).state,'already_sent');
assert.equal(mock.calls.length,2);

// Provider accepted, local completion write fails: original request remains reusable.
sql.exec("CREATE TEMP TRIGGER receipt_complete_failure BEFORE UPDATE ON crm_communications WHEN NEW.status='sent' AND NEW.id='crm_communication_payment_receipt_completion' BEGIN SELECT RAISE(ABORT,'completion write failed'); END;");
mock.calls=[];
await assert.rejects(lifecycle.deliverClientReceipt(db,mock,ctx('completion'),details),/completion write failed/);
sql.exec('DROP TRIGGER receipt_complete_failure');
await lifecycle.deliverClientReceipt(db,mock,ctx('completion'),{...details,balanceAmount:1});
assert.equal(mock.calls.length,2);assert.equal(mock.calls[0],mock.calls[1]);

// Gmail/SMTP have no deduplicating replay: flag uncertainty, without resending.
for(const transport of ['gmail','smtp']) {
 const unsafe={calls:[],transport,fail:true};
 await assert.rejects(lifecycle.deliverClientReceipt(db,unsafe,ctx(transport),details),/Provider outcome unknown/);
 unsafe.fail=false;
 assert.equal((await lifecycle.deliverClientReceipt(db,unsafe,ctx(transport),details)).state,'review_required');
 assert.equal(unsafe.calls.length,1);
 assert.match(rowFor('crm_communication_payment_receipt_'+transport).failure_reason,/review/);
}
// Expired Resend key and account change fail closed before a second request.
const expired={calls:[],fail:true};
await assert.rejects(lifecycle.deliverClientReceipt(db,expired,ctx('expired'),details));
sql.prepare("UPDATE crm_communications SET metadata_json=json_set(metadata_json,'$._receiptRequest.startedAt',datetime('now','-24 hours')) WHERE id=?").run('crm_communication_payment_receipt_expired');
assert.equal((await lifecycle.deliverClientReceipt(db,expired,ctx('expired'),details)).state,'review_required');
assert.equal(expired.calls.length,1);
const account={calls:[],fail:true};
await assert.rejects(lifecycle.deliverClientReceipt(db,account,ctx('account'),details));
account.account='different-key';account.fail=false;
await assert.rejects(lifecycle.deliverClientReceipt(db,account,ctx('account'),details),/needs review/);
assert.equal(account.calls.length,1);
assert.equal((await lifecycle.deliverClientReceipt(db,account,ctx('account'),details)).state,'review_required');

// An old worker cannot complete or fail a reclaimed attempt.
const leaseInput={id:'lease-fence',workspaceId:ws,contactId:'',jobId:'receipt-job',direction:'outbound',subject:'Original',body:'Original',occurredAt:'2026-09-05',metadata:{receiptDetails:details}};
const lease1=await lifecycle.claimCommunication(db,leaseInput);expire('lease-fence');
const lease2=await lifecycle.claimCommunication(db,{...leaseInput,subject:'Changed',body:'Changed'});
assert.ok(lease1.claimed&&lease2.claimed);assert.notEqual(lease1.leaseToken,lease2.leaseToken);
assert.equal(lease2.snapshot.subject,'Original');
await assert.rejects(lifecycle.prepareReceiptRequest(db,ws,'lease-fence',lease1.leaseToken)('resend','body','key'),/lease changed/);
await assert.rejects(lifecycle.markCommunicationSent(db,{id:'lease-fence',workspaceId:ws,leaseToken:lease1.leaseToken,provider:'resend',providerMessageId:'old',metadata:{}}),/lease changed/);
await assert.rejects(lifecycle.markCommunicationFailed(db,{id:'lease-fence',workspaceId:ws,leaseToken:lease1.leaseToken,provider:'resend',reason:'old worker',metadata:{}}),/lease changed/);
assert.equal(rowFor('lease-fence').status,'draft');
assert.equal(JSON.parse(rowFor('lease-fence').metadata_json)._receiptLease,lease2.leaseToken);
await lifecycle.prepareReceiptRequest(db,ws,'lease-fence',lease2.leaseToken)('resend','exact bytes','key');
assert.equal(JSON.parse(rowFor('lease-fence').metadata_json)._receiptRequest.body,'exact bytes');

// Professional notification freezes its recipient and balance too.
const pro={calls:[],fail:true};
await assert.rejects(lifecycle.deliverProfessionalNotification(db,pro,ctx('professional'),details));
pro.fail=false;pro.notificationRecipient='changed@example.test';
await lifecycle.deliverProfessionalNotification(db,pro,ctx('professional'),{...details,balanceAmount:0});
assert.equal(pro.calls[0],pro.calls[1]);
console.log('PASS immutable request/business snapshot, completion interruption, Gmail/SMTP review holds, expiry/account guards, attempt fencing and professional snapshot; no email/network.');

// The real request builders must send persisted bytes, even after all inputs change.
const replayInput={...leaseInput,id:'builder-replay'};
const builderLease=await lifecycle.claimCommunication(db,replayInput);
const builderRequests=[];
globalThis.fetch=async(url,input)=>{builderRequests.push(input);return new Response(JSON.stringify({id:'synthetic-only'}),{status:200})};
try {
 const request={to:'first@example.test',fromName:'First',fromEmail:'first-sender@example.test',replyToEmail:'reply@example.test',subject:'First',body:'Original',idempotencyKey:replayInput.id,
   prepareRequest:lifecycle.prepareReceiptRequest(db,ws,replayInput.id,builderLease.leaseToken)};
 await managed.sendManagedEmail({RESEND_API_KEY:'key'},request);
 expire(replayInput.id);
 const retry=await lifecycle.claimCommunication(db,replayInput);
 await managed.sendManagedEmail({RESEND_API_KEY:'key'},{...request,to:'different@example.test',fromName:'Different',fromEmail:'different-sender@example.test',subject:'Different',body:'Different',prepareRequest:lifecycle.prepareReceiptRequest(db,ws,replayInput.id,retry.leaseToken)});
 assert.equal(builderRequests[0].body,builderRequests[1].body);
 assert.equal(builderRequests[0].headers['Idempotency-Key'],builderRequests[1].headers['Idempotency-Key']);
} finally {globalThis.fetch=originalFetch;}
// Legacy unknown draft cannot be replayed under newly added protections.
sql.prepare("INSERT INTO crm_communications(id,workspace_id,job_id,channel,status,metadata_json,updated_at) VALUES('legacy',?,'receipt-job','email','draft','{}',datetime('now','-11 minutes'))").run(ws);
assert.equal((await lifecycle.claimCommunication(db,{...leaseInput,id:'legacy'})).state,'review_required');
assert.match(rowFor('legacy').failure_reason,/review/);
console.log('PASS real request builder replays identical bytes and key; legacy unknown attempt held for review.');

// Gate 2D5A: resolve holds without sending, atomically with actor audit.
db.batch=async statements=>{sql.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e}};
sql.prepare("INSERT INTO platform_users(id,email_normalized,email,display_name) VALUES('receipt-reviewer','reviewer@example.test','reviewer@example.test','Reviewer')").run();
const reviewer={workspaceId:ws,userId:'receipt-reviewer',email:'reviewer@example.test',permissions:['crm:manage']};
const heldId='crm_communication_payment_receipt_expired';
const resolution={outcome:'confirmed_delivered',reason:'Verified provider log entry TEST-DELIVERY'};
await assert.rejects(lifecycle.resolveReceiptReview(db,{...reviewer,permissions:[]},'receipt-job',heldId,resolution),{statusCode:403});
await assert.rejects(lifecycle.resolveReceiptReview(db,{...reviewer,accessMode:'support'},'receipt-job',heldId,resolution),{statusCode:403});
await assert.rejects(lifecycle.resolveReceiptReview(db,{...reviewer,workspaceId:'other-workspace'},'receipt-job',heldId,resolution),{statusCode:404});
await assert.rejects(lifecycle.resolveReceiptReview(db,reviewer,'other-job',heldId,resolution),{statusCode:404});
await assert.rejects(lifecycle.resolveReceiptReview(db,reviewer,'receipt-job',heldId,{...resolution,reason:''}),{statusCode:400});
const heldBefore={...rowFor(heldId)};
sql.exec("CREATE TEMP TRIGGER resolution_audit_failure BEFORE INSERT ON crm_activities WHEN NEW.event_type='receipt.review_resolved' BEGIN SELECT RAISE(ABORT,'resolution audit failed'); END;");
await assert.rejects(lifecycle.resolveReceiptReview(db,reviewer,'receipt-job',heldId,resolution),/resolution audit failed/);
assert.deepEqual({...rowFor(heldId)},heldBefore);sql.exec('DROP TRIGGER resolution_audit_failure');
await lifecycle.resolveReceiptReview(db,reviewer,'receipt-job',heldId,resolution);
assert.equal((await lifecycle.deliverClientReceipt(db,expired,ctx('expired'),details)).state,'already_sent');
assert.equal(expired.calls.length,1);
assert.equal(JSON.parse(rowFor(heldId).metadata_json)._receiptResolution.reason,resolution.reason);
assert.equal(JSON.parse(rowFor(heldId).metadata_json)._receiptRequest.body,JSON.parse(heldBefore.metadata_json)._receiptRequest.body);
await assert.rejects(lifecycle.resolveReceiptReview(db,reviewer,'receipt-job',heldId,resolution),{statusCode:409});
const noSendId='crm_communication_payment_receipt_gmail';
await lifecycle.resolveReceiptReview(db,reviewer,'receipt-job',noSendId,{outcome:'do_not_resend',reason:'Client already has the receipt; close retries'});
const noSend={calls:[]};
assert.equal((await lifecycle.deliverClientReceipt(db,noSend,ctx('gmail'),details)).state,'resolved_no_send');assert.deepEqual(noSend.calls,[]);
const oldLease=JSON.parse(rowFor(noSendId).metadata_json)._receiptLease;
await assert.rejects(lifecycle.prepareReceiptRequest(db,ws,noSendId,oldLease)('gmail','body','account'),/lease changed/);
// Two reviewers cannot overwrite each other's terminal decision.
let resolveReached,resolveRelease;
const resolveWaiting=new Promise(resolve=>resolveReached=resolve),resolveContinue=new Promise(resolve=>resolveRelease=resolve);
const resolvingDb={...db,async batch(statements){resolveReached();await resolveContinue;return db.batch(statements)}};
const concurrentId='crm_communication_payment_receipt_smtp';
const staleResolution=lifecycle.resolveReceiptReview(resolvingDb,reviewer,'receipt-job',concurrentId,resolution);
await resolveWaiting;
await lifecycle.resolveReceiptReview(db,reviewer,'receipt-job',concurrentId,{outcome:'do_not_resend',reason:'Winning reviewer decision'});
resolveRelease();await assert.rejects(staleResolution,{statusCode:409});
assert.equal(JSON.parse(rowFor(concurrentId).metadata_json)._receiptResolution.reason,'Winning reviewer decision');
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM crm_activities WHERE event_type='receipt.review_resolved'").get().n,3);
// Actual orchestration returns normally once both channels have terminal outcomes.
const terminalContext={...ctx('gmail'),client_snapshot_json:JSON.stringify({email:details.clientEmail}),business_snapshot_json:'{}'};
const orchestrationEnv={calls:[]};
const settled=await lifecycle.deliverInvoicePaymentReceiptNotifications(db,orchestrationEnv,{context:terminalContext});
assert.equal(settled.client,'resolved_no_send');assert.equal(settled.professional,'sent');
orchestrationEnv.calls=[];
const duplicate=await lifecycle.deliverInvoicePaymentReceiptNotifications(db,orchestrationEnv,{context:terminalContext});
assert.equal(duplicate.client,'resolved_no_send');assert.equal(duplicate.professional,'already_sent');assert.deepEqual(orchestrationEnv.calls,[]);
console.log('PASS receipt resolution permissions/reason/scope, atomic audit rollback, immutable request, concurrent reviewer conflict, stale-worker fence and terminal webhook orchestration; no sends from resolution.');

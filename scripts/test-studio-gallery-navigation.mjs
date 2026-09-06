import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir='.wrangler/admin-refinement/studio-sweep';mkdirSync(dir,{recursive:true});
const {outputFiles}=await build({stdin:{contents:"export * from './src/admin/navigation/adminModules'; export {studioGalleryDestinations} from './src/admin/pages/StudioGalleries'; export {applyMomentChanges} from './src/admin/pages/Moments'; export {websiteGalleriesEnabled,withWebsiteGalleries,websiteEmbedCode} from './src/admin/pages/Dashboard';",loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',packages:'external',jsx:'automatic',define:{'import.meta.env':'{}'}});
writeFileSync(dir+'/navigation-bundle.mjs',outputFiles[0].text);
const api=await import('../'+dir+'/navigation-bundle.mjs');
const studio=api.resolveAdminModule('/admin/gallery');
const enabled=new Set(['content-tools']);
const visible=api.visibleModuleItems(studio,['content:read','content:write'],enabled);
assert.equal(visible.filter(x=>x.key==='galleries').length,1);
for(const key of ['venues','moments','locations','collections'])assert.ok(!visible.some(x=>x.key===key),key+' must live inside Galleries');
assert.deepEqual(api.visibleModuleItems(studio,[],new Set()),[],'Studio requires its existing entitlement');
const paths=[...api.studioGalleryDestinations.map(x=>x.to),'/admin/gallery/settings','/admin/creative-flash','/admin/gallery/locations','/admin/venues/example/gallery','/admin/venues/example/content','/admin/moments/example/gallery','/admin/custom-collections/example/gallery'];
assert.equal(new Set(api.studioGalleryDestinations.map(x=>x.to)).size,4);
for(const path of paths){
 assert.equal(api.resolveAdminModule(path).key,'website',path);
 assert.equal(api.resolveAdminNavigationItem(studio,path,'',[],enabled)?.key,'galleries',path);
}
assert.equal(api.resolveAdminModule('/admin/weddings/example/workspace').key,'crm');
assert.deepEqual(api.requiredEntitlementsForAdminPath('/admin/weddings/example/workspace'),['bookings']);
assert.equal(api.resolveAdminModule('/admin/client-galleries/example').key,'client-galleries');
const rows=[{id:'third',sortOrder:3,description:''},{id:'first',sortOrder:1,description:''},{id:'second',sortOrder:2,description:''}];
const edited=api.applyMomentChanges(rows,list=>list.map(row=>row.id==='second'?{...row,description:'Edited'}:row));
assert.deepEqual(edited.map(x=>x.id),['first','second','third'],'ordinary edits preserve displayed order');
assert.equal(edited[1].description,'Edited');
assert.deepEqual(rows.map(x=>x.id),['third','first','second'],'input rows are not mutated');
const reordered=api.applyMomentChanges(rows,list=>[list[2],list[0],list[1]]);
assert.deepEqual(reordered.map(x=>[x.id,x.sortOrder]),[['third',1],['first',2],['second',3]]);
for(let mask=0;mask<8;mask++){
 const settings={websiteConnectionGalleries:Boolean(mask&1),websiteConnectionVenues:Boolean(mask&2),websiteConnectionMoments:Boolean(mask&4),websiteConnectionStories:true,publicHostname:'portfolio.example',websiteUrl:'',websiteConnectionDomain:'https://client.example'};
 const original={...settings};
 assert.equal(api.websiteGalleriesEnabled(settings),mask!==0,'retain every legacy choice that enabled the gallery link');
 for(const enabled of [false,true]){
  const updated=api.withWebsiteGalleries(settings,enabled);
  assert.equal(api.websiteGalleriesEnabled(updated),enabled);
  assert.equal(updated.websiteConnectionStories,true,'gallery switch preserves stories');
  assert.equal(updated.websiteConnectionDomain,settings.websiteConnectionDomain);
  const markup=api.websiteEmbedCode({name:'Example',slug:'example',settings:updated,domains:[]});
  assert.equal((markup.match(/href="https:\/\/portfolio.example\/galleries"/g)||[]).length,enabled?1:0);
  assert.ok(markup.includes('/blog'),'stories remain independently connected');
  assert.ok(markup.includes(`data-wedplanned-content="${enabled?'galleries,':''}stories"`));
 }
 assert.deepEqual(settings,original,'combining switches does not mutate loaded settings');
}
console.log('PASS: Gallery hub and nested navigation, Studio entitlement, CRM/Store boundaries, stable moment ordering, and consolidated Website gallery settings.');

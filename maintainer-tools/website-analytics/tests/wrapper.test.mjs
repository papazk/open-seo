import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {wrap} from '../wrapper.mjs';
import {overlay,scriptPath} from '../overlay.mjs';
import generated from '../consent-source.mjs';
import {JSDOM} from 'jsdom';
const env={SEO_ANALYTICS_ORIGIN:'https://poolbaustpolten.at',SEO_ANALYTICS_MEASUREMENT_ID:'G-ABC12345',SEO_ENQUIRY_SCRIPTS_JSON:JSON.stringify([{path:'/_astro/ContactForm.astro_astro_type_script_index_0_lang.B84NqIdn.js',sha256:'09bbcabeb3e0c3d134a08192d87fe914488d6e9e7be83701a1bd89a1fe01c792',adapter:'pool-v1'}])};
test('wrapper serves new consent script, transforms approved JS, and preserves business API responses',async()=>{
 const fixture=readFileSync(new URL('./fixtures/pool-contact.live.js',import.meta.url),'utf8');
 let calls=0;
 const base={label:'original',async fetch(req,_env,ctx){assert.equal(this.label,'original');assert.equal(ctx.marker,'fixture');calls++;const path=new URL(req.url).pathname;if(path.startsWith('/api/'))return Response.json({lead:{id:'synthetic'}},{status:201});if(path.startsWith('/_astro/'))return new Response(fixture,{headers:{'content-type':'text/javascript'}});return new Response('<html lang="de"><body><main></main></body></html>',{headers:{'content-type':'text/html'}});}};
 const worker=wrap(base),ctx={marker:'fixture'};
 const script=await worker.fetch(new Request(env.SEO_ANALYTICS_ORIGIN+scriptPath),env,ctx);assert.equal(await script.text(),generated);assert.equal(calls,0);
 const head=await worker.fetch(new Request(env.SEO_ANALYTICS_ORIGIN+scriptPath,{method:'HEAD'}),env,ctx);assert.equal(await head.text(),'');assert.equal(calls,0);
 const js=await worker.fetch(new Request(env.SEO_ANALYTICS_ORIGIN+'/_astro/ContactForm.astro_astro_type_script_index_0_lang.B84NqIdn.js'),env,ctx);assert.match(await js.text(),/seo:enquiry-persisted-v1/);
 const html=await worker.fetch(new Request(env.SEO_ANALYTICS_ORIGIN+'/kontakt/'),env,ctx);assert.ok((await html.text()).includes(scriptPath));
 const api=await worker.fetch(new Request(env.SEO_ANALYTICS_ORIGIN+'/api/enquiry',{method:'POST'}),env,ctx);assert.equal(api.status,201);assert.deepEqual(await api.json(),{lead:{id:'synthetic'}});assert.equal(calls,3);
});
test('generated deployable consent source exactly matches human-editable source',()=>{
 assert.equal(generated,readFileSync(new URL('../consent.js',import.meta.url),'utf8'));
});
for(const encoding of ['gzip','br'])test(`already instrumented HTML preserves the original ${encoding} response and readable body`,async()=>{
 const html='<html><body><script id="seo-analytics-loader"></script></body></html>';
 const headers={'content-type':'text/html','content-encoding':encoding,'content-length':'123','etag':'"original"','cache-control':'public, max-age=300'};
 const response=new Response(html,{headers});
 const result=await overlay(response,new Request(env.SEO_ANALYTICS_ORIGIN+'/kontakt/'),env);
 assert.equal(result,response,'already instrumented responses must be returned unchanged');
 assert.equal(response.bodyUsed,false,'inspection must not consume the original body');
 assert.deepEqual(Object.fromEntries(result.headers),headers);
 assert.equal(await result.text(),html);
});
test('rewritten HTML releases the unused original body while preserving the generated page',async()=>{
 const response=new Response('<html><body><main>Public content</main></body></html>',{headers:{'content-type':'text/html','content-encoding':'gzip','content-length':'123','etag':'"original"'}});
 const result=await overlay(response,new Request(env.SEO_ANALYTICS_ORIGIN+'/kontakt/'),env);
 assert.notEqual(result,response);
 assert.equal(response.bodyUsed,true,'the unused tee branch must be released before returning rewritten HTML');
 const html=await result.text();assert.match(html,/Public content/);assert.match(html,/seo-analytics-loader/);
 for(const name of ['content-encoding','content-length','etag'])assert.equal(result.headers.has(name),false);
});
test('HTML script references bypass the previously cached uninstrumented URL exactly once',async()=>{
 const path='/_astro/ContactForm.astro_astro_type_script_index_0_lang.B84NqIdn.js';
 const worker=wrap({fetch(){return new Response(`<html><body><script type="module" src="${path}"></script><script src='${env.SEO_ANALYTICS_ORIGIN+path}'></script><script src="${path}?unknown=1"></script><script src="https://other.example${path}"></script><script src="/_astro/CostCalculator.js"></script></body></html>`,{headers:{'content-type':'text/html'}});}});
 const result=await worker.fetch(new Request(env.SEO_ANALYTICS_ORIGIN+'/kontakt/'),env,{});
 const dom=new JSDOM(await result.text(),{url:env.SEO_ANALYTICS_ORIGIN+'/kontakt/'});try{
  const refs=[...dom.window.document.querySelectorAll('script[type=module],script:not([id])')].map(script=>script.src);
  assert.deepEqual(refs,[env.SEO_ANALYTICS_ORIGIN+path+'?seo_enquiry=v1',env.SEO_ANALYTICS_ORIGIN+path+'?seo_enquiry=v1',env.SEO_ANALYTICS_ORIGIN+path+'?unknown=1','https://other.example'+path,env.SEO_ANALYTICS_ORIGIN+'/_astro/CostCalculator.js']);
  const oldCachedURL=env.SEO_ANALYTICS_ORIGIN+path;assert.notEqual(refs[0],oldCachedURL);
 }finally{dom.window.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM,VirtualConsole} from 'jsdom';
import {transformEnquiryScript} from '../enquiry-script.mjs';
import {overlay} from '../overlay.mjs';
const original=readFileSync(new URL('./fixtures/pool-contact.live.js',import.meta.url),'utf8');
const batonOriginal=readFileSync(new URL('./fixtures/baton-project.live.js',import.meta.url),'utf8');
const batonPath='/_astro/ProjectForm.astro_astro_type_script_index_0_lang.BwHsqQ3e.js';
const batonEnv={SEO_ANALYTICS_ORIGIN:'https://mybatonrougehandyman.com',SEO_ANALYTICS_MEASUREMENT_ID:'G-ABC12345',SEO_ENQUIRY_SCRIPTS_JSON:JSON.stringify([{path:batonPath,sha256:'3f516cc31e3abbeb6c605a013e57b559a3eeac5486ba4539684557aaacdb8a8d',adapter:'baton-v1'}])};
const path='/_astro/ContactForm.astro_astro_type_script_index_0_lang.B84NqIdn.js';
const hash='09bbcabeb3e0c3d134a08192d87fe914488d6e9e7be83701a1bd89a1fe01c792';
const env={SEO_ANALYTICS_ORIGIN:'https://poolbaustpolten.at',SEO_ANALYTICS_MEASUREMENT_ID:'G-ABC12345',SEO_ENQUIRY_SCRIPTS_JSON:JSON.stringify([{path,sha256:hash,adapter:'pool-v1'}])};
const receipt='lead_12345678-1234-4123-8123-123456789abc';
const choiceKey='seo.analytics.choice.v1';
const scope='visits-enquiries-v1';
const accepted=()=>({choice:'accepted',expires:Date.now()+90000,scope});
const resp=(body=original,options={})=>new Response(body,{headers:{'content-type':'text/javascript','etag':'original','content-length':'4522','cache-control':'public,max-age=31536000'},...options});
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const form=`<form data-enquiry-form data-endpoint="/api/enquiry" data-origin="https://poolbaustpolten.at" data-route="/kontakt/" data-placement="contact"><div data-step-progress></div><div data-step-actions><button type="button" data-step-back>Back</button><button type="button" data-step-next>Next</button></div><fieldset data-form-step><input name="location" value="Synthetic city" required></fieldset><fieldset data-form-step><input name="project" value="Synthetic pool" required><textarea name="details" required>private message fixture</textarea></fieldset><fieldset data-form-step><input name="email" type="email" value="private@example.com" required><input name="consent" type="checkbox" checked required><input name="website"><div data-turnstile data-sitekey="fixture"></div><button type="submit">Send</button></fieldset><div data-form-review></div><p data-form-status></p><input name="estimate"><p data-estimate-note></p></form>`;
async function boot({variant='pool',choice=accepted(),status=201,body={lead:{id:receipt,siteId:'synthetic',source:'form',status:'new',createdAt:'2026-10-07T12:00:00Z'}},deferred=false,storageBlocked=false,session=null,networkError=false,scriptQuery=''}={}) {
 const runtimeEnv=variant==='baton'?batonEnv:env;
 const fixture=variant==='baton'?'<p data-step-label></p>'+form.replace('data-enquiry-form','data-project-form').replaceAll('data-form-step','data-step').replace('data-step-back','data-back').replace('data-step-next','data-next').replace('data-form-status','data-status').replace('data-form-review','data-summary').replace('name="project"','name="service"').replace('type="submit"','type="submit" data-submit'):form;
 const dom=new JSDOM(`<html lang="${variant==='baton'?'en':'de'}"><head></head><body>${fixture}<footer></footer><section id="seo-analytics-banner" hidden><p data-explanation></p><a data-privacy></a><button data-allow></button><button data-reject></button></section><button id="seo-analytics-settings"></button><script id="seo-analytics-loader" data-origin="${runtimeEnv.SEO_ANALYTICS_ORIGIN}" data-measurement-id="G-ABC12345"></script></body></html>`,{url:runtimeEnv.SEO_ANALYTICS_ORIGIN+'/kontakt/?email=private@example.com#private',referrer:'https://search.example/path?private=query',runScripts:'outside-only',virtualConsole:new VirtualConsole()});
 const w=dom.window;
 if(choice)w.localStorage.setItem(choiceKey,JSON.stringify(choice));
 if(session)w.sessionStorage.setItem('seo.analytics.enquiry.receipts.v1',session);
 if(storageBlocked)Object.defineProperty(w,'sessionStorage',{get(){throw Error('blocked');}});
 w.eval(readFileSync(new URL('../consent.js',import.meta.url),'utf8'));
 w.turnstile={render(_node,options){options.callback('fixture-token');return 'fixture-challenge';},reset(){}};
 w.AbortSignal.timeout=()=>new w.AbortController().signal;
 let resolve,requestCount=0;
 w.fetch=async(url,options)=>{
  assert.equal(url,'/api/enquiry');assert.equal(options.method,'POST');
  assert.equal(JSON.parse(options.body).consent,true);requestCount++;
  if(deferred)await new Promise(r=>{resolve=r;});
  if(networkError)throw new w.TypeError('Synthetic connection failure');
  return {ok:status>=200&&status<300,status,json:async()=>body};
 };
 const transformed=await transformEnquiryScript(resp(variant==='baton'?batonOriginal:original),new Request(runtimeEnv.SEO_ANALYTICS_ORIGIN+(variant==='baton'?batonPath:path)+scriptQuery),runtimeEnv);
 w.eval(await transformed.text());
 const f=w.document.querySelector('form');
 const submit=async()=>{w.document.querySelector(variant==='baton'?'[data-next]':'[data-step-next]').click();w.document.querySelector(variant==='baton'?'[data-next]':'[data-step-next]').click();f.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await tick();};
 const leadEvents=()=>Array.from(w.dataLayer||[],x=>Array.from(x)).filter(x=>x[0]==='event'&&x[1]==='generate_lead');
 return {w,dom,submit,leadEvents,release:()=>resolve(),requests:()=>requestCount,status:()=>f.querySelector(variant==='baton'?'[data-status]':'[data-form-status]').textContent};
}
test('live success handler counts a newly persisted enquiry exactly once and exposes no PII to Google',async()=>{
 const b=await boot();try{await b.submit();assert.match(b.status(),/Anfrage eingegangen/);assert.equal(b.requests(),1);assert.deepEqual(JSON.parse(JSON.stringify(b.leadEvents())),[['event','generate_lead',{send_to:'G-ABC12345'}]]);
  b.w.dispatchEvent(new b.w.CustomEvent('seo:enquiry-persisted-v1',{detail:{status:201,id:receipt}}));assert.equal(b.leadEvents().length,1);
  const telemetry=JSON.stringify(b.w.dataLayer);for(const value of [receipt,'private@example.com','private message fixture','?email=','#private'])assert.ok(!telemetry.includes(value),value);
 }finally{b.dom.window.close();}
});
test('replays, failed requests, bots rejected by backend and invalid receipts do not count',async()=>{
 for(const args of [{status:200},{status:403,body:{error:'Verification failed'}},{status:503,body:{error:'Unavailable'}},{status:201,body:{lead:{id:''}}},{status:201,body:{lead:{id:'private@example.com'}}},{status:201,body:{}}]){const b=await boot(args);try{await b.submit();assert.equal(b.leadEvents().length,0,JSON.stringify(args));}finally{b.dom.window.close();}}
});
test('pending response counts only after actual success acknowledgement',async()=>{
 const b=await boot({deferred:true});try{await b.submit();assert.equal(b.leadEvents().length,0);assert.match(b.status(),/gespeichert/);b.release();await tick();assert.equal(b.leadEvents().length,1);}finally{b.dom.window.close();}
});
test('withdrawn, expired and unavailable consent at delayed success suppress telemetry',async()=>{
 for(const mode of ['reject','expire','blocked']){const b=await boot({deferred:true});try{await b.submit();if(mode==='reject')b.w.document.querySelector('[data-reject]').click();if(mode==='expire')b.w.localStorage.setItem(choiceKey,JSON.stringify({...accepted(),expires:1}));if(mode==='blocked')Object.defineProperty(b.w,'localStorage',{get(){throw Error('blocked');}});b.release();await tick();assert.match(b.status(),/Anfrage eingegangen/);assert.equal(b.leadEvents().length,0,mode);}finally{b.dom.window.close();}}
});
test('no consent and acceptance after success never replay a past enquiry',async()=>{
 const b=await boot({choice:null});try{await b.submit();assert.equal(b.leadEvents().length,0);b.w.document.querySelector('[data-allow]').click();assert.equal(b.leadEvents().length,0);}finally{b.dom.window.close();}
});
test('new scope asks previous visit-only consent holders again and retains rejection',async()=>{
 const b=await boot({choice:{choice:'accepted',expires:Date.now()+90000}});try{assert.equal(b.w.document.querySelector('#seo-analytics-banner').hidden,false);assert.equal(b.w.dataLayer,undefined);await b.submit();assert.equal(b.leadEvents().length,0);b.w.document.querySelector('[data-allow]').click();assert.equal(JSON.parse(b.w.localStorage.getItem(choiceKey)).scope,scope);}finally{b.dom.window.close();}
 const rejected=await boot({choice:{choice:'rejected',expires:Date.now()+90000}});try{assert.equal(rejected.w.document.querySelector('#seo-analytics-banner').hidden,true);}finally{rejected.dom.window.close();}
});
test('session receipt deduplication survives reload and blocked/corrupt session storage fails closed',async()=>{
 for(const args of [{session:JSON.stringify([receipt])},{session:'invalid'},{session:JSON.stringify(['private@example.com'])},{storageBlocked:true}]){const b=await boot(args);try{await b.submit();assert.equal(b.leadEvents().length,0,JSON.stringify(args));}finally{b.dom.window.close();}}
});
test('source drift and every nonallowlisted response stays byte-for-byte unchanged',async()=>{
 const cases=[{body:original+'\n'},{request:new Request('https://preview.example'+path)},{request:new Request(env.SEO_ANALYTICS_ORIGIN+'/admin/form.js')},{request:new Request(env.SEO_ANALYTICS_ORIGIN+path+'?private=1')},{request:new Request(env.SEO_ANALYTICS_ORIGIN+path,{method:'POST'})},{options:{status:206,headers:{'content-type':'text/javascript'}}},{options:{headers:{'content-type':'text/html'}}},{options:{headers:{'content-type':'text/javascript','set-cookie':'private=1'}}},{env:{...env,SEO_ENQUIRY_SCRIPTS_JSON:'invalid'}},{env:{...env,SEO_ENQUIRY_SCRIPTS_JSON:'[]'}},{env:{...env,SEO_ENQUIRY_SCRIPTS_JSON:JSON.stringify([{path,sha256:hash,adapter:'unknown'}])}}];
 for(const item of cases){const content=item.body||original;const r=resp(content,item.options);const result=await transformEnquiryScript(r,item.request||new Request(env.SEO_ANALYTICS_ORIGIN+path),item.env||env);assert.equal(await result.text(),content);assert.equal(result.headers.get('etag'),r.headers.get('etag'));}
});
test('known script changes only by one insertion and strips stale entity/cache metadata',async()=>{
 const r=await transformEnquiryScript(resp(),new Request(env.SEO_ANALYTICS_ORIGIN+path),env);const changed=await r.text();assert.notEqual(changed,original);let start=0;while(changed[start]===original[start])start++;const insertionLength=changed.length-original.length;assert.ok(insertionLength>0);assert.equal(changed.slice(0,start)+changed.slice(start+insertionLength),original);assert.match(changed.slice(start,start+insertionLength),/window.dispatchEvent\(new CustomEvent/);assert.equal(r.headers.get('etag'),null);assert.equal(r.headers.get('content-length'),null);assert.equal(r.headers.get('cache-control'),'no-cache');
});
test('even hash-allowlisted drift with missing or duplicated source marker fails closed',async()=>{
 const marker='i.textContent=`Anfrage eingegangen. Referenz: ${g.lead.id}. Wir prüfen Ihr Projekt; ein Partner ist noch nicht zugesagt.`, ';
 const actualMarker=marker.trimEnd();
 for(const source of [original.replace(actualMarker,''),original+actualMarker]){
  const alteredEnv={...env,SEO_ENQUIRY_SCRIPTS_JSON:JSON.stringify([{path,adapter:'pool-v1',sha256:createHash('sha256').update(source).digest('hex')}])};
  const result=await transformEnquiryScript(resp(source),new Request(env.SEO_ANALYTICS_ORIGIN+path),alteredEnv);assert.equal(await result.text(),source);
 }
});
test('native success signal ignores unsupported status and invalid local receipt identifiers',async()=>{
 const b=await boot();try{for(const detail of [null,{status:200,id:receipt},{status:201,id:'private@example.com'},{status:201,id:''}])b.w.dispatchEvent(new b.w.CustomEvent('seo:enquiry-persisted-v1',{detail}));assert.equal(b.leadEvents().length,0);}finally{b.dom.window.close();}
});
test('private-path guard prevents enquiry overlay and privacy notice explains success measurement',async()=>{
 const html='<html lang="de"><body><main></main><footer></footer></body></html>';
 const r=await overlay(new Response(html,{headers:{'content-type':'text/html'}}),new Request(env.SEO_ANALYTICS_ORIGIN+'/datenschutz/'),env);assert.match(await r.text(),/erfolgreich gespeicherte Anfragen/);
 for(const p of ['/api/enquiry','/admin/','/account/','/appointments-team/','/dashboard/','/confirm-request/','/%61dmin/']){const r=await overlay(new Response(html,{headers:{'content-type':'text/html'}}),new Request(env.SEO_ANALYTICS_ORIGIN+p),env);assert.equal(await r.text(),html);}
});
test('Baton live handler counts only HTTP 201 and excludes replays, failures and malformed receipts',async()=>{
 for(const args of [{status:201,want:1},{status:200,want:0},{status:403,body:{error:'Verification failed'},want:0},{status:500,body:{error:'Unavailable'},want:0},{networkError:true,want:0},{status:201,body:{lead:{id:'private@example.com'}},want:0}]){
  const b=await boot({variant:'baton',...args});try{await b.submit();assert.equal(b.leadEvents().length,args.want,JSON.stringify(args));assert.equal(b.requests(),1);if(args.want)assert.match(b.status(),/Request received/);}finally{b.dom.window.close();}
 }
});
test('Baton pending receipt respects withdrawal and no later consent replays earlier success',async()=>{
 const pending=await boot({variant:'baton',deferred:true});try{await pending.submit();assert.equal(pending.leadEvents().length,0);pending.w.document.querySelector('[data-reject]').click();pending.release();await tick();assert.match(pending.status(),/Request received/);assert.equal(pending.leadEvents().length,0);}finally{pending.dom.window.close();}
 const late=await boot({variant:'baton',choice:null});try{await late.submit();late.w.document.querySelector('[data-allow]').click();assert.equal(late.leadEvents().length,0);}finally{late.dom.window.close();}
});
test('both actual handlers reject invalid forms before any backend request',async()=>{
 for(const variant of ['pool','baton']){const b=await boot({variant});try{b.w.document.querySelector('[name=email]').value='';await b.submit();assert.equal(b.requests(),0);assert.equal(b.leadEvents().length,0);}finally{b.dom.window.close();}}
});
test('pool network failures never count a success',async()=>{
 const b=await boot({networkError:true});try{await b.submit();assert.equal(b.requests(),1);assert.equal(b.leadEvents().length,0);assert.match(b.status(),/Verbindung unterbrochen/);}finally{b.dom.window.close();}
});
test('a persisted receipt remains deduplicated after a real subsequent page boot',async()=>{
 const first=await boot();let saved;try{await first.submit();assert.equal(first.leadEvents().length,1);saved=first.w.sessionStorage.getItem('seo.analytics.enquiry.receipts.v1');assert.deepEqual(JSON.parse(saved),[receipt]);first.w.sessionStorage.removeItem('seo.analytics.enquiry.receipts.v1');first.w.dispatchEvent(new first.w.CustomEvent('seo:enquiry-persisted-v1',{detail:{status:201,id:receipt}}));assert.equal(first.leadEvents().length,1);}finally{first.dom.window.close();}
 const next=await boot({session:saved});try{await next.submit();assert.equal(next.leadEvents().length,0);}finally{next.dom.window.close();}
});
test('blocked writes never allow telemetry for an unremembered choice or unrecorded receipt',async()=>{
 const b=await boot({choice:null});try{Object.defineProperty(b.w,'localStorage',{value:{getItem(){return null;},setItem(){throw Error('blocked');}}});b.w.document.querySelector('[data-allow]').click();assert.equal(b.w.dataLayer,undefined);assert.equal(b.w.document.querySelector('#seo-analytics-banner').hidden,false);}finally{b.dom.window.close();}
 const session=await boot();try{Object.defineProperty(session.w,'sessionStorage',{value:{getItem(){return null;},setItem(){throw Error('blocked');}}});await session.submit();assert.match(session.status(),/Anfrage eingegangen/);assert.equal(session.leadEvents().length,0);}finally{session.dom.window.close();}
});
test('exact versioned script requests execute both live handlers while unknown queries fail closed',async()=>{
 for(const variant of ['pool','baton']){const b=await boot({variant,scriptQuery:'?seo_enquiry=v1'});try{await b.submit();assert.equal(b.leadEvents().length,1);}finally{b.dom.window.close();}}
 for(const query of ['?seo_enquiry=v2','?seo_enquiry=v1&other=1','?other=1&seo_enquiry=v1','?seo_enquiry=v1&seo_enquiry=v1','?seo_enquiry=%76%31']){const r=resp();const changed=await transformEnquiryScript(r,new Request(env.SEO_ANALYTICS_ORIGIN+path+query),env);assert.strictEqual(changed,r,query);assert.equal(await changed.text(),original);}
});
for(const variant of ['pool','baton'])for(const failure of ['constructor','dispatch'])test(`${variant} keeps saved receipt and original reset when native signal ${failure} throws`,async()=>{
 const b=await boot({variant});try{
  let resets=0;const form=b.w.document.querySelector('form'),realReset=form.reset.bind(form);form.reset=()=>{resets++;realReset();};
  if(failure==='constructor')b.w.CustomEvent=function(){throw new b.w.TypeError('Synthetic signal construction failure');};
  else b.w.dispatchEvent=()=>{throw new b.w.TypeError('Synthetic signal dispatch failure');};
  await b.submit();assert.match(b.status(),variant==='pool'?/Anfrage eingegangen/:/Request received/);assert.ok(b.status().includes(receipt));assert.equal(resets,1);assert.equal(b.leadEvents().length,0);assert.equal(form.hasAttribute('aria-busy'),false);
 }finally{b.dom.window.close();}
});
test('conditional script requests preserve original response identity and bytes',async()=>{
 for(const header of ['if-none-match','if-modified-since','if-match','if-unmodified-since','if-range']){
  const r=resp();const changed=await transformEnquiryScript(r,new Request(env.SEO_ANALYTICS_ORIGIN+path,{headers:{[header]:'fixture'}}),env);assert.strictEqual(changed,r,header);assert.equal(await changed.text(),original);assert.equal(changed.headers.get('etag'),'original');
 }
});
test('private, no-store and no-transform script responses preserve restrictive cache policy',async()=>{
 for(const cacheControl of ['private','private, max-age=300','public, no-store','public, max-age=300, no-transform','No-Transform','private="Set-Cookie"']){
  const r=resp(original,{headers:{'content-type':'text/javascript','cache-control':cacheControl,'etag':'original'}});const changed=await transformEnquiryScript(r,new Request(env.SEO_ANALYTICS_ORIGIN+path),env);assert.strictEqual(changed,r,cacheControl);assert.equal(await changed.text(),original);assert.equal(changed.headers.get('cache-control'),cacheControl);assert.equal(changed.headers.get('etag'),'original');
 }
});

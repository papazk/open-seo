import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
const sourceFile=new URL('../consent.js',import.meta.url);
const key='seo.analytics.choice.v1';
function boot({choice=null,lang='en',origin='https://example.com',blocked=false}={}) {
 const dom=new JSDOM(`<html lang="${lang}"><head></head><body><footer></footer><section id="seo-analytics-banner" hidden><p data-explanation></p><a data-privacy href="/privacy/">Privacy</a><button data-allow></button><button data-reject></button></section><button id="seo-analytics-settings"></button><script id="seo-analytics-loader" data-measurement-id="G-ABC12345" data-origin="https://example.com"></script></body></html>`,{url:origin+'/guide/?email=private@example.com#secret',referrer:'https://search.example/path?secret=email',runScripts:'outside-only',virtualConsole:new VirtualConsole()});
 const w=dom.window;
 if(choice)w.localStorage.setItem(key,JSON.stringify(choice));
 if(blocked)Object.defineProperty(w,'localStorage',{get(){throw Error('unavailable');}});
 assert.ok(existsSync(sourceFile),'Missing consent implementation');
 w.eval(readFileSync(sourceFile,'utf8'));
 const scripts=()=>[...w.document.querySelectorAll('script[src*="googletagmanager"]')];
 const click=selector=>w.document.querySelector(selector).click();
 const events=()=>Array.from(w.dataLayer||[],a=>Array.from(a));
 return {w,dom,scripts,click,events,banner:w.document.querySelector('#seo-analytics-banner')};
}
test('undecided and rejected visitors make no Google request or queue',()=>{
 const b=boot();assert.equal(b.banner.hidden,false);assert.equal(b.scripts().length,0);assert.equal(b.events().length,0);
 b.click('[data-reject]');assert.equal(b.banner.hidden,true);assert.equal(b.scripts().length,0);
 b.click('#seo-analytics-settings');assert.equal(b.banner.hidden,false);b.dom.window.close();
 const saved=boot({choice:{choice:'rejected',expires:Date.now()+10000}});assert.equal(saved.scripts().length,0);assert.equal(saved.banner.hidden,true);saved.dom.window.close();
});
test('allow loads exactly once, redacts URL data, and denies advertising',()=>{
 const b=boot();b.click('[data-allow]');b.click('[data-allow]');assert.equal(b.scripts().length,1);
 const c=b.events().find(e=>e[0]==='config')[2];assert.equal(c.page_location,'https://example.com/guide/');assert.equal(c.page_referrer,'https://search.example/');assert.equal(c.allow_google_signals,false);
 assert.ok(!JSON.stringify(b.events()).includes('private@example.com'));assert.ok(!JSON.stringify(b.events()).includes('#secret'));
 const consent=b.events().find(e=>e[0]==='consent')[2];for(const k of ['ad_storage','ad_user_data','ad_personalization'])assert.equal(consent[k],'denied');
 assert.equal(b.events().filter(e=>e[0]==='event'&&e[1]==='page_view').length,1);b.dom.window.close();
});
test('withdrawal disables runtime, clears cookies, and saved rejection survives reload',()=>{
 const b=boot();b.click('[data-allow]');b.w.document.cookie='_ga=fixture;path=/';b.click('[data-reject]');assert.equal(b.w['ga-disable-G-ABC12345'],true);assert.ok(!b.w.document.cookie.includes('_ga='));
 const choice=JSON.parse(b.w.localStorage.getItem(key));assert.equal(choice.choice,'rejected');const after=boot({choice});assert.equal(after.scripts().length,0);b.dom.window.close();after.dom.window.close();
});
test('expired, corrupt and unavailable storage do not imply consent',()=>{
 for(const args of [{choice:{choice:'accepted',expires:1}},{choice:{choice:'invented',expires:Date.now()+10000}},{blocked:true}]){const b=boot(args);assert.equal(b.scripts().length,0);assert.equal(b.banner.hidden,false);b.dom.window.close();}
});
test('German labels and host restriction are applied',()=>{
 const b=boot({lang:'de-AT'});assert.equal(b.w.document.querySelector('[data-allow]').textContent,'Analyse erlauben');assert.equal(b.w.document.querySelector('[data-reject]').textContent,'Ablehnen');b.dom.window.close();
 const other=boot({origin:'https://preview.example',choice:{choice:'accepted',expires:Date.now()+10000}});assert.equal(other.scripts().length,0);other.dom.window.close();
});
test('cross-tab rejection immediately stops collection',()=>{
 const b=boot();b.click('[data-allow]');b.w.localStorage.removeItem(key);b.w.dispatchEvent(new b.w.StorageEvent('storage',{key}));assert.equal(b.w['ga-disable-G-ABC12345'],true);b.dom.window.close();
});
test('a restored page rechecks a same-tab rejection before collecting again',()=>{
 const b=boot();b.click('[data-allow]');b.w.localStorage.setItem(key,JSON.stringify({choice:'rejected',expires:Date.now()+10000}));b.w.dispatchEvent(new b.w.PageTransitionEvent('pageshow',{persisted:true}));assert.equal(b.w['ga-disable-G-ABC12345'],true);b.dom.window.close();
});

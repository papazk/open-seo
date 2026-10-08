import {eligible} from './overlay.mjs';

export const enquiryEventName = 'seo:enquiry-persisted-v1';
export const enquiryScriptQuery = '?seo_enquiry=v1';
const validId = '/^lead_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';
// These literal statements belong to inspected compiled versions, not DOM text detection.
export const enquiryAdapters = Object.freeze({
  'pool-v1': Object.freeze({
    marker: 'i.textContent=`Anfrage eingegangen. Referenz: ${g.lead.id}. Wir prüfen Ihr Projekt; ein Partner ist noch nicht zugesagt.`,',
    insertion: `(()=>{try{e.dataset.endpoint==="/api/enquiry"&&t.status===201&&${validId}.test(g.lead.id)&&window.dispatchEvent(new CustomEvent("${enquiryEventName}",{detail:{status:201,id:g.lead.id}}))}catch{}})(),`
  }),
  'baton-v1': Object.freeze({
    marker: 'n.textContent=`Request received. Reference: ${p.lead.id}. A provider or appointment is not guaranteed.`,',
    insertion: `(()=>{try{d==="/api/enquiry"&&t.status===201&&${validId}.test(p.lead.id)&&window.dispatchEvent(new CustomEvent("${enquiryEventName}",{detail:{status:201,id:p.lead.id}}))}catch{}})(),`
  })
});

function allowlistedEntries(env) {
  let entries;
  try { entries=JSON.parse(env.SEO_ENQUIRY_SCRIPTS_JSON||'[]'); } catch { return []; }
  if (!Array.isArray(entries)) return [];
  return entries.filter(entry=>entry && /^\/(?:_astro|assets)\/[A-Za-z0-9_.-]+\.js$/.test(entry.path||'') && /^[a-f0-9]{64}$/.test(entry.sha256||'') && Object.hasOwn(enquiryAdapters,entry.adapter||'') && entries.filter(item=>item && item.path===entry.path).length===1);
}

/** Rewrite only reviewed script src references; the controlled query uses a fresh browser cache key. */
export function versionEnquiryScriptReferences(html, request, env) {
  const origin=new URL(request.url).origin;
  const paths=new Set(allowlistedEntries(env).flatMap(entry=>[entry.path,origin+entry.path]));
  if (!paths.size || !eligible(request,env)) return html;
  return html.replace(/<script\b[^>]*>/gi,tag=>tag.replace(/(\s+src\s*=\s*)(["'])([^"']+)\2/i,(attribute,prefix,quote,source)=>paths.has(source)?prefix+quote+source+enquiryScriptQuery+quote:attribute));
}

/** Env SEO_ENQUIRY_SCRIPTS_JSON is [{path,sha256,adapter}]; unknown/drifted responses pass through unchanged. */
export async function transformEnquiryScript(response, request, env) {
  const url=new URL(request.url);
  const type=response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  const conditional=['if-none-match','if-modified-since','if-match','if-unmodified-since','if-range'].some(name=>request.headers.has(name));
  const restricted=/(?:^|,)\s*(?:private|no-store|no-transform)\b/i.test(response.headers.get('cache-control')||'');
  if (!eligible(request,env) || request.method!=='GET' || url.search && url.search!==enquiryScriptQuery || url.hash || conditional || restricted || response.status!==200 || !['text/javascript','application/javascript'].includes(type) || response.headers.has('set-cookie') || response.headers.has('content-range') || request.headers.has('range')) return response;
  const entry=allowlistedEntries(env).find(item=>item.path===url.pathname);
  if (!entry) return response;
  const adapter=enquiryAdapters[entry.adapter];
  let bytes,source;
  try {
    bytes=await response.clone().arrayBuffer();
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
    if (hash!==entry.sha256) return response;
    source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  } catch { return response; }
  const position=source.indexOf(adapter.marker);
  if (position<0 || source.indexOf(adapter.marker,position+adapter.marker.length)!==-1) return response;
  const boundary=position+adapter.marker.length;
  const changed=source.slice(0,boundary)+adapter.insertion+source.slice(boundary);
  const headers=new Headers(response.headers);
  for (const name of ['etag','content-length','content-encoding','last-modified','content-md5','digest']) headers.delete(name);
  headers.set('cache-control','no-cache');
  return new Response(changed,{status:response.status,statusText:response.statusText,headers});
}

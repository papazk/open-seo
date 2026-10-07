import {eligible,overlay,scriptPath,scriptResponse} from './overlay.mjs';
import {transformEnquiryScript} from './enquiry-script.mjs';
export function wrap(base) {
  return {...base, async fetch(request,env,ctx) {
    if (eligible(request,env) && new URL(request.url).pathname === scriptPath && ['GET','HEAD'].includes(request.method)) return scriptResponse(request);
    const response=await base.fetch.call(base,request,env,ctx);
    return overlay(await transformEnquiryScript(response,request,env),request,env);
  }};
}

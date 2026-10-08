import consentSource from './consent-source.mjs';
import {versionEnquiryScriptReferences} from './enquiry-script.mjs';
export const scriptPath = '/assets/seo-analytics-consent-enquiries-v1.js';
const originFor=env=>env.SEO_ANALYTICS_ORIGIN || env.PUBLIC_ORIGIN;
const measurementFor=env=>env.SEO_ANALYTICS_MEASUREMENT_ID || env.GA4_MEASUREMENT_ID;
export function eligible(request, env) {
  const url=new URL(request.url);
  let path;try{path=decodeURIComponent(url.pathname).toLowerCase();}catch{return false;}
  return /^G-[A-Z0-9]+$/.test(measurementFor(env) || '') && url.origin === originFor(env) && !/^\/(?:api|admin|account|appointments-team|dashboard|register|login|logout|reset-password|claim-access|confirm-request|approve)(?:\/|$)/.test(path);
}
const css = `#seo-analytics-banner{position:fixed!important;z-index:2147483000!important;bottom:16px;left:16px;width:min(420px,calc(100vw - 32px));max-height:45vh;overflow:auto;box-sizing:border-box;padding:18px;background:#fff;color:#172019;border:1px solid #626b63;border-radius:8px;box-shadow:0 5px 25px #0002;font:15px/1.5 system-ui,sans-serif;text-align:left}#seo-analytics-banner[hidden]{display:none!important}#seo-analytics-banner p{margin:0 0 8px;font:inherit;color:inherit}#seo-analytics-banner a{color:#174b31;text-decoration:underline}#seo-analytics-banner button,#seo-analytics-settings{min-height:44px;padding:9px 13px;border:1px solid #36483b;border-radius:4px;background:#fff;color:#172019;font:600 14px/1.4 system-ui,sans-serif;cursor:pointer}#seo-analytics-banner .seo-choices{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}#seo-analytics-banner button{flex:1;white-space:nowrap}#seo-analytics-banner button:focus-visible,#seo-analytics-settings:focus-visible{outline:3px solid #2169c1;outline-offset:3px}#seo-analytics-settings{margin:8px}#seo-analytics-privacy{font:inherit;text-align:left}#seo-analytics-privacy p{font:inherit}`;
export function scriptResponse(request) {
  return new Response(request.method === 'HEAD' ? null : consentSource, {headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'public, max-age=300','x-content-type-options':'nosniff'}});
}
export async function overlay(response, request, env) {
  if (!eligible(request,env) || !['GET','HEAD'].includes(request.method) || response.status !== 200 || !response.headers.get('content-type')?.includes('text/html') || request.method === 'HEAD' || response.headers.has('set-cookie')) return response;
  let html=await response.text();
  if (html.includes('id="seo-analytics-loader"')) return new Response(html,response);
  html=versionEnquiryScriptReferences(html,request,env);
  const de=/<html\b[^>]*\blang=["']de(?:[-"'])/i.test(html);
  const mk=/<html\b[^>]*\blang=["']mk(?:[-"'])/i.test(html);
  const privacy=de ? '/datenschutz/' : mk ? '/privatnost/' : new URL(request.url).pathname.startsWith('/en/') ? '/en/privacy/' : '/privacy/';
  const heading=de?'Optionale Besucheranalyse':mk?'Опционална аналитика':'Optional visitor analytics';
  const privacyLabel=de?'Datenschutz':mk?'Приватност':'Privacy policy';
  const notice=mk
    ? 'Google Analytics се вчитува само со ваша согласност, за мерење на посети, прегледи на страници и успешно зачувани барања. Технички податоци за врската, информации за прелистувачот и идентификатор од колаче се испраќаат до Google; можна е обработка надвор од ЕУ. Рекламните функции се исклучени. Нашиот код не испраќа содржина на формулари, идентификатори на барања, параметри на URL или фрагменти. Изборот важи 90 дена. Согласноста можете да ја повлечете преку „Поставки за аналитика“ во подножјето; аналитиката тогаш се исклучува и нејзините колачиња се бришат.'
    : de
    ? 'Google Analytics wird nur nach Ihrer Einwilligung geladen, um Besuche, Seitenaufrufe und erfolgreich gespeicherte Anfragen zu messen. Technische Verbindungsdaten, Browserinformationen und eine Cookie-Kennung gehen an Google; eine Verarbeitung außerhalb der EU ist möglich. Keine Werbefunktionen. Unser Code übermittelt keine Formularinhalte, Anfrage-Kennungen, URL-Abfragen oder Fragmente. Ihre Wahl gilt 90 Tage. Sie können sie über „Analyse-Einstellungen“ im Fußbereich widerrufen; die Analyse stoppt und ihre Cookies werden gelöscht.'
    : 'Google Analytics loads only with your consent to measure visits, page views and successfully saved enquiries. Technical connection data, browser information and a cookie identifier are sent to Google; processing outside the EU may occur. Advertising features are disabled. Our code excludes form contents, enquiry identifiers, URL query strings and fragments. Your choice lasts 90 days. You can withdraw consent at any time through Analytics settings in the footer; analytics then stops and its cookies are cleared.';
  const replacements=[
    [/We use no advertising or visitor-analytics trackers\./g,'We use no advertising trackers. Visitor analytics is optional and requires your consent.'],
    [/We use no advertising or analytics trackers\./g,'We use no advertising trackers. Visitor analytics is optional and requires your consent.'],
    [/This site does not use advertising cookies or visitor analytics\./g,'This site does not use advertising cookies. Visitor analytics is optional and requires your consent.'],
    [/(?:Diese Website verwendet|Wir verwenden|Die Website verwendet) keine Besucheranalyse oder Werbe-Tracker\./g,'Wir verwenden keine Werbe-Tracker. Die optionale Besucheranalyse wird nur nach Ihrer Einwilligung aktiviert.'],
    [/(?:Es gibt|Die Website verwendet) keine Werbe- oder Analyse-Tracker\./g,'Es gibt keine Werbe-Tracker. Die optionale Besucheranalyse wird nur nach Ihrer Einwilligung aktiviert.'],
    [/The website itself does not install analytics or advertising scripts\./g,'The website does not install advertising scripts. Visitor analytics is optional and requires your consent.'],
    [/Самата страница не поставува аналитички или рекламни скрипти\./g,'Страницата не поставува рекламни скрипти. Опционалната аналитика се вчитува само со ваша согласност.']
  ];
  for (const [pattern,text] of replacements) html=html.replace(pattern,text);
  if (/^\/(?:en\/)?(?:privacy|privacy-policy|datenschutz|privatnost)\/?$/.test(new URL(request.url).pathname)) {
    const block=`<section id="seo-analytics-privacy"><h2>${heading}</h2><p>${notice}</p><p><a href="https://policies.google.com/privacy" rel="noopener noreferrer">${de?'Datenschutz bei Google':mk?'Приватност кај Google':'Google privacy information'}</a></p></section>`;
    html=html.replace(/<\/main>/i,block+'</main>');
  }
  const settings=`<button type="button" id="seo-analytics-settings">${de?'Analyse-Einstellungen':mk?'Поставки за аналитика':'Analytics settings'}</button>`;
  if (/<\/footer>/i.test(html)) html=html.replace(/<\/footer>/i,settings+'</footer>');
  else html=html.replace(/<\/body>/i,'<footer>'+settings+'</footer></body>');
  const controls=`<style>${css}</style><section id="seo-analytics-banner" hidden><p data-explanation></p><a data-privacy href="${privacy}">${privacyLabel}</a><div class="seo-choices"><button type="button" data-allow></button><button type="button" data-reject></button></div></section><script defer id="seo-analytics-loader" data-measurement-id="${measurementFor(env)}" data-origin="${originFor(env)}" src="${scriptPath}"></script>`;
  html=html.replace(/<\/body>/i,controls+'</body>');
  const headers=new Headers(response.headers);
  for (const name of ['etag','content-length','content-encoding','last-modified'])headers.delete(name);
  if (!/(?:private|no-store)/i.test(headers.get('cache-control')||'')) headers.set('cache-control','no-cache');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

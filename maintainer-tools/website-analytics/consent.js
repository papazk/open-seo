/* Google is loaded only after the visitor allows analytics. */
(() => {
  const root = document.querySelector('#seo-analytics-loader');
  const id = root?.dataset.measurementId;
  if (!/^G-[A-Z0-9]+$/.test(id || '') || window.location.origin !== root.dataset.origin) return;
  if (window.seoAnalyticsConsentLoaded) return;
  window.seoAnalyticsConsentLoaded = true;
  const banner = document.querySelector('#seo-analytics-banner');
  const allow = banner.querySelector('[data-allow]');
  const reject = banner.querySelector('[data-reject]');
  const settings = document.querySelector('#seo-analytics-settings');
  const german = document.documentElement.lang.toLowerCase().startsWith('de');
  const macedonian = document.documentElement.lang.toLowerCase().startsWith('mk');
  const key = 'seo.analytics.choice.v1';
  const scope = 'visits-enquiries-v1';
  const lifetime = 90 * 86400000;
  let loaded = false;
  let accepted = false;
  let expiryTimer;
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(key) : null;
  if (channel) channel.onmessage = event => { if (event.data === 'rejected') withdraw(); };
  window[`ga-disable-${id}`] = true;
  banner.setAttribute('aria-label', german ? 'Optionale Besucheranalyse' : macedonian ? 'Опционална аналитика' : 'Optional analytics');
  banner.querySelector('[data-explanation]').textContent = macedonian
    ? 'Дали дозволувате Google Analytics за мерење на посетите и успешно зачуваните барања? Аналитиката е исклучена додека не дозволите. Без рекламирање. Изборот важи 90 дена и може да се промени во подножјето.'
    : german
    ? 'Google Analytics misst Besuche und erfolgreich gespeicherte Anfragen nur mit Ihrer Zustimmung. Keine Werbung. Ihre Wahl gilt 90 Tage und lässt sich unten ändern.'
    : 'May we use Google Analytics to measure visits and successfully saved enquiries? Analytics stays off until you allow it. No advertising. Your choice lasts 90 days and can be changed in the footer.';
  allow.textContent = german ? 'Analyse erlauben' : macedonian ? 'Дозволи аналитика' : 'Allow analytics';
  reject.textContent = german ? 'Ablehnen' : macedonian ? 'Одбиј' : 'Reject';
  settings.textContent = german ? 'Analyse-Einstellungen' : macedonian ? 'Поставки за аналитика' : 'Analytics settings';
  banner.querySelector('[data-privacy]').textContent = german ? 'Datenschutz' : macedonian ? 'Приватност' : 'Privacy policy';
  function readChoice() {
    if (/(?:^|;\s*)seo_analytics_rejected=1(?:;|$)/.test(document.cookie)) return {choice:'rejected',expires:Date.now()+lifetime};
    try {
      const choice = JSON.parse(localStorage.getItem(key) || 'null');
      return choice && Number.isFinite(choice.expires) && choice.expires > Date.now() && (choice.choice === 'rejected' || choice.choice === 'accepted' && choice.scope === scope) ? choice : null;
    } catch { return null; }
  }
  function save(choice) {
    const value = {choice, expires: Date.now() + lifetime, scope};
    if (choice === 'accepted') document.cookie = 'seo_analytics_rejected=; Max-Age=0; Path=/; SameSite=Lax; Secure';
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {
      // A failed write must not restore an old acceptance after withdrawal.
      if (choice === 'rejected') document.cookie = `seo_analytics_rejected=1; Max-Age=${lifetime/1000}; Path=/; SameSite=Lax; Secure`;
    }
    return value;
  }
  function clearCookies() {
    for (const item of document.cookie.split(';')) {
      const name = item.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) continue;
      const parts=window.location.hostname.split('.');
      const domains=[''];
      for(let index=0;index<parts.length-1;index++){domains.push(parts.slice(index).join('.'),'.'+parts.slice(index).join('.'));}
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure${domain ? '; Domain=' + domain : ''}`;
      }
    }
  }
  function withdraw() {
    accepted = false;
    clearTimeout(expiryTimer);
    window[`ga-disable-${id}`] = true;
    clearCookies();
    // Remove Google's runtime and its automatic listeners after withdrawal.
    if (loaded) window.location.reload();
  }
  function start(choice) {
    if (loaded) return;
    accepted = true;
    loaded = true;
    window[`ga-disable-${id}`] = false;
    const expire = () => {
      const remaining = choice.expires - Date.now();
      if (remaining <= 0) { withdraw(); banner.hidden = false; }
      else expiryTimer = setTimeout(expire, Math.min(remaining, 2147483647));
    };
    expire();
    window.dataLayer = window.dataLayer || [];
    const gtag = function () { if (accepted) window.dataLayer.push(arguments); };
    window.gtag = gtag;
    let referrer = '';
    try { const url = new URL(document.referrer); if (/^https?:$/.test(url.protocol)) referrer = url.origin + '/'; } catch { /* Direct visit. */ }
    const fields = {page_location: window.location.origin + window.location.pathname, page_title: window.location.hostname, page_referrer: referrer};
    gtag('consent', 'default', {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
    gtag('set', {...fields, ads_data_redaction: true, url_passthrough: false, allow_google_signals: false, allow_ad_personalization_signals: false});
    gtag('js', new Date());
    gtag('config', id, {...fields, send_page_view: false, allow_user_provided_data: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: lifetime / 1000, cookie_update: false, cookie_flags: 'SameSite=Lax;Secure'});
    gtag('event', 'page_view', {...fields, send_to: id});
    const script = document.createElement('script');
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.append(script);
  }
  // This receipt is local deduplication data. It never enters Google's queue.
  const receiptKey = 'seo.analytics.enquiry.receipts.v1';
  const seenReceipts = new Set();
  const validReceipt = id => typeof id === 'string' && /^lead_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  window.addEventListener('seo:enquiry-persisted-v1', event => {
    if (!accepted || window[`ga-disable-${id}`] || readChoice()?.choice !== 'accepted' || event.detail?.status !== 201 || !validReceipt(event.detail?.id) || typeof window.gtag !== 'function') return;
    const receipt = event.detail.id;
    if (seenReceipts.has(receipt)) return;
    try {
      const stored = JSON.parse(sessionStorage.getItem(receiptKey) || '[]');
      if (!Array.isArray(stored) || stored.some(value => !validReceipt(value)) || stored.includes(receipt) || stored.length >= 500) return;
      const next = JSON.stringify([...stored, receipt]);
      sessionStorage.setItem(receiptKey, next);
      if (sessionStorage.getItem(receiptKey) !== next) return;
    } catch { return; }
    seenReceipts.add(receipt);
    // No queue or replay: consent is rechecked at the acknowledged-success event.
    window.gtag('event', 'generate_lead', {send_to: id});
  });
  allow.addEventListener('click', () => { banner.hidden = true; if (!accepted) { save('accepted'); const saved=readChoice(); if (saved?.choice === 'accepted') start(saved); else banner.hidden=false; } });
  reject.addEventListener('click', () => { save('rejected'); channel?.postMessage('rejected'); banner.hidden = true; withdraw(); });
  settings.addEventListener('click', () => { banner.hidden = false; reject.focus(); });
  window.addEventListener('storage', event => { if ((event.key === key || event.key === null) && readChoice()?.choice !== 'accepted') withdraw(); });
  const checkResumedChoice = () => { if (loaded && readChoice()?.choice !== 'accepted') withdraw(); };
  window.addEventListener('pageshow', checkResumedChoice);
  window.addEventListener('focus', checkResumedChoice);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkResumedChoice(); });
  const choice = readChoice();
  banner.hidden = choice !== null;
  if (choice?.choice === 'accepted') start(choice);
  else clearCookies();
})();

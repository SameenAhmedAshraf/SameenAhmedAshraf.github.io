// ParkFill — Parking Registration Auto-Fill  (v13)
// ──────────────────────────────────────────────────
// Install / update in Scriptable:
//   1. Open Scriptable → open the ParkFill script (or tap + and rename it ParkFill)
//   2. Select All → Delete
//   3. In Safari open: sameenahmedashraf.github.io/parking/parkfill.js
//   4. Select All → Copy → back to Scriptable → Paste → tap Done

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function jsonLit(d) {
  return JSON.stringify(d).replace(/</g, '\\u003C').replace(/>/g, '\\u003E');
}

// Helper library injected into the page on every call (self-contained so it
// survives full-page navigations between register2park steps).
const HELPERS = `
  function vis(el){ return !!(el && el.offsetParent !== null); }

  // Native value setter — bypasses React's value tracker so onChange fires.
  // Works for plain HTML forms too. Returns true only if the value stuck.
  function setVal(el, v){
    if(!el) return false;
    var s = String(v == null ? '' : v);
    try {
      var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      el.focus();
      setter.call(el, '');  el.dispatchEvent(new Event('input', {bubbles:true}));
      setter.call(el, s);   el.dispatchEvent(new Event('input', {bubbles:true}));
    } catch(e) {
      try { el.value = s; el.dispatchEvent(new Event('input', {bubbles:true})); } catch(_) {}
    }
    el.dispatchEvent(new Event('change', {bubbles:true}));
    el.dispatchEvent(new Event('blur',   {bubbles:true}));
    return el.value === s;
  }

  function setSelect(el, v){
    var x = String(v).toLowerCase();
    var m = Array.from(el.options).find(function(o){
      var a = (o.value||'').toLowerCase(), b = (o.text||'').toLowerCase();
      return a === x || b === x || b.indexOf(x) === 0;
    });
    if(m){ el.value = m.value; el.dispatchEvent(new Event('change',{bubbles:true})); el.dispatchEvent(new Event('blur',{bubbles:true})); return true; }
    return false;
  }

  function fields(){
    return Array.from(document.querySelectorAll('input,textarea,select')).filter(function(el){
      if(!vis(el)) return false;
      var t = (el.getAttribute('type')||'').toLowerCase();
      return ['hidden','button','submit','checkbox','radio','image','file','reset'].indexOf(t) < 0;
    });
  }

  // Build a context string for an input from its own attributes, its label,
  // and nearby preceding text (handles div-wrapped and table layouts).
  function ctx(el){
    var parts = [el.name, el.id, el.placeholder, el.getAttribute('aria-label')];
    try {
      if(el.id){
        var sel = (window.CSS && CSS.escape) ? CSS.escape(el.id) : el.id;
        var l = document.querySelector('label[for="' + sel + '"]');
        if(l) parts.push(l.textContent);
      }
    } catch(e) {}
    var w = el.closest && el.closest('label'); if(w) parts.push(w.textContent);
    var node = el;
    for(var hop = 0; hop < 2 && node; hop++){
      var sib = node.previousElementSibling, c = 0;
      while(sib && c < 2){ parts.push(sib.textContent); sib = sib.previousElementSibling; c++; }
      node = node.parentElement;
    }
    return parts.filter(Boolean).join(' ').replace(/\\s+/g, ' ').toLowerCase();
  }

  function fillVehicle(D){
    var ins = fields(), used = [], hit = 0;
    function take(re, v, all){
      var got = 0;
      for(var i = 0; i < ins.length; i++){
        var el = ins[i];
        if(!all && used.indexOf(el) >= 0) continue;
        if(re.test(ctx(el))){
          var ok = el.tagName === 'SELECT' ? setSelect(el, v) : setVal(el, v);
          if(ok){ used.push(el); got++; if(!all) break; }
        }
      }
      return got;
    }
    if(D.apt)   hit += take(/apart|\\bapt\\b|\\bunit\\b|suite/, D.apt, false) ? 1 : 0;
    if(D.make)  hit += take(/\\bmake\\b|manufacturer/, D.make, false) ? 1 : 0;
    if(D.model) hit += take(/\\bmodel\\b/, D.model, false) ? 1 : 0;
    if(D.year)  hit += take(/\\byear\\b/, D.year, false) ? 1 : 0;
    if(D.color) hit += take(/colou?r/, D.color, false) ? 1 : 0;
    if(D.plate) hit += take(/plate|licen/, D.plate, true) ? 1 : 0;   // plate + confirm plate
    if(D.state) take(/\\bstate\\b|province/, D.state, false);
    if(D.code)  take(/\\bcode\\b/, D.code, false);
    return hit;
  }

  function clickText(reSrc){
    var re = new RegExp(reSrc, 'i');
    var btns = Array.from(document.querySelectorAll(
      'button,[role="button"],a,input[type="button"],input[type="submit"],input[type="image"]'
    )).filter(vis);
    var b = btns.find(function(el){
      var t = (el.textContent || el.value || el.getAttribute('aria-label') || el.title || '').replace(/\\s+/g,' ').trim();
      return re.test(t);
    });
    if(b){
      try { b.click(); } catch(e) {}
      try { b.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})); } catch(e) {}
      return true;
    }
    return false;
  }

  function submitForm(){
    var f = document.querySelector('form'), btn = null;
    if(f){
      btn = f.querySelector('button[type="submit"],input[type="submit"]');
      if(!btn){ var bs = Array.from(f.querySelectorAll('button')).filter(vis); if(bs.length) btn = bs[bs.length-1]; }
    }
    if(btn){
      try { btn.click(); } catch(e) {}
      try { btn.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})); } catch(e) {}
      return true;
    }
    return false;
  }

  function emailInput(){
    return fields().find(function(el){
      var t = (el.getAttribute('type')||'').toLowerCase();
      return t === 'email' || /e.?mail/.test(ctx(el));
    });
  }

  function fieldList(){
    return fields().map(function(el){
      return (el.name || el.id || el.placeholder || el.getAttribute('aria-label') || ctx(el) || el.tagName).slice(0,30);
    }).filter(Boolean).slice(0,15);
  }
`;

function step(d, body) {
  return '(function(){var D=' + jsonLit(d) + ';' + HELPERS + ';' + body + '})();';
}

async function main() {
  const raw = Pasteboard.paste();
  let d;
  try {
    d = JSON.parse(raw);
    if (!d.url) throw new Error();
  } catch (e) {
    const a = new Alert();
    a.title = "ParkFill";
    a.message = "Open the Park Register app, pick a complex and car, then tap Auto-Fill to load the data.";
    a.addAction("OK");
    await a.present();
    return;
  }

  const wv = new WebView();
  await wv.loadURL(d.url);

  // Present the WebView so its JS context is active, then drive each step
  // from here (awaited) instead of with in-page timers that get wiped on
  // navigation. Don't await present() yet — keep running underneath it.
  const closed = wv.present(false);
  await sleep(1200);

  // Step 1 — landing page: click "Visitor Parking" if present
  try {
    if (await wv.evaluateJavaScript(step(d, "return clickText('visitor.?parking');"))) {
      await sleep(1900);
    }
  } catch (e) {}

  // Step 2 — fill the vehicle form, retrying while React/the page mounts
  let hit = 0;
  for (let i = 0; i < 8; i++) {
    try { hit = (await wv.evaluateJavaScript(step(d, "return fillVehicle(D);"))) || 0; } catch (e) { hit = 0; }
    if (hit > 0) break;
    await sleep(700);
  }

  if (hit === 0) {
    let list = [];
    try { list = (await wv.evaluateJavaScript(step(d, "return fieldList();"))) || []; } catch (e) {}
    const a = new Alert();
    a.title = "ParkFill v13 — Couldn't Match Fields";
    a.message = "The form is open but its fields didn't match.\n\nFields found:\n" +
      (list.length ? list.join("\n") : "(none — page may not be the form yet)") +
      "\n\nYou can fill it in manually.";
    a.addAction("OK");
    await a.present();
    await closed;
    return;
  }

  // Step 3 — submit the vehicle form (the red "Next" button)
  await sleep(500);
  try {
    const clickedNext = await wv.evaluateJavaScript(step(d, "return clickText('^\\\\s*next\\\\s*$');"));
    if (!clickedNext) await wv.evaluateJavaScript(step(d, "return submitForm();"));
  } catch (e) {}
  await sleep(1700);

  // Step 4 — click the blue "E-Mail Confirmation" button (best effort)
  try {
    await wv.evaluateJavaScript(step(d, "return clickText('e.?mail.*confirm|confirm.*e.?mail|e.?mail');"));
  } catch (e) {}
  await sleep(1100);

  // Step 5 — fill the email in the dialog, then click the green "Send"
  if (d.email) {
    let mailed = false;
    for (let i = 0; i < 6; i++) {
      try { mailed = await wv.evaluateJavaScript(step(d, "var e=emailInput(); return (e && D.email) ? setVal(e, D.email) : false;")); } catch (e) {}
      if (mailed) break;
      await sleep(500);
    }
    if (mailed) {
      await sleep(400);
      try { await wv.evaluateJavaScript(step(d, "return clickText('^\\\\s*send\\\\s*$');")); } catch (e) {}
    }
  }

  // Keep the WebView open so you can verify / tap through anything remaining.
  await closed;
}

main();

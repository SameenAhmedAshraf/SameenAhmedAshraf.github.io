// ParkFill — Parking Registration Auto-Fill
// ─────────────────────────────────────────
// Install in Scriptable:
//   1. Open Scriptable → tap + (new script)
//   2. Tap the script name at top, rename it exactly: ParkFill
//   3. Delete the placeholder code
//   4. Open Safari → go to sameenahmedashraf.github.io/parking/parkfill.js
//   5. Select All → Copy → switch back to Scriptable → Paste → tap Done

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

  // Present the WebView immediately so it is on-screen.
  // execCommand('insertText') requires an active editing context,
  // which only exists when the WebView is visible.
  const closed = wv.present(false); // do NOT await yet — script keeps running

  // Give the page time to render inside the visible WebView
  await sleep(1500);

  // Click "Visitor Parking" if the page has one (landing page flow)
  const clicked = await wv.evaluateJavaScript(`
    (function() {
      var all = Array.from(document.querySelectorAll(
        'button,[role="button"],a,input[type="button"],input[type="submit"]'
      ));
      var btn = all.find(function(el) {
        var txt = (el.textContent || el.value || el.getAttribute('aria-label') || '')
                    .replace(/\\s+/g,' ').trim();
        return /visitor.?parking/i.test(txt);
      });
      if (btn) { btn.click(); return true; }
      return false;
    })()
  `);

  // If we navigated to a new page, wait for it to render
  if (clicked) await sleep(2000);

  // Try to fill, retrying a few times in case React is still mounting
  let hit = 0;
  for (let i = 0; i < 8; i++) {
    hit = await wv.evaluateJavaScript(fillScript(d));
    if (hit > 0) break;
    await sleep(600);
  }

  // If still nothing, show what fields were detected to help debug
  if (hit === 0) {
    const found = await wv.evaluateJavaScript(`
      (function() {
        var els = Array.from(document.querySelectorAll('input,select,textarea'));
        return els.map(function(el) {
          return el.name || el.id || el.placeholder || el.getAttribute('aria-label') || el.type || '?';
        }).filter(Boolean).slice(0, 20).join(', ');
      })()
    `);
    const a = new Alert();
    a.title = "ParkFill — Nothing Filled";
    a.message = "Fields detected: " + (found || "none") + "\n\nURL: " + d.url;
    a.addAction("OK");
    await a.present();
  }

  // Wait for the user to close the WebView
  await closed;
}

function fillScript(d) {
  const safe = JSON.stringify(d)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E');

  return `(function() {
  var d = ${safe};

  function nv(el, v) {
    if (!el || v === undefined || v === null) return false;
    var s = String(v);
    if (!s) return false;
    el.focus();
    el.select();
    // execCommand goes through WebKit's native text pipeline — React hooks into this
    var did = false;
    try {
      did = document.execCommand('selectAll', false, null) &&
            document.execCommand('insertText', false, s);
    } catch(e) {}
    if (!did) {
      var desc;
      try {
        desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
             || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      } catch(e) {}
      if (desc && desc.set) desc.set.call(el, '');
      el.value = '';
      el.dispatchEvent(new Event('input', {bubbles:true}));
      if (desc && desc.set) desc.set.call(el, s);
      el.value = s;
      try {
        el.dispatchEvent(new InputEvent('input', {bubbles:true, cancelable:true, inputType:'insertText', data:s}));
      } catch(e) { el.dispatchEvent(new Event('input', {bubbles:true})); }
    }
    el.dispatchEvent(new Event('change', {bubbles:true}));
    el.dispatchEvent(new Event('blur', {bubbles:true}));
    return true;
  }

  function ns(el, v) {
    if (!el || !v) return false;
    var m = Array.from(el.options).find(function(o){
      return o.value.toLowerCase() === v.toLowerCase()
          || o.text.toLowerCase()  === v.toLowerCase()
          || o.text.toLowerCase().startsWith(v.toLowerCase());
    });
    if (m) el.value = m.value;
    el.dispatchEvent(new Event('change', {bubbles:true}));
    el.dispatchEvent(new Event('blur', {bubbles:true}));
    return !!m;
  }

  function q(sels, val, isSel) {
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el) return isSel ? ns(el, val) : nv(el, val);
    }
    return false;
  }

  function labelEl(lbl) {
    if (lbl.control) return lbl.control;
    if (lbl.htmlFor) return document.getElementById(lbl.htmlFor);
    var inner = lbl.querySelector('input,select,textarea');
    if (inner) return inner;
    var sib = lbl.nextElementSibling;
    if (sib) {
      if (/INPUT|SELECT|TEXTAREA/.test(sib.tagName)) return sib;
      var si = sib.querySelector('input,select,textarea');
      if (si) return si;
    }
    return lbl.parentElement && lbl.parentElement.querySelector('input,select,textarea');
  }

  var hit = 0;

  if (d.apt) hit += q([
    'input[name="unit"]','input[name="unit_number"]','input[name="apartment"]',
    'input[name="apt"]','input[name="unitNumber"]','input[name="apartment_number"]',
    'input[id*="unit" i]','input[id*="apt" i]','input[id*="apartment" i]',
    'input[placeholder*="unit" i]','input[placeholder*="apt" i]',
    'input[placeholder*="apartment" i]','[aria-label*="unit" i]','[aria-label*="apt" i]'
  ], d.apt) ? 1 : 0;

  if (d.make)  hit += q(['input[name="make"]','input[name="vehicle_make"]','input[id*="make" i]','input[placeholder*="make" i]','[aria-label*="make" i]'], d.make) ? 1 : 0;
  if (d.model) hit += q(['input[name="model"]','input[name="vehicle_model"]','input[id*="model" i]','input[placeholder*="model" i]','[aria-label*="model" i]'], d.model) ? 1 : 0;
  if (d.year)  hit += q(['input[name="year"]','input[name="vehicle_year"]','input[id*="year" i]','input[placeholder*="year" i]','[aria-label*="year" i]'], d.year) ? 1 : 0;
  if (d.color) hit += q(['input[name="color"]','input[name="vehicle_color"]','input[id*="color" i]','input[placeholder*="color" i]','[aria-label*="color" i]'], d.color) ? 1 : 0;

  if (d.plate) {
    hit += q([
      'input[name="plate"]','input[name="license_plate"]','input[name="license"]',
      'input[name="licensePlate"]','input[id*="plate" i]','input[id*="license" i]',
      'input[placeholder*="plate" i]','input[placeholder*="license" i]','[aria-label*="plate" i]'
    ], d.plate) ? 1 : 0;
    q([
      'input[name="confirm_plate"]','input[name="confirm_license_plate"]',
      'input[name="confirmPlate"]','input[id*="confirm" i][id*="plate" i]',
      'input[placeholder*="confirm" i]'
    ], d.plate);
  }

  if (d.state) {
    q(['select[name*="state" i]','select[id*="state" i]','select[aria-label*="state" i]'], d.state, true);
    q(['input[name*="state" i]','input[id*="state" i]'], d.state);
  }

  if (d.code) q(['input[name*="property_code" i]','input[name*="code" i]','input[id*="code" i]'], d.code);

  // Label-text fallback
  document.querySelectorAll('label').forEach(function(lbl) {
    var t = lbl.textContent.toLowerCase().trim(), el = labelEl(lbl);
    if (!el) return;
    var tag = el.tagName;
    if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return;
    if      (/unit|apt|apartment|suite/.test(t) && d.apt)             { if (nv(el, d.apt))   hit++; }
    else if (/\bmake\b/.test(t) && d.make)                             { if (nv(el, d.make))  hit++; }
    else if (/\bmodel\b/.test(t) && d.model)                           { if (nv(el, d.model)) hit++; }
    else if (/\byear\b/.test(t) && d.year)                             { if (nv(el, d.year))  hit++; }
    else if (/colou?r/.test(t) && d.color)                             { if (nv(el, d.color)) hit++; }
    else if (/plate|licen/.test(t) && d.plate)                         { if (nv(el, d.plate)) hit++; }
    else if (/state|province/.test(t) && tag === 'SELECT' && d.state)  ns(el, d.state);
  });

  return hit;
})()`;
}

main();

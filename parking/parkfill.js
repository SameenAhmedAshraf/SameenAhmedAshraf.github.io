// ParkFill — Parking Registration Auto-Fill
// ─────────────────────────────────────────
// Install in Scriptable:
//   1. Open Scriptable → tap + (new script)
//   2. Tap the script name at top, rename it exactly: ParkFill
//   3. Delete the placeholder code
//   4. Open Safari → go to sameenahmedashraf.github.io/parking/parkfill.js
//   5. Select All → Copy → switch back to Scriptable → Paste → tap Done

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
  await wv.evaluateJavaScript(fillScript(d));
  await wv.present(false);
}

function fillScript(d) {
  // Serialize data into the script so it's available inside the page context
  const safe = JSON.stringify(d)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E');

  return `(function go(tries) {
  var d = ${safe};

  function nv(el, v) {
    if (!el) return false;
    try {
      var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
               || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (desc && desc.set) desc.set.call(el, v);
    } catch(e) {}
    el.value = v;
    ['input','change','blur'].forEach(function(t){
      el.dispatchEvent(new Event(t, {bubbles:true}));
    });
    return true;
  }

  function ns(el, v) {
    if (!el) return false;
    var m = Array.from(el.options).find(function(o){
      return o.value.toLowerCase() === v.toLowerCase()
          || o.text.toLowerCase()  === v.toLowerCase()
          || o.text.toLowerCase().startsWith(v.toLowerCase());
    });
    if (m) el.value = m.value;
    ['change','blur'].forEach(function(t){
      el.dispatchEvent(new Event(t, {bubbles:true}));
    });
    return !!m;
  }

  function q(sels, val, isSel) {
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el) return isSel ? ns(el, val) : nv(el, val);
    }
    return false;
  }

  var hit = 0;

  if (d.apt)   hit += q(['input[name="unit"]','input[name="unit_number"]','input[name="apartment"]',
                          'input[name="apt"]','input[id*="unit" i]','input[placeholder*="unit" i]',
                          'input[placeholder*="apt" i]','input[placeholder*="apartment" i]'], d.apt) ? 1 : 0;

  if (d.make)  hit += q(['input[name="make"]','input[id*="make" i]','input[placeholder*="make" i]'], d.make)  ? 1 : 0;
  if (d.model) hit += q(['input[name="model"]','input[id*="model" i]','input[placeholder*="model" i]'], d.model) ? 1 : 0;
  if (d.year)  hit += q(['input[name="year"]','input[id*="year" i]','input[placeholder*="year" i]'], d.year)  ? 1 : 0;
  if (d.color) hit += q(['input[name="color"]','input[id*="color" i]','input[placeholder*="color" i]'], d.color) ? 1 : 0;

  if (d.plate) hit += q(['input[name="plate"]','input[name="license_plate"]','input[name="license"]',
                          'input[id*="plate" i]','input[placeholder*="plate" i]',
                          'input[placeholder*="license" i]'], d.plate) ? 1 : 0;

  if (d.state) { q(['select[name*="state" i]','select[id*="state" i]'], d.state, true);
                 q(['input[name*="state" i]','input[id*="state" i]'], d.state); }

  if (d.code)  q(['input[name*="property_code" i]','input[name*="code" i]','input[id*="code" i]'], d.code);

  // Label-based fallback for unusual markup
  document.querySelectorAll('label').forEach(function(lbl) {
    var t  = lbl.textContent.toLowerCase().trim();
    var el = lbl.control || document.getElementById(lbl.htmlFor) || lbl.nextElementSibling;
    if (!el) return;
    var tag = el.tagName;
    if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return;
    if (/unit|apt|apartment/.test(t) && d.apt)   { nv(el, d.apt);   hit++; }
    else if (/\bmake\b/.test(t) && d.make)        { nv(el, d.make);  hit++; }
    else if (/\bmodel\b/.test(t) && d.model)      { nv(el, d.model); hit++; }
    else if (/\byear\b/.test(t) && d.year)        { nv(el, d.year);  hit++; }
    else if (/color/.test(t) && d.color)          { nv(el, d.color); hit++; }
    else if (/plate|license/.test(t) && d.plate)  { nv(el, d.plate); hit++; }
    else if (/state/.test(t) && tag === 'SELECT' && d.state) ns(el, d.state);
  });

  // If nothing filled yet the SPA hasn't rendered — retry up to 12 times (~8 sec)
  if (hit === 0 && tries > 0) {
    setTimeout(function() { go(tries - 1); }, 700);
  }
})(12);`;
}

main();

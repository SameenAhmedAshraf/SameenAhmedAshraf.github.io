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

  const result = await wv.evaluateJavaScript(fillScript(d), true);

  if (!result || result.hit === 0) {
    const a = new Alert();
    a.title = "ParkFill — Form Not Found";
    a.message = (result && result.fields && result.fields.length > 0
      ? "Found inputs but couldn't match them:\n" + result.fields.join(', ') + "\n\n"
      : "No form inputs found.\n\n") +
      "URL: " + (result ? result.url : d.url) + "\n\nMake sure the complex URL in the app points to the actual registration form page.";
    a.addAction("Open anyway");
    a.addCancelAction("Cancel");
    const choice = await a.present();
    if (choice === 0) await wv.present(false);
  } else {
    await wv.present(false);
  }
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

    // Best path: execCommand goes through WebKit's native editing pipeline
    // which React hooks into directly — most reliable for controlled inputs
    var did = false;
    try {
      if (document.execCommand('selectAll', false, null)) {
        did = document.execCommand('insertText', false, s);
      }
    } catch(e) {}

    if (!did) {
      // Fallback: clear first so React sees a value change, then set
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
      } catch(e) {
        el.dispatchEvent(new Event('input', {bubbles:true}));
      }
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

  function findBtn(re) {
    return Array.from(document.querySelectorAll(
      'button,[role="button"],a,input[type="button"],input[type="submit"]'
    )).find(function(el) {
      var txt = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim();
      return re.test(txt);
    });
  }

  // Find the input associated with a label, handling wrapper divs
  function labelEl(lbl) {
    if (lbl.control) return lbl.control;
    if (lbl.htmlFor) return document.getElementById(lbl.htmlFor);
    var inner = lbl.querySelector('input,select,textarea');
    if (inner) return inner;
    var sib = lbl.nextElementSibling;
    if (sib) {
      if (/INPUT|SELECT|TEXTAREA/.test(sib.tagName)) return sib;
      var sibInner = sib.querySelector('input,select,textarea');
      if (sibInner) return sibInner;
    }
    if (lbl.parentElement) return lbl.parentElement.querySelector('input,select,textarea');
    return null;
  }

  // Returns true if the registration form inputs are already on screen
  function formVisible() {
    var labels = Array.from(document.querySelectorAll('label'));
    return labels.some(function(l){ return /plate|make|model|apartment|unit/i.test(l.textContent); })
        || !!document.querySelector('input[placeholder*="plate" i],input[placeholder*="make" i],input[placeholder*="apt" i]');
  }

  function fillAll() {
    var hit = 0;

    if (d.apt) hit += q([
      'input[name="unit"]','input[name="unit_number"]','input[name="apartment"]',
      'input[name="apt"]','input[name="unitNumber"]','input[name="apt_number"]',
      'input[name="apartment_number"]',
      'input[id*="unit" i]','input[id*="apt" i]','input[id*="apartment" i]',
      'input[placeholder*="unit" i]','input[placeholder*="apt" i]',
      'input[placeholder*="apartment" i]','input[placeholder*="suite" i]',
      '[aria-label*="unit" i]','[aria-label*="apt" i]'
    ], d.apt) ? 1 : 0;

    if (d.make)  hit += q(['input[name="make"]','input[name="vehicle_make"]','input[id*="make" i]','input[placeholder*="make" i]','[aria-label*="make" i]'], d.make) ? 1 : 0;
    if (d.model) hit += q(['input[name="model"]','input[name="vehicle_model"]','input[id*="model" i]','input[placeholder*="model" i]','[aria-label*="model" i]'], d.model) ? 1 : 0;
    if (d.year)  hit += q(['input[name="year"]','input[name="vehicle_year"]','input[id*="year" i]','input[placeholder*="year" i]','[aria-label*="year" i]'], d.year) ? 1 : 0;
    if (d.color) hit += q(['input[name="color"]','input[name="vehicle_color"]','input[id*="color" i]','input[placeholder*="color" i]','[aria-label*="color" i]'], d.color) ? 1 : 0;

    // Fill both plate and confirm-plate fields
    if (d.plate) {
      hit += q([
        'input[name="plate"]','input[name="license_plate"]','input[name="license"]',
        'input[name="licensePlate"]','input[name="plateNumber"]',
        'input[id*="plate" i]','input[id*="license" i]',
        'input[placeholder*="plate" i]','input[placeholder*="license" i]',
        '[aria-label*="plate" i]','[aria-label*="license" i]'
      ], d.plate) ? 1 : 0;
      // Confirm plate fields
      q([
        'input[name="confirm_plate"]','input[name="confirm_license_plate"]',
        'input[name="confirmPlate"]','input[name="plate_confirm"]',
        'input[id*="confirm" i][id*="plate" i]','input[id*="confirm" i][id*="license" i]',
        'input[placeholder*="confirm" i]'
      ], d.plate);
    }

    if (d.state) {
      q(['select[name*="state" i]','select[id*="state" i]','select[aria-label*="state" i]'], d.state, true);
      q(['input[name*="state" i]','input[id*="state" i]'], d.state);
    }

    if (d.email) hit += q([
      'input[type="email"]',
      'input[name="email"]','input[name="guest_email"]','input[name="visitor_email"]',
      'input[id*="email" i]','input[placeholder*="email" i]','[aria-label*="email" i]'
    ], d.email) ? 1 : 0;

    if (d.code) q(['input[name*="property_code" i]','input[name*="code" i]','input[id*="code" i]','input[placeholder*="code" i]'], d.code);

    // Label-text fallback — handles any markup structure
    document.querySelectorAll('label').forEach(function(lbl) {
      var t  = lbl.textContent.toLowerCase().trim();
      var el = labelEl(lbl);
      if (!el) return;
      var tag = el.tagName;
      if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return;
      if      (/unit|apt|apartment|suite/.test(t) && d.apt)    { if(nv(el, d.apt))   hit++; }
      else if (/\bmake\b/.test(t) && d.make)                    { if(nv(el, d.make))  hit++; }
      else if (/\bmodel\b/.test(t) && d.model)                  { if(nv(el, d.model)) hit++; }
      else if (/\byear\b/.test(t) && d.year)                    { if(nv(el, d.year))  hit++; }
      else if (/colou?r/.test(t) && d.color)                    { if(nv(el, d.color)) hit++; }
      else if (/plate|licen/.test(t) && d.plate)                { if(nv(el, d.plate)) hit++; }
      else if (/e.?mail/.test(t) && d.email)                    { if(nv(el, d.email)) hit++; }
      else if (/state|province/.test(t) && tag === 'SELECT' && d.state) ns(el, d.state);
    });

    return hit;
  }

  function done(hit) {
    var inputs = Array.from(document.querySelectorAll('input,select,textarea'));
    var fields = inputs.map(function(el) {
      return (el.name || el.id || el.getAttribute('aria-label') || el.placeholder || '').slice(0,25);
    }).filter(Boolean).slice(0,12);
    completion({hit: hit, url: location.href, fields: fields});
  }

  var totalHit = 0;

  // Improved findBtn: collapses whitespace, matches prefix not just exact
  function findBtn(re) {
    return Array.from(document.querySelectorAll(
      'button,[role="button"],input[type="button"],input[type="submit"]'
    )).find(function(el) {
      var txt = (el.textContent || el.value || el.getAttribute('aria-label') || '')
                .replace(/\s+/g,' ').trim();
      return re.test(txt);
    });
  }

  // Primary action button: the last visible non-back button on the page
  function primaryBtn() {
    var candidates = Array.from(document.querySelectorAll('button,input[type="submit"]'))
      .filter(function(el) {
        var txt = (el.textContent || el.value || '').toLowerCase().trim();
        return el.offsetParent !== null          // visible
            && !/back|cancel|close|skip/i.test(txt);
      });
    return candidates[candidates.length - 1] || null;
  }

  var totalHit = 0;

  // Phase 1 — click "Visitor Parking" (skip if form already visible)
  var p1 = 10;
  function phase1() {
    if (formVisible()) { phase3(); return; }
    var btn = findBtn(/visitor.?parking/i);
    if (btn) { btn.click(); setTimeout(phase2, 600); return; }
    if (--p1 > 0) { setTimeout(phase1, 300); } else { phase3(); }
  }

  // Phase 2 — click navigation Next only if form NOT yet visible
  var p2 = 10;
  function phase2() {
    if (formVisible()) { phase3(); return; }
    var btn = findBtn(/next/i) || findBtn(/continue/i) || findBtn(/proceed/i) || primaryBtn();
    if (btn) { btn.click(); setTimeout(phase3, 600); return; }
    if (--p2 > 0) { setTimeout(phase2, 300); } else { phase3(); }
  }

  // Phase 3 — fill vehicle info (brief pause first so React finishes mounting)
  var p3 = 15;
  function phase3() { setTimeout(phase3fill, 400); }
  function phase3fill() {
    var hit = fillAll();
    if (hit > 0) { totalHit += hit; setTimeout(phase4, 700); return; }
    if (--p3 > 0) { setTimeout(phase3fill, 300); } else { done(0); }
  }

  // Phase 4 — click "Next" to proceed to the email step
  var p4 = 15;
  function phase4() {
    if (emailInput()) { phase5(); return; }   // email already on same page
    var btn = findBtn(/next/i) || findBtn(/continue/i) || findBtn(/proceed/i) || primaryBtn();
    if (btn) { btn.click(); setTimeout(phase5, 900); return; }
    if (--p4 > 0) { setTimeout(phase4, 300); } else { done(totalHit); }
  }

  // Phase 5 — fill the email field
  var p5 = 15;
  function phase5() {
    var el = emailInput();
    if (el) {
      if (d.email) nv(el, d.email);
      setTimeout(phase6, 600);
      return;
    }
    if (!d.email) { done(totalHit); return; }
    if (--p5 > 0) { setTimeout(phase5, 300); } else { phase6(); }
  }

  function emailInput() {
    return document.querySelector(
      'input[type="email"],input[name*="email" i],input[id*="email" i],input[placeholder*="email" i]'
    );
  }

  // Phase 6 — click "Send" / submit
  var p6 = 12;
  function phase6() {
    var btn = findBtn(/send/i) || findBtn(/submit/i) || findBtn(/register/i)
           || findBtn(/confirm/i) || findBtn(/finish/i) || findBtn(/get.?pass/i)
           || findBtn(/done/i) || primaryBtn();
    if (btn) { btn.click(); setTimeout(function(){ done(totalHit); }, 600); return; }
    if (--p6 > 0) { setTimeout(phase6, 300); } else { done(totalHit); }
  }

  phase1();
})();`;
}

main();

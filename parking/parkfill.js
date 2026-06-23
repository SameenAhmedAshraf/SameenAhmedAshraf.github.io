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
    const btns = (result && result.buttons && result.buttons.length)
      ? "\n\nButtons seen: " + result.buttons.join(' | ') : "";
    const a = new Alert();
    a.title = "ParkFill — Not Filled";
    a.message = "Could not fill the form." + btns + "\n\nURL: " + (result ? result.url : d.url);
    a.addAction("Open anyway");
    a.addCancelAction("Cancel");
    if (await a.present() === 0) await wv.present(false);
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
  var totalHit = 0;
  var completed = false;

  // ── Input fill (React-compatible via execCommand) ───────────────────────────
  function nv(el, v) {
    if (!el || v === undefined || v === null) return false;
    var s = String(v);
    if (!s) return false;
    el.focus(); el.select();
    var did = false;
    try { did = document.execCommand('selectAll', false, null) && document.execCommand('insertText', false, s); } catch(e) {}
    if (!did) {
      var desc;
      try { desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value') || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value'); } catch(e) {}
      if (desc && desc.set) desc.set.call(el, '');
      el.value = '';
      el.dispatchEvent(new Event('input', {bubbles:true}));
      if (desc && desc.set) desc.set.call(el, s);
      el.value = s;
      try { el.dispatchEvent(new InputEvent('input', {bubbles:true, cancelable:true, inputType:'insertText', data:s})); }
      catch(e) { el.dispatchEvent(new Event('input', {bubbles:true})); }
    }
    el.dispatchEvent(new Event('change', {bubbles:true}));
    el.dispatchEvent(new Event('blur',   {bubbles:true}));
    return true;
  }

  function ns(el, v) {
    if (!el || !v) return false;
    var m = Array.from(el.options).find(function(o){
      return o.value.toLowerCase()===v.toLowerCase() || o.text.toLowerCase()===v.toLowerCase()
          || o.text.toLowerCase().startsWith(v.toLowerCase());
    });
    if (m) el.value = m.value;
    el.dispatchEvent(new Event('change', {bubbles:true}));
    el.dispatchEvent(new Event('blur',   {bubbles:true}));
    return !!m;
  }

  function q(sels, val, isSel) {
    for (var i=0; i<sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el) return isSel ? ns(el,val) : nv(el,val);
    }
    return false;
  }

  // ── Button helpers ──────────────────────────────────────────────────────────
  function allBtns() {
    return Array.from(document.querySelectorAll(
      'button, [role="button"], input[type="button"], input[type="submit"], input[type="image"], a[class*="btn"], a[class*="button"]'
    )).filter(function(el){ return el.offsetParent !== null; });
  }

  function btnText(el) {
    return (el.textContent || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '')
           .replace(/\\s+/g,' ').trim();
  }

  function findBtn(re) {
    return allBtns().find(function(el){ return re.test(btnText(el)); });
  }

  function clickBtn(el) {
    try { el.click(); } catch(e) {}
    try { el.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})); } catch(e) {}
  }

  // Visible email input (inside modal or page)
  function emailInput() {
    return Array.from(document.querySelectorAll(
      'input[type="email"], input[name*="email" i], input[id*="email" i], input[placeholder*="email" i]'
    )).find(function(el){ return el.offsetParent !== null; });
  }

  // Direct form submit button
  function formSubmitBtn() {
    var forms = Array.from(document.querySelectorAll('form'));
    for (var i=0; i<forms.length; i++) {
      var s = forms[i].querySelector('button[type="submit"], input[type="submit"], input[type="image"]');
      if (s && s.offsetParent !== null) return s;
      var bs = Array.from(forms[i].querySelectorAll('button')).filter(function(b){ return b.offsetParent!==null; });
      if (bs.length) return bs[bs.length-1];
    }
    return null;
  }

  // ── Label → input ───────────────────────────────────────────────────────────
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

  function formVisible() {
    return Array.from(document.querySelectorAll('label')).some(function(l){
      return /plate|make|model|apartment|unit/i.test(l.textContent);
    }) || !!document.querySelector('input[placeholder*="plate" i],input[placeholder*="make" i],input[placeholder*="apt" i]');
  }

  // ── Fill vehicle fields ─────────────────────────────────────────────────────
  function fillAll() {
    var hit = 0;
    if (d.apt) hit += q(['input[name="unit"]','input[name="unit_number"]','input[name="apartment"]','input[name="apt"]','input[name="unitNumber"]','input[name="apartment_number"]','input[id*="unit" i]','input[id*="apt" i]','input[id*="apartment" i]','input[placeholder*="unit" i]','input[placeholder*="apt" i]','input[placeholder*="apartment" i]','[aria-label*="unit" i]','[aria-label*="apt" i]'], d.apt) ? 1 : 0;
    if (d.make)  hit += q(['input[name="make"]','input[name="vehicle_make"]','input[id*="make" i]','input[placeholder*="make" i]','[aria-label*="make" i]'], d.make) ? 1 : 0;
    if (d.model) hit += q(['input[name="model"]','input[name="vehicle_model"]','input[id*="model" i]','input[placeholder*="model" i]','[aria-label*="model" i]'], d.model) ? 1 : 0;
    if (d.year)  hit += q(['input[name="year"]','input[name="vehicle_year"]','input[id*="year" i]','input[placeholder*="year" i]','[aria-label*="year" i]'], d.year) ? 1 : 0;
    if (d.color) hit += q(['input[name="color"]','input[name="vehicle_color"]','input[id*="color" i]','input[placeholder*="color" i]','[aria-label*="color" i]'], d.color) ? 1 : 0;
    if (d.plate) {
      hit += q(['input[name="plate"]','input[name="license_plate"]','input[name="license"]','input[name="licensePlate"]','input[id*="plate" i]','input[id*="license" i]','input[placeholder*="plate" i]','input[placeholder*="license" i]','[aria-label*="plate" i]'], d.plate) ? 1 : 0;
      q(['input[name="confirm_plate"]','input[name="confirm_license_plate"]','input[name="confirmPlate"]','input[id*="confirm" i][id*="plate" i]','input[placeholder*="confirm" i]'], d.plate);
    }
    if (d.state) { q(['select[name*="state" i]','select[id*="state" i]','select[aria-label*="state" i]'], d.state, true); q(['input[name*="state" i]','input[id*="state" i]'], d.state); }
    if (d.code)  q(['input[name*="property_code" i]','input[name*="code" i]','input[id*="code" i]'], d.code);
    document.querySelectorAll('label').forEach(function(lbl) {
      var t=lbl.textContent.toLowerCase().trim(), el=labelEl(lbl);
      if (!el) return;
      var tag=el.tagName;
      if (tag!=='INPUT'&&tag!=='SELECT'&&tag!=='TEXTAREA') return;
      if      (/unit|apt|apartment|suite/.test(t)&&d.apt)  { if(nv(el,d.apt))   hit++; }
      else if (/\bmake\b/.test(t)&&d.make)                  { if(nv(el,d.make))  hit++; }
      else if (/\bmodel\b/.test(t)&&d.model)                { if(nv(el,d.model)) hit++; }
      else if (/\byear\b/.test(t)&&d.year)                  { if(nv(el,d.year))  hit++; }
      else if (/colou?r/.test(t)&&d.color)                  { if(nv(el,d.color)) hit++; }
      else if (/plate|licen/.test(t)&&d.plate)              { if(nv(el,d.plate)) hit++; }
      else if (/state|province/.test(t)&&tag==='SELECT'&&d.state) ns(el,d.state);
    });
    return hit;
  }

  // ── Done (called once) ──────────────────────────────────────────────────────
  function done(hit) {
    if (completed) return;
    completed = true;
    var btns = allBtns().map(function(el){ return btnText(el).slice(0,30); }).filter(Boolean).slice(0,10);
    completion({hit:hit, url:location.href, buttons:btns});
  }

  // ── Phase 1 — click "Visitor Parking" (skip if form already visible) ────────
  var p1=10;
  function phase1() {
    if (formVisible()) { phase3(); return; }
    var btn = findBtn(/visitor.?parking/i);
    if (btn) { clickBtn(btn); setTimeout(phase2, 600); return; }
    if (--p1>0) setTimeout(phase1,300); else phase3();
  }

  // ── Phase 2 — click nav Next only if form NOT yet visible ───────────────────
  var p2=10;
  function phase2() {
    if (formVisible()) { phase3(); return; }
    var btn = findBtn(/next/i) || findBtn(/continue/i);
    if (btn) { clickBtn(btn); setTimeout(phase3, 600); return; }
    if (--p2>0) setTimeout(phase2,300); else phase3();
  }

  // ── Phase 3 — fill vehicle form ─────────────────────────────────────────────
  var p3=15;
  function phase3() { setTimeout(phase3fill, 400); }
  function phase3fill() {
    var hit = fillAll();
    if (hit>0) { totalHit+=hit; setTimeout(phase4, 700); return; }
    if (--p3>0) setTimeout(phase3fill,300); else done(0);
  }

  // ── Phase 4 — click red "Next" button to submit vehicle form ────────────────
  var p4=15;
  function phase4() {
    // "Next" button — the red one at the bottom of the vehicle form
    var btn = findBtn(/^next$/i) || formSubmitBtn();
    if (btn) { clickBtn(btn); setTimeout(phase5, 1200); return; }
    if (--p4>0) setTimeout(phase4,300); else done(totalHit);
  }

  // ── Phase 5 — click blue "E-Mail Confirmation" button ───────────────────────
  var p5=20;
  function phase5() {
    if (emailInput()) { phase6(); return; }  // modal already open
    // The blue button that opens the email dialog
    var btn = findBtn(/e.?mail.*confirm/i) || findBtn(/confirm.*e.?mail/i)
           || findBtn(/e.?mail/i) || findBtn(/confirm/i);
    if (btn) { clickBtn(btn); setTimeout(phase6, 800); return; }
    if (--p5>0) setTimeout(phase5,400); else phase6();
  }

  // ── Phase 6 — fill email in the modal ───────────────────────────────────────
  var p6=15;
  function phase6() {
    var el = emailInput();
    if (el) {
      if (d.email) nv(el, d.email);
      setTimeout(phase7, 600);
      return;
    }
    if (!d.email) { done(totalHit); return; }
    if (--p6>0) setTimeout(phase6,300); else phase7();
  }

  // ── Phase 7 — click green "Send" button ─────────────────────────────────────
  var p7=12;
  function phase7() {
    var btn = findBtn(/^send$/i);
    if (btn) { clickBtn(btn); setTimeout(function(){ done(totalHit); }, 600); return; }
    if (--p7>0) setTimeout(phase7,300); else done(totalHit);
  }

  phase1();
})();`;
}

main();

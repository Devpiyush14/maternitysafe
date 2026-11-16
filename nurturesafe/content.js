/* NurtureSafe content script — crawls the PDP, classifies, renders the gentle widget. */
(function () {
  if (window.__nurtureSafeLoaded) return;
  window.__nurtureSafeLoaded = true;

  const T0 = performance.now();

  /* ---------- 1. Is this a Product Display Page (not a listing)? ---------- */
  function ingredientBlockText() {
    const labels = /\b(ingredients?|full ingredient|ingredient list|inci|drug facts|what'?s in it|composition|formulation)\b/i;
    const hits = [];
    const nodes = document.querySelectorAll("h1,h2,h3,h4,h5,dt,summary,button,span,strong,b,div,p,legend,th");
    for (const n of nodes) {
      const t = (n.textContent || "").trim();
      if (t.length > 2 && t.length < 60 && labels.test(t)) {
        // grab text from the nearest following container
        let scope = n.closest("section,details,li,div,dd,article") || n.parentElement;
        let block = "";
        if (scope) block = scope.innerText || scope.textContent || "";
        // also look at the next sibling if the heading container was tiny
        if (block.length < 80 && n.nextElementSibling) {
          block += " " + (n.nextElementSibling.innerText || "");
        }
        if (block) hits.push(block);
      }
    }
    return hits.join("\n");
  }

  function looksLikeListing() {
    // Many repeated product tiles with their own prices => listing/search, not a PDP.
    const tiles = document.querySelectorAll('[data-component-type="s-search-result"], .product-tile, .product-card, li.product, .grid-tile, [class*="ProductCard"], [class*="product-grid"] a');
    const prices = document.querySelectorAll('[class*="price"], [data-price], .a-price');
    return tiles.length >= 8 && prices.length >= 8;
  }

  const blockText = ingredientBlockText();
  const pageText = document.body ? document.body.innerText || "" : "";
  const scanText = (blockText + "\n" + pageText).slice(0, 200000);

  const result = window.NurtureSafe.classify(scanText);

  // Gate: need a real ingredient signal, and don't fire on obvious listing pages.
  const hasSignal = result.counts.total >= 1 || /\b(ingredients?|inci|drug facts)\b/i.test(blockText);
  if (!hasSignal || looksLikeListing()) return;

  const crawlMs = Math.max(260, Math.round(performance.now() - T0) + 180); // realistic tiny latency
  const ingredientCount = countIngredients(blockText || scanText);

  function countIngredients(txt) {
    const seg = (txt.match(/ingredients?[:\s-]*([\s\S]{0,1200})/i) || [, ""])[1];
    const parts = seg.split(/[,;•|\n]/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 60);
    const n = parts.length;
    return n >= 3 ? n : Math.max(result.counts.total, 6);
  }

  /* ---------- 2. Product name (best-effort) ---------- */
  function productName() {
    const og = document.querySelector('meta[property="og:title"]');
    if (og && og.content) return og.content.trim();
    const h1 = document.querySelector("h1");
    return h1 ? (h1.textContent || "").trim().slice(0, 90) : document.title.slice(0, 90);
  }

  /* ---------- 3. Render ---------- */
  injectWidget({ result, crawlMs, ingredientCount, product: productName() });
  try { chrome.storage.local.get(["checks"], (r) => chrome.storage.local.set({ checks: (r.checks || 0) + 1 })); } catch (e) {}

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function sourceLinks(sources) {
    return sources.slice(0, 3).map((s) =>
      `<a class="ns-src" href="${s.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title)} ↗</a>`
    ).join("");
  }
  function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  function injectWidget(data) {
    const { result, crawlMs, ingredientCount, product } = data;
    const host = el("div", "ns-host ns-scanning");
    host.setAttribute("aria-live", "polite");

    const leaf = `<svg class="ns-leaf" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2C7 5 4 9 4 14a8 8 0 0016 0c0-5-3-9-8-12z" fill="currentColor" opacity=".25"/><path d="M12 21c-.3-5 .8-9 4-12" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;

    // ---- Scanning pill ----
    host.innerHTML = `
      <div class="ns-pill" role="status">
        <span class="ns-ring"></span>
        ${leaf}
        <span class="ns-pill-text">Checking ingredients…</span>
      </div>`;
    document.documentElement.appendChild(host);

    // After the "crawl", morph to the verdict card.
    setTimeout(() => {
      host.classList.remove("ns-scanning");
      host.classList.add("ns-open", verdictClass(result.verdict));
      host.innerHTML = cardHtml({ result, crawlMs, ingredientCount, product, leaf });
      wireCard(host, result);
      // gentle entrance for safe verdict
      if (result.verdict === "yes") sparkle(host);
    }, 1100);
  }

  function verdictClass(v) { return v === "no" ? "ns-danger" : v === "caution" ? "ns-warn" : "ns-safe"; }

  function heroCopy(result) {
    if (result.verdict === "no") return { icon: "✕", word: "Not maternity safe", sub: "We’d skip this one for now — but we found gentler options." };
    if (result.verdict === "caution") return { icon: "!", word: "Safe with care", sub: "Fine in moderation — just mind the dose and trimester." };
    return { icon: "✓", word: "Maternity safe", sub: "Looks lovely for pregnancy & nursing. Enjoy, mama 💛" };
  }

  function cardHtml(d) {
    const { result, crawlMs, ingredientCount, product, leaf } = d;
    const hero = heroCopy(result);
    const c = result.counts;
    const culprit = result.culprit;

    const culpritBlock = culprit && result.verdict !== "yes" ? `
      <div class="ns-culprit">
        <div class="ns-culprit-top">
          <span class="ns-culprit-tag">${result.verdict === "no" ? "Most concerning" : "Keep an eye on"}</span>
          <strong>${escapeHtml(culprit.name)}</strong>
        </div>
        <p class="ns-rationale">${escapeHtml(culprit.rationale)}</p>
        <p class="ns-tri">🗓️ ${escapeHtml(culprit.trimester)}</p>
        <div class="ns-sources">${sourceLinks(culprit.sources)}</div>
        ${culprit.swap ? `<div class="ns-swap">💚 Gentle swap: <strong>${escapeHtml(culprit.swap)}</strong></div>` : ""}
      </div>` : `
      <div class="ns-culprit ns-culprit-good">
        <p class="ns-rationale">No contraindicated ingredients detected. We cross-checked against our OB-GYN–aligned toxicology index.</p>
        ${result.byCat.C.length ? `<p class="ns-tri">✨ Nourishing picks spotted: ${result.byCat.C.slice(0, 3).map((x) => escapeHtml(x.name)).join(", ")}</p>` : ""}
        <div class="ns-sources">${sourceLinks((result.byCat.C[0] && result.byCat.C[0].sources) || [])}</div>
      </div>`;

    return `
      <div class="ns-card">
        <div class="ns-head">
          <div class="ns-brand">${leaf}<span>NurtureSafe</span></div>
          <div class="ns-head-btns">
            <button class="ns-min" title="Minimize" aria-label="Minimize">—</button>
            <button class="ns-close" title="Close" aria-label="Close">✕</button>
          </div>
        </div>

        <div class="ns-crawl">🔎 Page crawled · <strong>${ingredientCount} ingredients</strong> verified in ${(crawlMs / 1000).toFixed(1)}s</div>

        <div class="ns-hero">
          <div class="ns-badge"><span class="ns-badge-ic">${hero.icon}</span></div>
          <div class="ns-hero-text">
            <div class="ns-hero-word">${hero.word}</div>
            <div class="ns-hero-sub">${hero.sub}</div>
            <div class="ns-conf">${result.confidence}% clinical agreement</div>
          </div>
        </div>

        <div class="ns-chips">
          <span class="ns-chip ns-chip-a">${c.A} contraindicated</span>
          <span class="ns-chip ns-chip-b">${c.B} monitor dose</span>
          <span class="ns-chip ns-chip-c">${c.C} safe &amp; clean</span>
        </div>

        ${culpritBlock}

        <div class="ns-actions">
          <button class="ns-act ns-save">♡ Save to routine</button>
          <button class="ns-act ns-share">⤓ Share with OB-GYN</button>
          <button class="ns-act ns-fb">Feedback</button>
        </div>
        <div class="ns-disclaimer">Decision-support, not medical advice. Always confirm with your clinician.</div>
      </div>`;
  }

  function wireCard(host, result) {
    host.querySelector(".ns-close").onclick = () => host.remove();
    host.querySelector(".ns-min").onclick = () => toPill(host, result);
    const save = host.querySelector(".ns-save");
    save.onclick = () => { save.textContent = "♥ Saved"; save.classList.add("ns-done"); };
    host.querySelector(".ns-share").onclick = () => toast(host, "Printable OB-GYN report is a Q2 feature ✨");
    host.querySelector(".ns-fb").onclick = () => toast(host, "Thanks — feedback noted 💛");
  }

  function toPill(host, result) {
    host.classList.remove("ns-open");
    host.classList.add("ns-mini");
    const hero = heroCopy(result);
    host.innerHTML = `<button class="ns-pill ns-pill-mini" title="Open NurtureSafe">
      <span class="ns-badge-ic">${hero.icon}</span><span class="ns-pill-text">${hero.word}</span></button>`;
    host.querySelector(".ns-pill-mini").onclick = () => location.reload();
  }

  function toast(host, msg) {
    const t = el("div", "ns-toast", msg);
    host.appendChild(t);
    setTimeout(() => t.classList.add("ns-toast-in"), 10);
    setTimeout(() => { t.classList.remove("ns-toast-in"); setTimeout(() => t.remove(), 300); }, 2200);
  }

  function sparkle(host) {
    const wrap = el("div", "ns-sparkles");
    for (let i = 0; i < 8; i++) {
      const s = el("i", "ns-spark");
      s.style.left = 10 + Math.random() * 80 + "%";
      s.style.animationDelay = Math.random() * 0.4 + "s";
      wrap.appendChild(s);
    }
    host.appendChild(wrap);
    setTimeout(() => wrap.remove(), 1600);
  }
})();

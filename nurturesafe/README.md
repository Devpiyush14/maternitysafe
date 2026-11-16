# NurtureSafe — Pregnancy-Safe Ingredient Check (Chrome Extension, MV3)

Gentle, instant ingredient safety checks for pregnancy & nursing, right on any product
page. When you land on a Product Display Page, NurtureSafe quietly reads the ingredient
list, classifies every ingredient against an OB-GYN–aligned toxicology index, and shows a
soft top-right card with a clear verdict, the most-concerning ingredient, why, 2–3 clinical
sources, and a gentle swap.

> Decision-support, **not** medical advice. Always confirm with your clinician.

## What's inside
| File | Role |
|------|------|
| `manifest.json` | MV3 config (content script + popup, no remote calls) |
| `toxicology.js` | Clinical toxicology index + classifier (Category A/B/C) |
| `content.js` | PDP detection, ingredient crawler, in-page widget |
| `widget.css` | Gentle widget styling + animations |
| `popup.html/js` | Toolbar popup (how-it-works + re-check) |
| `background.js` | Service worker (lifecycle / future sync) |
| `demo/product.html` | Local sample PDP for testing the happy path |

## How the happy path works
1. Content script runs on every page, but **gates**: it only shows up when a real
   ingredient list is present and the page isn't a listing/search grid.
2. It extracts the ingredient block (expanding "Ingredients / INCI / Drug Facts" sections),
   tokenizes, and matches against the index — fully **offline**, no API key, no data sent.
3. A scanning pill animates ("Checking ingredients…"), then morphs into the verdict card:
   - **Hero verdict**: Maternity safe ✓ / Safe with care ! / Not maternity safe ✕
   - Clinical-agreement score + crawl summary
   - Breakdown chips: *contraindicated · monitor · safe & clean*
   - **Culprit**: most-concerning ingredient, 2–3 line rationale, trimester note,
     2–3 source links (MotherToBaby, PubMed, ACOG, FDA), and a gentle swap.

## Load it (unpacked) for testing
1. Chrome → `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this `nurturesafe/` folder.
3. Open `demo/product.html` (drag into Chrome) — the card appears top-right with a
   "Not maternity safe" verdict (Retinol + Hydroquinone). Try any real skincare PDP too.

## Publishing to the Chrome Web Store
- Zip the **contents** of `nurturesafe/` (not the parent folder).
- Dashboard → create item → upload zip → fill listing (screenshots from the preview),
  privacy tab: declare **no data collected** (all analysis is local).
- Justify `activeTab` + broad content-script match: "reads the current product page's
  ingredient text locally to show a pregnancy-safety verdict; no data leaves the device."

## Roadmap (per PRD)
- **Q1 (this build):** PDP parser, toxicology index, gentle verdict card, safe-swap hint.
- **Q2:** trimester toggle, food/supplement screening, printable OB-GYN report.
- **Q3:** universal Shopify/Woo detection, registry batch scan, routine conflict detector.
- **Q4:** "Ask NurtureSafe AI", multi-jurisdiction sync, mobile web, brand API badge.

## Clinical sourcing
Ingredient verdicts are aligned with public guidance from MotherToBaby (OTIS), ACOG,
the U.S. FDA and PubMed literature. Source links on each verdict point to these
authorities. The index is a curated MVP subset — expand `toxicology.js` to grow coverage.

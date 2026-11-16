# MaternitySafe → NurtureSafe

A gentle, offline Chrome extension (Manifest V3) that checks whether an e-commerce
product's ingredients are safe for pregnancy & nursing — right on the product page.

> Decision-support, **not** medical advice. Always confirm with your clinician.

## Repository layout
| Path | What it is |
|------|------------|
| [`nurturesafe/`](nurturesafe/) | The extension. **Zip this folder's contents** to publish to the Chrome Web Store. |
| `nurturesafe/toxicology.js` | OB-GYN–aligned clinical index (~54 ingredients, Category A/B/C) + classifier |
| `nurturesafe/content.js` + `widget.css` | PDP crawler + gentle top-right verdict widget |
| `nurturesafe/demo/product.html` | Local sample product page for testing |
| `docs/Product Requirements Document.docx` | Full PRD (NurtureSafe™, 4-quarter roadmap) |
| `docs/NurtureSafe_Roadmap.xlsx` | Build status tracker (Built / Partial / To Do) |

## How it works
On any product page, the content script crawls the ingredient list (expanding
"Ingredients / INCI / Drug Facts" sections, skipping listing grids), classifies each
ingredient **fully offline — no API key, no data leaves the device**, then shows a soft
card: hero verdict (Maternity safe / Safe with care / Not maternity safe), the
most-concerning ingredient with a plain-language rationale, 2–3 clinical source links
(MotherToBaby, NIEHS, FDA, PubMed), a gentle swap, and a safety breakdown.

## Install (unpacked)
1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select the `nurturesafe/` folder.
3. Open `nurturesafe/demo/product.html` — the verdict card appears top-right.

See [`nurturesafe/README.md`](nurturesafe/README.md) for full details, roadmap, and
Chrome Web Store publishing steps.

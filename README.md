# Tyneside Technology (static shop)

GitHub Pages only — **no Node required**.

## What’s for sale

One laptop: **ThinkPad T14 Gen 1 (Renewed) · £250**  
(i5-10310U, 16GB, 512GB, Win 11 Pro, UK keyboard)

## Enable Tide “Buy Now”

1. In the Tide app, create an **Instant Checkout** (or Payment Link) for **£250**.
2. Paste the URL into `static/shop-config.js` → `tideCheckoutUrl`.
3. Rebuild: `python -m site_generator technology` and deploy.

If `tideCheckoutUrl` is empty, **Buy Now** opens WhatsApp instead (still works on Pages).

## Files that matter

| Path | Role |
|------|------|
| `static/thinkpad-t14s.html` | Shop page |
| `static/shop-config.js` | Product + Tide URL (edit this) |
| `templates/technology_home.html` | Marketing home (generator) |

Optional Express/Tide server code may still exist under `server/` in the monorepo for experiments — it is **not** copied to the Pages output.

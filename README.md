# Tyneside Technology

**Working computers for people who need them — cheap, not broken. Profit funds good stories.**

This repo is the [tyneside.technology](https://tyneside.technology) website plus a small Node server for **Tide Instant Checkout / Payment Links** and **WhatsApp order alerts** on the ThinkPad store.

---

## Table of contents

1. [Design](#design)
2. [Important: how Tide payments work](#important-how-tide-payments-work)
3. [Project structure](#project-structure)
4. [Checkout flow](#checkout-flow)
5. [Setup (paste credentials)](#setup-paste-credentials)
6. [Run locally](#run-locally)
7. [Tide setup](#tide-setup)
8. [WhatsApp setup](#whatsapp-setup-optional)
9. [API reference](#api-reference)
10. [Deploy notes](#deploy-notes)
11. [Troubleshooting](#troubleshooting)

---

## Design

### Brand & purpose

Tyneside Technology is the **second-hand hardware** arm of the Tyneside family (Software, Cleaning, Charity, Games, Group).

| Pillar | Meaning |
|--------|---------|
| **2nd hand** | Still-working kit, not landfill junk |
| **Low £** | Prices people can actually pay |
| **Stories** | Surplus funds free-gear appeals |

### Visual system

| File | Role |
|------|------|
| `layout.css` | Structure: nav, hero, sections, panels, buttons, store/deal cards |
| `themes.css` | Per-brand skins via CSS variables |
| `logo.svg` | Brand mark |

Body class: `site theme-technology` — dark amber circuit look (accent `#f59e0b`).

### Page map

| Page | Purpose |
|------|---------|
| `index.html` | Mission, model, appeals; links to ThinkPad store |
| `thinkpad-t14s.html` | Catalogue, filters, compare, **Buy Now** → Tide |
| `success.html` | After checkout return (informational) |
| `cancel.html` | Checkout abandoned |

### Store UX

1. Hero + target specs (i7 / 32GB)  
2. Price bands and best pick  
3. Filterable / sortable deal cards with verdicts  
4. Compare up to 3  
5. **Buy Now** → pending order + redirect to Tide payment page  

---

## Important: how Tide payments work

**Tide is not Stripe.** Tide does **not** publish a public “create Checkout Session” card API for your website.

Online card take-payment tools Tide offers (via the Tide app, card processing partnered with Adyen) are:

- **Instant Checkout** — reusable product/service links at a fixed price  
- **Payment Links** — links you create for an amount  

So this app:

1. Stores **your** Tide Instant Checkout / Payment Link URL per laptop in `.env`  
2. On **Buy Now**, creates a **pending** order and **redirects** the customer to that Tide URL  
3. Marks the order **paid** only when something calls **`POST /api/webhooks/tide`** with your secret (ops script, automation, or manual confirm after you see the payment in Tide)  
4. Then sends **WhatsApp** (best-effort)

Open Banking APIs on [developers.tide.co](https://developers.tide.co/) are for regulated TPPs (AIS/PIS), **not** for “sell a laptop with a card form on my site” like Stripe Checkout.

---

## Project structure

```
tyneside.technology-main/
├── index.html
├── thinkpad-t14s.html
├── success.html
├── cancel.html
├── layout.css
├── themes.css
├── logo.svg
├── package.json
├── .env.example
├── data/orders.json          # gitignored content
└── server/
    ├── index.js              # Express: static + API
    ├── catalog.js            # Products & prices (pence)
    ├── orders.js             # Pending / paid store
    ├── tide.js               # Link resolution + webhook auth
    └── whatsapp.js           # Meta Cloud API
```

---

## Checkout flow

```
Customer          Site / API              Tide app link        WhatsApp
   |                   |                     |                    |
   |-- Buy Now ------->|                     |                    |
   |                   |-- create pending    |                    |
   |<-- redirect URL --|                     |                    |
   |------------------ pay on Tide --------->|                    |
   |                   |                     |                    |
   |                   |<-- POST /webhooks/tide (you / automation)|
   |                   |-- mark paid         |                    |
   |                   |----------------------------------------->|
```

1. Customer picks a laptop and clicks **Buy Now**.  
2. `POST /api/create-checkout-session` creates a **pending** order.  
3. Response includes the **Tide Instant Checkout URL** for that product.  
4. Browser redirects to Tide; customer pays by card / Apple Pay.  
5. When payment is confirmed, call **`POST /api/webhooks/tide`** (authorised with `TIDE_WEBHOOK_SECRET`).  
6. Order → **paid**; WhatsApp alert sent if configured.  

The success page **does not** mark the order paid by itself.

### WhatsApp message body

```
✅ New Order Received

Order reference: TYN-YYYYMMDD-XXXXXX
Customer name: …
Customer email: …
Laptop purchased: …
Quantity: …
Total paid: £…
Date and time: …
```

---

## Setup (paste credentials)

```bash
cd tyneside.technology-main
cp .env.example .env
npm install
```

### What to paste in `.env`

| Variable | Required? | What it is |
|----------|-----------|------------|
| `BASE_URL` | Yes | `http://localhost:3000` or live site URL |
| `TIDE_LINK_T14S_339` | For that product | Instant Checkout / Payment Link URL from Tide app (£339) |
| `TIDE_LINK_T14S_416` | For that product | Link for £416 / 512GB best pick |
| `TIDE_LINK_T14S_430` | For that product | Link for £430 |
| `TIDE_LINK_T14S_500` | For that product | Link for £500 |
| `TIDE_LINK_T14S_530` | For that product | Link for £530 |
| `TIDE_WEBHOOK_SECRET` | Yes for paid + WhatsApp | **You invent** a long random string (not from Tide) |
| `WHATSAPP_TOKEN` | Optional | Meta WhatsApp token |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | Meta phone number ID |
| `WHATSAPP_TO` | Optional | Alert destination, digits only e.g. `447411949215` |

**No Stripe keys.** Remove any old `STRIPE_*` lines from `.env`.

Example:

```bash
PORT=3000
BASE_URL=http://localhost:3000

TIDE_LINK_T14S_339=https://pay.example-from-tide/...
TIDE_LINK_T14S_416=https://pay.example-from-tide/...
TIDE_LINK_T14S_430=
TIDE_LINK_T14S_500=
TIDE_LINK_T14S_530=

TIDE_WEBHOOK_SECRET=change-me-to-a-long-random-secret

WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TO=
```

You only need links for products you actually sell. Buy Now on a product without a link shows a clear error naming the missing env key.

---

## Run locally

```bash
npm start
```

- Home: http://localhost:3000/  
- Store: http://localhost:3000/thinkpad-t14s.html  
- Health: http://localhost:3000/api/health  

```json
{
  "ok": true,
  "provider": "tide",
  "tide": true,
  "tideLinksConfigured": 2,
  "tideWebhookSecret": true,
  "whatsappConfigured": false
}
```

---

## Tide setup

### 1. Create links in the Tide app

1. Open the **Tide** app (business account with Instant Checkout / Payment Links enabled).  
2. Create an **Instant Checkout** item (or Payment Link) for each laptop:  
   - Amount must match the catalogue (e.g. £416 for best pick).  
   - Description: e.g. `ThinkPad T14s Gen 2 — 512GB`.  
3. Copy the **share / payment URL**.  
4. Paste into the matching `TIDE_LINK_…` in `.env`.  
5. Restart `npm start`.

Catalogue prices live in **`server/catalog.js`** (pence). Keep Tide link amounts in sync.

| Product ID | Env key | Guide price |
|------------|---------|-------------|
| `t14s-339` | `TIDE_LINK_T14S_339` | £339 |
| `t14s-416` | `TIDE_LINK_T14S_416` | £416 |
| `t14s-430` | `TIDE_LINK_T14S_430` | £430 |
| `t14s-500` | `TIDE_LINK_T14S_500` | £500 |
| `t14s-530` | `TIDE_LINK_T14S_530` | £530 |

### 2. Confirm paid (webhook)

Tide does not automatically hit your server when a link is paid (no public Stripe-style event stream for this).

When you know a payment succeeded, mark the order paid:

```bash
curl -X POST http://localhost:3000/api/webhooks/tide \
  -H "Authorization: Bearer YOUR_TIDE_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "orderRef": "TYN-20260716-ABCDEF",
    "customerName": "Jane Smith",
    "customerEmail": "jane@example.com",
    "status": "paid"
  }'
```

That:

1. Sets order status to **paid**  
2. Triggers **WhatsApp** (if configured)  
3. Is **idempotent** if already paid  

You can wire the same POST from Zapier/Make when you see a matching bank payment, or run it manually from a small ops habit (“payment in Tide → curl / script with order ref”).

---

## WhatsApp setup (optional)

1. Meta app + WhatsApp Cloud API  
2. `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TO`  
3. Restart server  

If blank, WhatsApp is skipped; **paid status still works** via the Tide webhook.

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Provider flags, link counts |
| `GET` | `/api/products` | Catalogue + which Tide links are configured |
| `POST` | `/api/create-checkout-session` | `{ "productId": "t14s-416" }` → `{ url, orderRef }` Tide redirect |
| `POST` | `/api/webhooks/tide` | Auth with secret; mark paid + WhatsApp |
| `GET` | `/api/orders/:orderRef` | Public status for success page |

Orders: `data/orders.json`.

---

## Deploy notes

- Node host required (not GitHub Pages alone) for Buy Now + webhooks.  
- Set production `BASE_URL` and paste live Tide Instant Checkout URLs.  
- Protect `TIDE_WEBHOOK_SECRET`; never commit `.env`.  

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|--------|-----|
| No Tide payment link for this laptop | Missing `TIDE_LINK_…` | Create Instant Checkout in Tide app, paste URL, restart |
| Buy Now works, order stays `pending` | Webhook not called | `POST /api/webhooks/tide` with secret + `orderRef` |
| 401 on webhook | Wrong secret | Match `Authorization: Bearer` to `TIDE_WEBHOOK_SECRET` |
| No WhatsApp | Blank Meta env | Fill three WhatsApp vars |
| Old Stripe errors | Stale server / `.env` | Remove `STRIPE_*`, restart `npm start` |

---

## Family sites

Software · Cleaning · Charity · Group · Tech · Games — same nav pattern.  
WhatsApp contact: **+44 7411 949215** · Howden Community Hub.

---

## Licence / affiliation

Tyneside Software Ltd. Not affiliated with Lenovo or Tide beyond payment tooling you configure.  
Proudly made on the banks of the Tyne.

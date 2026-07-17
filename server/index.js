require("dotenv").config();

const path = require("path");
const express = require("express");
const { listProducts, getProduct } = require("./catalog");
const {
  createPendingOrder,
  updateOrder,
  markPaidFromTide,
  findByOrderRef,
  publicOrderView,
} = require("./orders");
const { notifyNewOrder } = require("./whatsapp");
const {
  isTideReady,
  buildCheckoutRedirectUrl,
  getTideLink,
  listConfiguredLinks,
  envKeyForProduct,
  webhookSecretConfigured,
  verifyWebhookAuth,
} = require("./tide");

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(
  /\/$/,
  ""
);

const app = express();
const rootDir = path.join(__dirname, "..");

app.use(express.json());

async function sendWhatsAppForPaidOrder(order) {
  try {
    const result = await notifyNewOrder(order);
    if (result.ok) {
      updateOrder(order.id, { whatsappNotified: true, whatsappError: null });
    } else {
      updateOrder(order.id, {
        whatsappNotified: false,
        whatsappError: result.error || "unknown",
      });
      console.error(
        "[orders] WhatsApp notification failed; order remains paid:",
        result.error
      );
    }
  } catch (waErr) {
    updateOrder(order.id, {
      whatsappNotified: false,
      whatsappError: waErr.message,
    });
    console.error(
      "[orders] WhatsApp threw; order remains paid:",
      waErr.message
    );
  }
}

// Health
app.get("/api/health", (_req, res) => {
  const links = listConfiguredLinks();
  res.json({
    ok: true,
    provider: "tide",
    tide: isTideReady(),
    tideLinksConfigured: links.filter((l) => l.configured).length,
    tideLinksTotal: links.length,
    tideWebhookSecret: webhookSecretConfigured(),
    whatsappConfigured: Boolean(
      process.env.WHATSAPP_TOKEN &&
        process.env.WHATSAPP_PHONE_NUMBER_ID &&
        process.env.WHATSAPP_TO
    ),
  });
});

// Catalogue for the storefront
app.get("/api/products", (_req, res) => {
  const products = listProducts().map((p) => ({
    ...p,
    tideLinkConfigured: Boolean(getTideLink(p.id)),
    tideEnvKey: envKeyForProduct(p.id),
  }));
  res.json({ products });
});

/**
 * Start Tide checkout for a specific laptop.
 * Body: { productId: string, quantity?: number }
 *
 * Creates a pending order and returns the Tide Instant Checkout / Payment Link URL.
 * (Tide does not expose a server-side "create session" API like Stripe.)
 */
app.post("/api/create-checkout-session", async (req, res) => {
  const productId = req.body?.productId;
  const quantity = Math.max(1, Math.min(10, Number(req.body?.quantity) || 1));

  const product = getProduct(productId);
  if (!product) {
    return res.status(400).json({ error: "Unknown product" });
  }

  if (product.inStock === false) {
    return res.status(409).json({
      error: "This item is out of stock. Try the £1 test stock product while we restock laptops.",
    });
  }

  if (!getTideLink(product.id)) {
    return res.status(503).json({
      error:
        `No Tide payment link for this item. In the Tide app create an Instant Checkout (or Payment Link) for £${(product.pricePence / 100).toFixed(2)}, then paste the URL into .env as ${envKeyForProduct(product.id)}=https://… and restart the server.`,
    });
  }

  if (quantity > 1) {
    // Instant Checkout links are typically fixed unit price / single sale
    return res.status(400).json({
      error:
        "Quantity must be 1 for Tide Instant Checkout links. Create a separate link or order if you need more units.",
    });
  }

  let order;
  try {
    const tideUrl = getTideLink(product.id);
    order = createPendingOrder({
      productId: product.id,
      productName: product.name,
      quantity,
      unitAmountPence: product.pricePence,
      currency: product.currency,
      tideCheckoutUrl: tideUrl,
    });
  } catch (err) {
    console.error("[orders] create pending failed:", err);
    return res.status(500).json({ error: "Could not create order" });
  }

  const url = buildCheckoutRedirectUrl(product.id, order.orderRef);
  const successUrl = `${BASE_URL}/success.html?order_ref=${encodeURIComponent(order.orderRef)}`;
  const cancelUrl = `${BASE_URL}/cancel.html?product=${encodeURIComponent(product.id)}&order_ref=${encodeURIComponent(order.orderRef)}`;

  console.log(
    "[tide] Checkout started",
    order.orderRef,
    product.id,
    "→ Tide link"
  );

  res.json({
    url,
    orderRef: order.orderRef,
    successUrl,
    cancelUrl,
    provider: "tide",
  });
});

/**
 * Confirm payment (source of truth for "paid" + WhatsApp).
 *
 * Tide does not publish a public card-payment webhook like Stripe.
 * Call this endpoint when you know the payment succeeded, e.g.:
 *  - Manually / from an ops script after you see the payment in Tide
 *  - From automation (Zapier, Make, n8n) if you connect bank/payment events
 *
 * Auth: header  Authorization: Bearer <TIDE_WEBHOOK_SECRET>
 *    or  X-Tide-Webhook-Secret: <TIDE_WEBHOOK_SECRET>
 *
 * Body JSON:
 * {
 *   "orderRef": "TYN-20260716-ABC123",
 *   "customerName": "Optional",
 *   "customerEmail": "optional@email.com",
 *   "amountPence": 41600,
 *   "paymentId": "optional tide reference"
 * }
 */
app.post("/api/webhooks/tide", async (req, res) => {
  if (!webhookSecretConfigured()) {
    return res.status(503).json({
      error:
        "TIDE_WEBHOOK_SECRET is not set in .env. Paste a long random secret, then send it as Authorization: Bearer …",
    });
  }

  if (!verifyWebhookAuth(req)) {
    return res.status(401).json({ error: "Invalid webhook secret" });
  }

  const status = String(req.body?.status || "paid").toLowerCase();
  if (status !== "paid" && status !== "completed" && status !== "success") {
    return res.json({ received: true, ignored: true, reason: "status not paid" });
  }

  try {
    const { order, alreadyPaid, error } = markPaidFromTide(req.body || {});

    if (error || !order) {
      return res.status(404).json({ error: error || "Order not found" });
    }

    if (alreadyPaid) {
      console.log("[orders] Already paid:", order.orderRef);
      return res.json({ received: true, orderRef: order.orderRef, alreadyPaid: true });
    }

    console.log("[orders] Marked paid (Tide):", order.orderRef);
    await sendWhatsAppForPaidOrder(order);

    res.json({ received: true, orderRef: order.orderRef, status: "paid" });
  } catch (err) {
    console.error("[orders] Tide webhook failed:", err);
    res.status(500).json({ error: "Order processing failed" });
  }
});

// Keep old path as alias so docs/bookmarks still work
app.post("/api/webhooks/stripe", (_req, res) => {
  res.status(410).json({
    error:
      "Stripe has been removed. Use POST /api/webhooks/tide with TIDE_WEBHOOK_SECRET.",
  });
});

/**
 * Public order lookup for success page (does not mark paid).
 */
app.get("/api/orders/:orderRef", (req, res) => {
  const order = findByOrderRef(req.params.orderRef);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json(publicOrderView(order));
});

// Static site
app.use(express.static(rootDir, { extensions: ["html"] }));

app.listen(PORT, () => {
  console.log(`Tyneside Technology listening on ${BASE_URL} (port ${PORT})`);
  console.log(`  Provider: Tide Instant Checkout / Payment Links`);
  console.log(`  Checkout: POST /api/create-checkout-session`);
  console.log(`  Confirm:  POST /api/webhooks/tide`);
  if (!isTideReady()) {
    console.warn(
      "[tide] No payment links in .env yet. Paste TIDE_LINK_T14S_… URLs from the Tide app."
    );
  } else {
    listConfiguredLinks()
      .filter((l) => l.configured)
      .forEach((l) => console.log(`  Link OK: ${l.productId} (${l.envKey})`));
  }
});

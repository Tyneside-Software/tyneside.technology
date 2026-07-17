/**
 * Meta WhatsApp Business Cloud API — free-form text notification.
 *
 * Required env (paste when ready; leave blank to skip send):
 *   WHATSAPP_TOKEN
 *   WHATSAPP_PHONE_NUMBER_ID
 *   WHATSAPP_TO          e.g. 447411949215
 *   WHATSAPP_API_VERSION optional, default v21.0
 */

function formatMoney(pence, currency = "gbp") {
  const amount = (Number(pence) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: (currency || "gbp").toUpperCase(),
    }).format(amount);
  } catch {
    return `£${amount.toFixed(2)}`;
  }
}

function buildOrderMessage(order) {
  const when = order.paidAt
    ? new Date(order.paidAt).toLocaleString("en-GB", {
        timeZone: "Europe/London",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });

  return [
    "✅ New Order Received",
    "",
    `Order reference: ${order.orderRef}`,
    `Customer name: ${order.customerName || "—"}`,
    `Customer email: ${order.customerEmail || "—"}`,
    `Laptop purchased: ${order.productName}`,
    `Quantity: ${order.quantity}`,
    `Total paid: ${formatMoney(order.totalPence, order.currency)}`,
    `Date and time: ${when}`,
  ].join("\n");
}

function isConfigured() {
  return Boolean(
    process.env.WHATSAPP_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_TO
  );
}

/**
 * Send business notification. Never throws — returns { ok, skipped?, error? }.
 */
async function notifyNewOrder(order) {
  if (!isConfigured()) {
    console.warn(
      "[whatsapp] Skipped — set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_TO in .env"
    );
    return { ok: false, skipped: true, error: "WhatsApp credentials not configured" };
  }

  const version = process.env.WHATSAPP_API_VERSION || "v21.0";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = String(process.env.WHATSAPP_TO).replace(/[^\d]/g, "");
  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: buildOrderMessage(order),
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg =
        data?.error?.message ||
        data?.error?.error_user_msg ||
        `HTTP ${res.status}`;
      console.error("[whatsapp] Send failed:", errMsg, data);
      return { ok: false, error: errMsg, response: data };
    }

    console.log("[whatsapp] Notification sent for", order.orderRef);
    return { ok: true, response: data };
  } catch (err) {
    console.error("[whatsapp] Request error:", err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { notifyNewOrder, buildOrderMessage, isConfigured };

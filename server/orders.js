const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, "[]\n", "utf8");
  }
}

function readOrders() {
  ensureStore();
  try {
    const raw = fs.readFileSync(ORDERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[orders] Failed to read store:", err.message);
    return [];
  }
}

function writeOrders(orders) {
  ensureStore();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2) + "\n", "utf8");
}

function generateOrderRef() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `TYN-${stamp}-${rand}`;
}

/**
 * Create a pending order when checkout starts.
 */
function createPendingOrder({
  productId,
  productName,
  quantity,
  unitAmountPence,
  currency,
  tideCheckoutUrl,
}) {
  const orders = readOrders();
  const order = {
    id: crypto.randomUUID(),
    orderRef: generateOrderRef(),
    status: "pending",
    productId,
    productName,
    quantity,
    unitAmountPence,
    totalPence: unitAmountPence * quantity,
    currency: currency || "gbp",
    customerName: null,
    customerEmail: null,
    paymentProvider: "tide",
    tideCheckoutUrl: tideCheckoutUrl || null,
    whatsappNotified: false,
    whatsappError: null,
    createdAt: new Date().toISOString(),
    paidAt: null,
  };
  orders.push(order);
  writeOrders(orders);
  return order;
}

function findByOrderRef(orderRef) {
  if (!orderRef) return null;
  return (
    readOrders().find(
      (o) => o.orderRef === orderRef || o.id === orderRef
    ) || null
  );
}

function updateOrder(orderId, patch) {
  const orders = readOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...patch, updatedAt: new Date().toISOString() };
  writeOrders(orders);
  return orders[idx];
}

/**
 * Mark paid from Tide confirmation webhook (or manual ops call).
 * Idempotent if already paid.
 *
 * payload: {
 *   orderRef: string (required),
 *   customerName?: string,
 *   customerEmail?: string,
 *   amountPence?: number,
 *   paymentId?: string,
 * }
 */
function markPaidFromTide(payload) {
  const orderRef = payload.orderRef || payload.order_ref || payload.ref;
  let order = findByOrderRef(orderRef);

  if (!order) {
    return { order: null, alreadyPaid: false, error: "Order not found" };
  }

  if (order.status === "paid") {
    return { order, alreadyPaid: true };
  }

  const customerName =
    payload.customerName ||
    payload.customer_name ||
    payload.name ||
    order.customerName ||
    "—";
  const customerEmail =
    payload.customerEmail ||
    payload.customer_email ||
    payload.email ||
    order.customerEmail ||
    "—";

  const totalPence =
    payload.amountPence != null
      ? Number(payload.amountPence)
      : payload.amount_pence != null
        ? Number(payload.amount_pence)
        : order.totalPence;

  const updated = updateOrder(order.id, {
    status: "paid",
    paidAt: new Date().toISOString(),
    customerName,
    customerEmail,
    totalPence,
    tidePaymentId: payload.paymentId || payload.payment_id || null,
    paymentProvider: "tide",
  });

  return { order: updated, alreadyPaid: false };
}

function publicOrderView(order) {
  if (!order) return null;
  return {
    orderRef: order.orderRef,
    status: order.status,
    productName: order.productName,
    productId: order.productId,
    quantity: order.quantity,
    totalPence: order.totalPence,
    currency: order.currency,
    customerEmail: order.customerEmail,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
  };
}

module.exports = {
  createPendingOrder,
  findByOrderRef,
  updateOrder,
  markPaidFromTide,
  readOrders,
  publicOrderView,
};

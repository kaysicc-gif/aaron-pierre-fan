/**
 * Aaron Pierre Official Fan Experience
 * Backend example – NOWPayments integration
 *
 * Features:
 *  - Create unique crypto invoices (BTC, ETH, USDT, SOL, etc.)
 *  - Receive IPN/webhook from NOWPayments
 *  - Keep orders in PENDING until real confirmation
 *  - Never stores card numbers, private keys, or seed phrases
 *
 * Setup:
 *  1. Copy .env.example → .env and fill in your keys
 *  2. npm install
 *  3. npm start
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------- Config ----------
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET; // from NOWPayments dashboard
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8765';
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || `http://localhost:${PORT}`;

// Simple file-based store for demo (replace with real DB in production)
const DATA_FILE = path.join(__dirname, 'orders.json');

function loadOrders() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load orders:', e.message);
  }
  return [];
}

function saveOrders(orders) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
}

// ---------- Middleware ----------
app.use(cors({ origin: true })); // tighten in production
app.use(express.json());

// ---------- Health ----------
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    nowpaymentsConfigured: Boolean(NOWPAYMENTS_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// ---------- Create NOWPayments Invoice ----------
/**
 * POST /api/create-nowpayments-invoice
 * Body: { orderId, amount, currency, tier, email, fullName }
 *
 * currency examples: btc, eth, usdttrc20, usdterc20, sol
 */
app.post('/api/create-nowpayments-invoice', async (req, res) => {
  try {
    if (!NOWPAYMENTS_API_KEY) {
      return res.status(503).json({
        error: 'NOWPayments API key not configured. Set NOWPAYMENTS_API_KEY in .env'
      });
    }

    const { orderId, amount, currency, tier, email, fullName } = req.body;

    if (!orderId || !amount || !currency) {
      return res.status(400).json({ error: 'orderId, amount and currency are required' });
    }

    // Create invoice via NOWPayments API
    // Docs: https://documenter.getpostman.com/view/7907941/S1a32n38
    const invoicePayload = {
      price_amount: Number(amount),
      price_currency: 'usd',
      pay_currency: currency.toLowerCase(), // e.g. btc, eth, usdttrc20
      order_id: orderId,
      order_description: `Aaron Pierre Fan Membership – ${tier || 'Membership'}`,
      ipn_callback_url: `${WEBHOOK_BASE_URL}/api/nowpayments-webhook`,
      success_url: `${FRONTEND_URL}/?payment=success&order=${orderId}`,
      cancel_url: `${FRONTEND_URL}/?payment=cancelled&order=${orderId}`,
      is_fixed_rate: false,
      is_fee_paid_by_user: false
    };

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoicePayload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('NOWPayments error:', result);
      return res.status(response.status).json({
        error: 'Failed to create invoice',
        details: result
      });
    }

    // Persist order (status stays PENDING until webhook confirms)
    const orders = loadOrders();
    const existingIdx = orders.findIndex(o => o.id === orderId);

    const orderRecord = {
      id: orderId,
      fullName: fullName || null,
      email: email || null,
      tier: tier || null,
      price: amount,
      paymentMethod: 'crypto',
      cryptoCoin: currency,
      status: 'PENDING',
      nowpaymentsInvoiceId: result.id,
      invoiceUrl: result.invoice_url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      orders[existingIdx] = { ...orders[existingIdx], ...orderRecord };
    } else {
      orders.push(orderRecord);
    }
    saveOrders(orders);

    // Return the invoice URL so the frontend can redirect the user
    res.json({
      success: true,
      orderId,
      invoice_url: result.invoice_url,
      invoice_id: result.id,
      status: 'PENDING'
    });
  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- NOWPayments IPN / Webhook ----------
/**
 * POST /api/nowpayments-webhook
 * NOWPayments sends payment status updates here.
 *
 * Important: Verify the signature with your IPN secret.
 * Never mark an order COMPLETED unless the payment is really finished.
 */
app.post('/api/nowpayments-webhook', express.json({ type: '*/*' }), (req, res) => {
  try {
    const payload = req.body;

    // Optional but recommended: verify IPN signature
    // NOWPayments sends x-nowpayments-sig header (HMAC SHA-512 of the sorted body)
    if (NOWPAYMENTS_IPN_SECRET) {
      const signature = req.headers['x-nowpayments-sig'];
      if (signature) {
        const sorted = JSON.stringify(payload, Object.keys(payload).sort());
        const hmac = crypto
          .createHmac('sha512', NOWPAYMENTS_IPN_SECRET)
          .update(sorted)
          .digest('hex');
        if (hmac !== signature) {
          console.warn('Invalid NOWPayments signature');
          return res.status(403).json({ error: 'Invalid signature' });
        }
      }
    }

    const orderId = payload.order_id;
    const paymentStatus = payload.payment_status; // waiting, confirming, confirmed, finished, failed, etc.
    const invoiceId = payload.invoice_id || payload.id;

    console.log(`Webhook received – order: ${orderId}, status: ${paymentStatus}`);

    if (!orderId) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    const orders = loadOrders();
    const idx = orders.findIndex(o => o.id === orderId);

    if (idx === -1) {
      // Still acknowledge so NOWPayments doesn't keep retrying forever
      console.warn('Order not found:', orderId);
      return res.status(200).json({ received: true, note: 'order not found locally' });
    }

    // Map NOWPayments statuses to our statuses
    // Docs: waiting | confirming | confirmed | sending | partially_paid | finished | failed | refunded | expired
    let newStatus = orders[idx].status;

    if (paymentStatus === 'finished' || paymentStatus === 'confirmed') {
      newStatus = 'VERIFIED'; // or COMPLETED – your choice
    } else if (paymentStatus === 'failed' || paymentStatus === 'expired' || paymentStatus === 'refunded') {
      newStatus = 'REJECTED';
    } else if (paymentStatus === 'waiting' || paymentStatus === 'confirming' || paymentStatus === 'partially_paid') {
      newStatus = 'PENDING';
    }

    orders[idx] = {
      ...orders[idx],
      status: newStatus,
      nowpaymentsStatus: paymentStatus,
      nowpaymentsInvoiceId: invoiceId || orders[idx].nowpaymentsInvoiceId,
      updatedAt: new Date().toISOString(),
      lastWebhook: payload
    };

    saveOrders(orders);

    // Here you would normally:
    // - Send the digital fan card email
    // - Notify admin
    // - Update a real database

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ---------- Simple order lookup (for admin or success page) ----------
app.get('/api/order/:orderId', (req, res) => {
  const orders = loadOrders();
  const order = orders.find(o => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Never return sensitive webhook raw data to the public
  const { lastWebhook, ...safe } = order;
  res.json(safe);
});

// ---------- List orders (protect this in production!) ----------
app.get('/api/orders', (req, res) => {
  // In production: add authentication (JWT, API key, basic auth, etc.)
  const orders = loadOrders();
  res.json(orders);
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Aaron Pierre Fan backend running on http://localhost:${PORT}`);
  console.log(`NOWPayments API key loaded: ${Boolean(NOWPAYMENTS_API_KEY)}`);
  console.log(`Webhook endpoint: ${WEBHOOK_BASE_URL}/api/nowpayments-webhook`);
});

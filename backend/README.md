# Aaron Pierre Fan Experience – Backend (NOWPayments)

Simple Node.js + Express backend that:

- Creates unique crypto payment invoices via **NOWPayments**
- Receives payment status webhooks (IPN)
- Keeps every order **PENDING** until real confirmation
- Never stores card data, private keys, or seed phrases

## Quick start

```bash
cd backend
cp .env.example .env
# Edit .env and add your NOWPayments API key + IPN secret

npm install
npm start
```

Server runs at `http://localhost:3001`.

## Environment variables

| Variable | Description |
|----------|-------------|
| `NOWPAYMENTS_API_KEY` | API key from NOWPayments dashboard |
| `NOWPAYMENTS_IPN_SECRET` | IPN secret for webhook signature verification |
| `PORT` | Backend port (default 3001) |
| `FRONTEND_URL` | Where the website is hosted |
| `WEBHOOK_BASE_URL` | Public URL of this backend (needed for IPN) |

## API endpoints

### `POST /api/create-nowpayments-invoice`

Creates a NOWPayments invoice and returns the payment URL.

**Body example:**
```json
{
  "orderId": "AP-XXXX",
  "amount": 2280,
  "currency": "btc",
  "tier": "Gold",
  "email": "fan@example.com",
  "fullName": "Jane Doe"
}
```

**Supported `currency` values (examples):**
- `btc`
- `eth`
- `usdttrc20`
- `usdterc20`
- `sol`

### `POST /api/nowpayments-webhook`

Receives payment status updates from NOWPayments.  
Verifies signature when `NOWPAYMENTS_IPN_SECRET` is set.

### `GET /api/order/:orderId`

Returns current status of an order (safe fields only).

### `GET /api/orders`

Lists all orders. **Protect this route in production.**

### `GET /api/health`

Simple health check.

## Frontend connection

In `script.js` the purchase form already contains the call pattern:

```js
const res = await fetch('http://localhost:3001/api/create-nowpayments-invoice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: data.id,
    amount: data.price,
    currency: data.cryptoCoin,
    tier: data.tier,
    email: data.email,
    fullName: data.fullName
  })
});
const result = await res.json();
if (result.invoice_url) {
  window.location.href = result.invoice_url;
}
```

Uncomment / adjust that block when the backend is running.

## Production checklist

- [ ] Use a real database instead of `orders.json`
- [ ] Protect `/api/orders` with authentication
- [ ] Set `WEBHOOK_BASE_URL` to a public HTTPS URL
- [ ] Enable IPN secret verification
- [ ] Restrict CORS to your frontend domain
- [ ] Add rate limiting
- [ ] Send email with digital fan card only after status becomes `VERIFIED` or `COMPLETED`

## Safety notes

- Orders stay **PENDING** until NOWPayments confirms payment.
- Never mark an order as paid on form submission alone.
- Never store private keys, seed phrases, or full card details.

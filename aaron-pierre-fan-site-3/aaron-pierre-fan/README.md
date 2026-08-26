# Aaron Pierre Official Fan Experience

Premium, mobile-first membership website for the official Aaron Pierre Fan Experience.

## What’s included

| Path | Description |
|------|-------------|
| `index.html` | Main membership site |
| `styles.css` | Cinematic black / gold styling |
| `script.js` | Forms, modal, crypto flow, copy buttons |
| `admin.html` | Lightweight order admin (password: `apfan2026`) |
| `legal.html` | Terms, Privacy, Payment Policy |
| `btc-qr.png` | QR code for authorized BTC address |
| `backend/` | Node.js + Express example for NOWPayments |

## Live site (GitHub Pages)

Once pushed to GitHub, enable **Settings → Pages → Deploy from branch `main` / root**.

The static frontend will be available at:
`https://<your-username>.github.io/<repo-name>/`

## Backend (NOWPayments)

GitHub Pages is static only — the Node.js backend must be hosted separately (Railway, Render, Fly.io, VPS, etc.).

See `backend/README.md` for setup.

## Local preview

Just open `index.html` in a browser, or:

```bash
npx serve .
```

## Payment notes

- **Direct Bitcoin**: authorized address + QR + copy button included
- **NOWPayments**: invoice flow prepared (requires API key + backend)
- Orders stay **PENDING** until real confirmation
- No card numbers, private keys, or seed phrases are stored

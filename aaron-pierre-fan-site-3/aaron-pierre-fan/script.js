document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');
  hamburger?.addEventListener('click', () => {
    nav.classList.toggle('open');
  });

  // Close mobile menu on link click
  nav?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => nav.classList.remove('open'));
  });

  // Accordion
  document.querySelectorAll('.accordion-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });

  // Tier selection & modal
  const modal = document.getElementById('purchaseModal');
  const modalClose = document.getElementById('modalClose');
  const summaryTier = document.getElementById('summaryTier');
  const summaryPrice = document.getElementById('summaryPrice');
  const summaryBenefits = document.getElementById('summaryBenefits');
  const previewName = document.getElementById('preview-name');
  const previewTier = document.getElementById('preview-tier');

  const tierBenefits = {
    bronze: [
      'Personalized digital fan membership card',
      'Member updates',
      'Exclusive fan content',
      'Fan community access'
    ],
    silver: [
      'Everything in Bronze',
      'Premium benefits',
      'Priority consideration for eligible opportunities',
      'Additional member content'
    ],
    gold: [
      'Everything in Silver',
      'VIP fan benefits',
      'Eligible premium experiences',
      'Priority consideration for eligible opportunities'
    ],
    platinum: [
      'Everything in Gold',
      'Elite membership status',
      'Premium opportunities',
      'Highest consideration for eligible experiences'
    ]
  };

  let selectedTier = null;
  let selectedPrice = null;
  let selectedName = null;

  document.querySelectorAll('.select-tier').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTier = btn.dataset.tier;
      selectedPrice = btn.dataset.price;
      selectedName = btn.dataset.name;

      summaryTier.textContent = selectedName.toUpperCase();
      summaryPrice.textContent = `$${Number(selectedPrice).toLocaleString()} / YEAR`;
      summaryBenefits.innerHTML = tierBenefits[selectedTier]
        .map(b => `<li>${b}</li>`)
        .join('');

      previewTier.textContent = selectedName;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    });
  });

  modalClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  // Payment method notes
  const paymentNotes = {
    card: document.getElementById('cardPaymentNote'),
    crypto: document.getElementById('cryptoNote'),
    'bitcoin-direct': document.getElementById('bitcoinDirectNote'),
    apple: document.getElementById('appleNote')
  };

  function showPaymentNote(value) {
    Object.keys(paymentNotes).forEach(key => {
      if (paymentNotes[key]) paymentNotes[key].hidden = key !== value;
    });
  }

  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', () => showPaymentNote(radio.value));
  });

  // Generic copy for any crypto address button
  document.querySelectorAll('.btn-copy[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.getAttribute('data-copy-target');
      const el = document.getElementById(targetId);
      const address = el?.textContent?.trim();
      if (!address) return;

      const originalText = btn.textContent;
      try {
        await navigator.clipboard.writeText(address);
        btn.textContent = 'Copied';
        btn.classList.add('copied');
      } catch (err) {
        const range = document.createRange();
        range.selectNode(el);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        btn.textContent = 'Copied';
        btn.classList.add('copied');
      }
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('copied');
      }, 2000);
    });
  });

  // Live name preview on card
  const fullNameInput = document.getElementById('fullName');
  fullNameInput?.addEventListener('input', () => {
    previewName.textContent = fullNameInput.value.trim() || 'Your Name';
  });

  // Purchase form
  const purchaseForm = document.getElementById('purchaseForm');
  const purchaseNote = document.getElementById('purchaseNote');

  purchaseForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(purchaseForm);
    const paymentMethod = formData.get('payment');
    const cryptoCoin = formData.get('crypto_coin') || null;

    const data = {
      id: 'AP-' + Date.now().toString(36).toUpperCase(),
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      country: formData.get('country'),
      tier: selectedName,
      price: selectedPrice,
      paymentMethod: paymentMethod,
      cryptoCoin: cryptoCoin,
      status: 'PENDING',
      date: new Date().toISOString()
    };

    // Store in localStorage (demo only – replace with real backend)
    const purchases = JSON.parse(localStorage.getItem('ap_purchases') || '[]');
    purchases.push(data);
    localStorage.setItem('ap_purchases', JSON.stringify(purchases));

    // Safety: never claim payment received
    purchaseNote.hidden = false;
    purchaseNote.style.color = 'var(--gold)';

    if (paymentMethod === 'crypto') {
      // ============================================================
      // NOWPayments integration point
      // ------------------------------------------------------------
      // In production, call your backend which then calls NOWPayments:
      //
      // POST https://api.nowpayments.io/v1/invoice
      // Headers: { 'x-api-key': YOUR_NOWPAYMENTS_API_KEY }
      // Body: {
      //   price_amount: data.price,
      //   price_currency: 'usd',
      //   pay_currency: data.cryptoCoin,   // e.g. 'btc', 'eth', 'usdttrc20'
      //   order_id: data.id,
      //   order_description: `Aaron Pierre Fan Membership - ${data.tier}`,
      //   ipn_callback_url: 'https://yourdomain.com/api/nowpayments-webhook',
      //   success_url: 'https://yourdomain.com/?payment=success',
      //   cancel_url: 'https://yourdomain.com/?payment=cancelled'
      // }
      //
      // Response contains invoice_url → redirect the user there.
      // ============================================================

      purchaseNote.textContent = `Order ${data.id} created (PENDING). A unique NOWPayments invoice for ${cryptoCoin?.toUpperCase() || 'crypto'} will be generated. Start the Node.js backend and uncomment the fetch below to redirect to the real invoice.`;

      // ----------------------------------------------------------
      // Enable this block when the backend is running:
      // ----------------------------------------------------------
      // const BACKEND_URL = 'http://localhost:3001'; // change in production
      // try {
      //   const res = await fetch(`${BACKEND_URL}/api/create-nowpayments-invoice`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //       orderId: data.id,
      //       amount: data.price,
      //       currency: data.cryptoCoin,
      //       tier: data.tier,
      //       email: data.email,
      //       fullName: data.fullName
      //     })
      //   });
      //   const result = await res.json();
      //   if (result.invoice_url) {
      //     window.location.href = result.invoice_url;
      //     return;
      //   }
      //   purchaseNote.textContent = result.error || 'Unable to create payment invoice.';
      // } catch (err) {
      //   console.error(err);
      //   purchaseNote.textContent = 'Unable to reach payment server. Please try again or use Direct Bitcoin.';
      // }

    } else if (paymentMethod === 'bitcoin-direct') {
      purchaseNote.textContent = `Order ${data.id} submitted (PENDING). Please send the exact amount in BTC to the authorized address shown above. Your membership will be activated only after the payment is confirmed on the blockchain and verified by the team.`;
    } else if (paymentMethod === 'card') {
      purchaseNote.textContent = `Order ${data.id} submitted (PENDING). In production you would now be redirected to a secure Stripe Checkout. You will receive confirmation once payment is completed.`;
      // Placeholder: window.location.href = stripeCheckoutUrl;
    } else {
      purchaseNote.textContent = `Order ${data.id} submitted and is PENDING verification. You will receive an email once payment is confirmed and your digital fan card is issued.`;
    }

    // Do not reset the form immediately for crypto/direct so user can still see the address/QR
    if (paymentMethod !== 'bitcoin-direct' && paymentMethod !== 'crypto') {
      purchaseForm.reset();
      previewName.textContent = 'Your Name';
    }
  });

  // Contact form
  const contactForm = document.getElementById('contactForm');
  const contactNote = document.getElementById('contactNote');

  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    contactNote.hidden = false;
    contactNote.textContent = 'Message received. Our team will respond as soon as possible.';
    contactForm.reset();
  });
});

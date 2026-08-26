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
    bitcoin: document.getElementById('bitcoinNote'),
    ethereum: document.getElementById('ethereumNote'),
    usdt: document.getElementById('usdtNote'),
    solana: document.getElementById('solanaNote'),
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

  purchaseForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(purchaseForm);
    const data = {
      id: 'AP-' + Date.now().toString(36).toUpperCase(),
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      country: formData.get('country'),
      tier: selectedName,
      price: selectedPrice,
      paymentMethod: formData.get('payment'),
      status: 'PENDING',
      date: new Date().toISOString()
    };

    // Store in localStorage (demo only – replace with real backend)
    const purchases = JSON.parse(localStorage.getItem('ap_purchases') || '[]');
    purchases.push(data);
    localStorage.setItem('ap_purchases', JSON.stringify(purchases));

    // Safety: never claim payment received
    purchaseNote.hidden = false;
    purchaseNote.textContent = `Thank you. Your membership request (${data.id}) has been submitted and is PENDING verification. You will receive an email once payment is confirmed and your digital fan card is issued. Do not assume payment has been processed until you receive official confirmation.`;
    purchaseNote.style.color = 'var(--gold)';

    purchaseForm.reset();
    previewName.textContent = 'Your Name';

    // In production: redirect to Stripe Checkout or show Bitcoin instructions securely
    if (data.paymentMethod === 'card') {
      // Placeholder for Stripe redirect
      console.log('Would redirect to Stripe Checkout with tier:', data.tier, 'amount:', data.price);
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

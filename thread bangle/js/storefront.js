/* ================================================================
   STOREFRONT LOGIC — Thread Bangle Platform
   ================================================================ */
// ── State ────────────────────────────────────────────────────────
const state = {
  currentStep: 0,
  totalSteps: 5,
  selectedSize: null,
  selectedDesign: null,
  selectedBeads: [],     // array of bead objects
  referenceImageFile: null,
  referenceImageUrl: null,
  uploadedImageFirebaseUrl: null,
  customerName: '',
  customerPhone: '',
  customerNotes: '',
  basePrice: 149,
  currency: '₹',
  inventory: {
    sizes: [],
    designs: [],
    beads: []
  }
};
// ── Utilities ─────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(60px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
function scrollToCustomizer() {
  document.getElementById('customizer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function formatPrice(amount) {
  return `${state.currency}${Math.round(amount)}`;
}
function calcTotal() {
  let total = state.basePrice;
  if (state.selectedDesign) {
    total = state.selectedDesign.basePrice || state.basePrice;
  }
  for (const bead of state.selectedBeads) {
    total += (bead.addonPrice || 0);
  }
  return total;
}
function updatePriceBar() {
  const total = calcTotal();
  const bar = document.getElementById('price-bar');
  const amount = document.getElementById('price-bar-amount');
  const beadsLabel = document.getElementById('price-bar-beads');
  if (state.selectedDesign || state.selectedBeads.length > 0) {
    bar.classList.add('visible');
    amount.textContent = formatPrice(total);
    if (state.selectedBeads.length > 0) {
      beadsLabel.textContent = `+ ${state.selectedBeads.map(b => b.title).join(', ')}`;
    } else {
      beadsLabel.textContent = '';
    }
  } else {
    bar.classList.remove('visible');
  }
}
// ── Inventory Loading ─────────────────────────────────────────────
async function loadInventory() {
  if (DEMO_MODE) {
    state.inventory = {
      sizes:   DEMO_INVENTORY.sizes.filter(s => s.inStock),
      designs: DEMO_INVENTORY.designs.filter(d => d.inStock),
      beads:   DEMO_INVENTORY.beads,   // show all beads (OOS flagged on card)
    };
    state.basePrice = DEMO_PRICING.basePrice;
    state.currency  = DEMO_PRICING.currency;
    renderAll();
    return;
  }
  try {
    // Load pricing config
    const pricingDoc = await db.collection('pricing').doc('config').get();
    if (pricingDoc.exists) {
      const pd = pricingDoc.data();
      state.basePrice = pd.basePrice || 149;
      state.currency  = pd.currency  || '₹';
    }
    // Load inventory collections in parallel
    const [sizesSnap, designsSnap, beadsSnap] = await Promise.all([
      db.collection('inventory').doc('sizes').collection('items').orderBy('order').get(),
      db.collection('inventory').doc('designs').collection('items').orderBy('order').get(),
      db.collection('inventory').doc('beads').collection('items').orderBy('order').get(),
    ]);
    state.inventory.sizes   = sizesSnap.docs.map(d  => ({ id: d.id, ...d.data() }));
    state.inventory.designs = designsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.inventory.beads   = beadsSnap.docs.map(d  => ({ id: d.id, ...d.data() }));
    // Set up real-time listener for pricing
    db.collection('pricing').doc('config').onSnapshot(snap => {
      if (snap.exists) {
        const pd = snap.data();
        state.basePrice = pd.basePrice || state.basePrice;
        state.currency  = pd.currency  || state.currency;
        updatePriceBar();
      }
    });
    renderAll();
  } catch (err) {
    console.error('Inventory load error:', err);
    showToast('Could not load inventory. Showing demo data.', 'warning');
    state.inventory = {
      sizes:   DEMO_INVENTORY.sizes,
      designs: DEMO_INVENTORY.designs,
      beads:   DEMO_INVENTORY.beads,
    };
    renderAll();
  }
}
// ── Render Grids ──────────────────────────────────────────────────
function buildItemCard(item, category, isSelected, isMultiSelected) {
  const oos = !item.inStock;
  let selectedClass = isSelected ? 'selected' : (isMultiSelected ? 'multi-selected' : '');
  let oosClass = oos ? 'out-of-stock' : '';
  // Image or gradient placeholder
  let imgHtml = '';
  if (item.imageUrl) {
    // The onerror hides the broken <img> and reveals the placeholder below it
    imgHtml = `
      <img
        src="${item.imageUrl}"
        alt="${item.title}"
        class="item-card-img"
        loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
      >
      <div class="item-card-placeholder" style="background:${item.gradient || 'var(--cream-dark)'};display:none">
        <span style="font-size:2.4rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.15))">${item.emoji || '🔮'}</span>
      </div>`;
  } else {
    imgHtml = `
      <div class="item-card-placeholder" style="background:${item.gradient || 'var(--cream-dark)'}">
        <span style="font-size:2.4rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.15))">${item.emoji || '🔮'}</span>
      </div>`;
  }
  // Price label
  let priceHtml = '';
  if (category === 'designs') {
    priceHtml = `<div class="item-card-price">${formatPrice(item.basePrice || state.basePrice)}</div>`;
  } else if (category === 'beads' && item.addonPrice) {
    priceHtml = `<div class="item-card-price"><span class="addon">+${formatPrice(item.addonPrice)}</span></div>`;
  }
  const clickFn = category === 'sizes'   ? `selectSize('${item.id}')` :
                  category === 'designs' ? `selectDesign('${item.id}')` :
                                           `toggleBead('${item.id}')`;
  return `
    <div class="item-card ${selectedClass} ${oosClass}" id="card-${item.id}" onclick="${clickFn}">
      ${imgHtml}
      <div class="item-card-check">✓</div>
      ${oos ? '<div class="item-oos-tag">Out of Stock</div>' : ''}
      <div class="item-card-body">
        <div class="item-card-title">${item.title}</div>
        ${item.subtitle ? `<div class="item-card-subtitle">${item.subtitle}</div>` : ''}
        ${priceHtml}
      </div>
    </div>`;
}
function renderSizes() {
  const grid = document.getElementById('size-grid');
  if (!state.inventory.sizes.length) {
    grid.innerHTML = `<div class="grid-loading"><span style="font-size:2rem">😢</span>No sizes available right now.</div>`;
    return;
  }
  grid.innerHTML = state.inventory.sizes
    .map(s => buildItemCard(s, 'sizes', state.selectedSize?.id === s.id, false))
    .join('');
}
function renderDesigns() {
  const grid = document.getElementById('design-grid');
  if (!state.inventory.designs.length) {
    grid.innerHTML = `<div class="grid-loading"><span style="font-size:2rem">😢</span>No designs available right now.</div>`;
    return;
  }
  grid.innerHTML = state.inventory.designs
    .map(d => buildItemCard(d, 'designs', state.selectedDesign?.id === d.id, false))
    .join('');
}
function renderBeads() {
  const grid = document.getElementById('bead-grid');
  if (!state.inventory.beads.length) {
    grid.innerHTML = `<div class="grid-loading"><span style="font-size:2rem">😢</span>No beads available right now.</div>`;
    return;
  }
  const selectedIds = state.selectedBeads.map(b => b.id);
  grid.innerHTML = state.inventory.beads
    .map(b => buildItemCard(b, 'beads', false, selectedIds.includes(b.id)))
    .join('');
}
function renderAll() {
  renderSizes();
  renderDesigns();
  renderBeads();
  updatePriceBar();
}
// ── Selection Handlers ────────────────────────────────────────────
function selectSize(id) {
  state.selectedSize = state.inventory.sizes.find(s => s.id === id) || null;
  renderSizes();
}
function selectDesign(id) {
  state.selectedDesign = state.inventory.designs.find(d => d.id === id) || null;
  renderDesigns();
  updatePriceBar();
}
function toggleBead(id) {
  const bead = state.inventory.beads.find(b => b.id === id);
  if (!bead || !bead.inStock) return;
  const idx = state.selectedBeads.findIndex(b => b.id === id);
  if (idx > -1) {
    state.selectedBeads.splice(idx, 1);
  } else {
    state.selectedBeads.push(bead);
  }
  renderBeads();
  updatePriceBar();
}
// ── Wizard Navigation ─────────────────────────────────────────────
function goToStep(stepIndex) {
  // Guard: can only go forward if current step is completed
  if (stepIndex > state.currentStep) {
    if (!validateStep(state.currentStep)) return;
  }
  // Update DOM
  document.querySelectorAll('.wizard-step').forEach((el, i) => {
    el.classList.toggle('active', i === stepIndex);
  });
  // Update progress bubbles
  const steps = document.querySelectorAll('.progress-step');
  steps.forEach((el, i) => {
    el.classList.remove('active', 'done', 'disabled');
    if (i < stepIndex)       el.classList.add('done');
    else if (i === stepIndex) el.classList.add('active');
    else                      el.classList.add('disabled');
  });
  // Update connectors
  for (let i = 0; i < 4; i++) {
    const conn = document.getElementById(`conn-${i}`);
    if (conn) conn.classList.toggle('done', i < stepIndex);
  }
  // Nav buttons
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  prevBtn.style.display = stepIndex === 0 ? 'none' : '';
  if (stepIndex === 4) {
    nextBtn.style.display = 'none';
    buildSummary();
    // Log order to Firestore
    logOrderToFirestore();
  } else {
    nextBtn.style.display = '';
    nextBtn.textContent = stepIndex === 3 ? 'Review Order →' : 'Continue →';
  }
  document.getElementById('step-indicator').textContent = `Step ${stepIndex + 1} of ${state.totalSteps}`;
  state.currentStep = stepIndex;
  // Smooth scroll to wizard
  document.getElementById('customizer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function nextStep() {
  if (!validateStep(state.currentStep)) return;
  if (state.currentStep < state.totalSteps - 1) {
    goToStep(state.currentStep + 1);
  }
}
function prevStep() {
  if (state.currentStep > 0) {
    goToStep(state.currentStep - 1);
  }
}
function validateStep(step) {
  if (step === 0 && !state.selectedSize) {
    showToast('Please select a bangle size to continue.', 'warning');
    return false;
  }
  if (step === 1 && !state.selectedDesign) {
    showToast('Please choose a design pattern to continue.', 'warning');
    return false;
  }
  // Step 2 (beads): optional, always pass
  // Step 3 (upload): optional, collect inputs
  if (step === 3) {
    state.customerName  = document.getElementById('customer-name').value.trim();
    state.customerPhone = document.getElementById('customer-phone').value.trim();
    state.customerNotes = document.getElementById('customer-notes').value.trim();
  }
  return true;
}
// ── Upload Reference Image ────────────────────────────────────────
const refImageInput = document.getElementById('ref-image-input');
refImageInput?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    showToast('Image too large. Please upload a file under 10MB.', 'error');
    return;
  }
  state.referenceImageFile = file;
  // Show local preview immediately
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById('upload-preview');
    const img = document.getElementById('upload-preview-img');
    img.src = ev.target.result;
    state.referenceImageUrl = ev.target.result; // fallback
    preview.classList.add('visible');
  };
  reader.readAsDataURL(file);
  // Upload to Firebase Storage
  if (FIREBASE_READY) {
    await uploadReferenceImage(file);
  }
});
// Drag & drop
const uploadArea = document.getElementById('upload-area');
uploadArea?.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea?.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    refImageInput.files = dt.files;
    refImageInput.dispatchEvent(new Event('change'));
  }
});
async function uploadReferenceImage(file) {
  if (!FIREBASE_READY) return;
  const progressWrap = document.getElementById('upload-progress');
  const progressBar  = document.getElementById('upload-progress-bar');
  progressWrap.classList.add('active');
  try {
    const ref = storage.ref(`reference-images/${Date.now()}_${file.name}`);
    const task = ref.put(file);
    task.on('state_changed',
      (snap) => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        progressBar.style.width = pct + '%';
      },
      (err) => {
        console.error('Upload error:', err);
        showToast('Image upload failed. We will use your local image.', 'warning');
        progressWrap.classList.remove('active');
      },
      async () => {
        state.uploadedImageFirebaseUrl = await task.snapshot.ref.getDownloadURL();
        showToast('Reference image uploaded! ✅', 'success');
        progressWrap.classList.remove('active');
      }
    );
  } catch (err) {
    console.error(err);
    progressWrap.classList.remove('active');
  }
}
function clearUpload() {
  state.referenceImageFile = null;
  state.referenceImageUrl = null;
  state.uploadedImageFirebaseUrl = null;
  document.getElementById('upload-preview').classList.remove('visible');
  document.getElementById('ref-image-input').value = '';
}
// ── Order Summary ─────────────────────────────────────────────────
function buildSummary() {
  const total = calcTotal();
  const beadNames = state.selectedBeads.map(b => `${b.emoji || '💎'} ${b.title} (+${formatPrice(b.addonPrice)})`).join('\n') || '—';
  const summaryEl = document.getElementById('order-summary');
  summaryEl.innerHTML = `
    <div class="summary-row">
      <div class="summary-label">📏 Bangle Size</div>
      <div class="summary-value">${state.selectedSize?.title} <span style="opacity:0.5;font-size:12px">${state.selectedSize?.subtitle || ''}</span></div>
    </div>
    <div class="summary-row">
      <div class="summary-label">🎨 Design Pattern</div>
      <div class="summary-value">${state.selectedDesign?.title} — ${formatPrice(state.selectedDesign?.basePrice || state.basePrice)}</div>
    </div>
    <div class="summary-row">
      <div class="summary-label">💎 Beads Added</div>
      <div class="summary-value">${state.selectedBeads.length > 0
        ? state.selectedBeads.map(b => `${b.emoji || '💎'} ${b.title} (+${formatPrice(b.addonPrice)})`).join('<br>')
        : '<span style="opacity:0.5">None selected</span>'
      }</div>
    </div>
    ${state.customerName ? `<div class="summary-row">
      <div class="summary-label">👤 Customer Name</div>
      <div class="summary-value">${state.customerName}</div>
    </div>` : ''}
    ${state.customerNotes ? `<div class="summary-row">
      <div class="summary-label">📝 Notes</div>
      <div class="summary-value" style="max-width:200px;text-align:right">${state.customerNotes}</div>
    </div>` : ''}
    ${state.referenceImageFile ? `<div class="summary-row">
      <div class="summary-label">📸 Reference</div>
      <div class="summary-value"><img src="${state.referenceImageUrl}" style="height:60px;border-radius:8px;margin-left:auto;display:block" alt="Ref"></div>
    </div>` : ''}
    <div class="summary-row total">
      <div class="summary-total-label">💰 Estimated Total</div>
      <div class="summary-total-price">${formatPrice(total)}</div>
    </div>
  `;
}
// ── WhatsApp Checkout ─────────────────────────────────────────────
async function confirmViaWhatsApp() {
  const total = calcTotal();
  const beadsList = state.selectedBeads.length > 0
    ? state.selectedBeads.map(b => `  • ${b.title} (+${formatPrice(b.addonPrice)})`).join('\n')
    : '  • None';
  const imgLine = state.uploadedImageFirebaseUrl
    ? `\n📸 *Reference Image:* ${state.uploadedImageFirebaseUrl}`
    : (state.referenceImageFile ? '\n📸 *Reference Image:* [will be shared separately]' : '');
  const message = `🌸 *New Custom Bangle Order* 🌸
━━━━━━━━━━━━━━━━━━━━━━━━
📏 *Bangle Size:* ${state.selectedSize?.title} (${state.selectedSize?.subtitle || ''})
🎨 *Design Pattern:* ${state.selectedDesign?.title}
💎 *Beads & Embellishments:*
${beadsList}
${state.customerName ? `👤 *Name:* ${state.customerName}` : ''}
${state.customerPhone ? `📱 *WhatsApp:* ${state.customerPhone}` : ''}
${state.customerNotes ? `📝 *Notes:* ${state.customerNotes}` : ''}
${imgLine}
━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Estimated Total: ${formatPrice(total)}*
Thank you for your order! I look forward to crafting this for you 🙏`;
  const encodedMessage = encodeURIComponent(message);
  const number = WHATSAPP_NUMBER;
  const url = `https://wa.me/${number}?text=${encodedMessage}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  showToast('Opening WhatsApp... 🎉', 'success');
}
// ── Log Order to Firestore ────────────────────────────────────────
async function logOrderToFirestore() {
  if (!FIREBASE_READY) return;
  try {
    const order = {
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      size:      state.selectedSize?.title  || '',
      sizeId:    state.selectedSize?.id     || '',
      design:    state.selectedDesign?.title || '',
      designId:  state.selectedDesign?.id   || '',
      beads:     state.selectedBeads.map(b => ({ id: b.id, title: b.title, price: b.addonPrice })),
      notes:     state.customerNotes,
      customerName:  state.customerName,
      customerPhone: state.customerPhone,
      referenceImageUrl: state.uploadedImageFirebaseUrl || '',
      totalPrice: calcTotal(),
      status: 'new',
    };
    await db.collection('orders').add(order);
  } catch (err) {
    console.error('Failed to log order:', err);
  }
}
// ── Apply Settings from Firestore ─────────────────────────────────
async function applyLiveSettings() {
  if (!FIREBASE_READY) return;
  try {
    const settingsDoc = await db.collection('settings').doc('business').get();
    if (settingsDoc.exists) {
      const s = settingsDoc.data();
      if (s.businessName) {
        document.querySelectorAll('#header-brand-name, #footer-brand').forEach(el => {
          if (el) el.textContent = s.businessName;
        });
        document.title = `${s.businessName} — Custom Thread Bangles`;
      }
      if (s.whatsappNumber) {
        // Overrides the config file value
        window._liveWhatsapp = s.whatsappNumber;
      }
    }
  } catch (e) { /* non-critical */ }
}
// ── WhatsApp header button ────────────────────────────────────────
function updateHeaderWhatsApp() {
  const btn = document.getElementById('header-whatsapp-btn');
  if (btn) btn.href = `https://wa.me/${WHATSAPP_NUMBER}`;
}
// ── Init ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  updateHeaderWhatsApp();
  applyLiveSettings();
  loadInventory();
  if (DEMO_MODE) {
    showToast('Running in Demo Mode — add your Firebase config to go live!', 'warning', 6000);
  }
});

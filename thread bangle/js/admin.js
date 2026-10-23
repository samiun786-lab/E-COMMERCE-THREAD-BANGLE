/* ================================================================
   ADMIN DASHBOARD LOGIC — Thread Bangle Platform
   ================================================================ */
// ── Panel Navigation ──────────────────────────────────────────────
function switchPanel(name) {
  // Hide all panels
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  // Deactivate all nav items
  document.querySelectorAll('.sidebar-nav-item').forEach(n => n.classList.remove('active'));
  // Show selected
  const panel = document.getElementById(`panel-${name}`);
  if (panel) panel.classList.add('active');
  const navItem = document.querySelector(`[data-panel="${name}"]`);
  if (navItem) navItem.classList.add('active');
  // Lazy-load panel data
  if (name === 'pricing') buildPricingPanel();
  if (name === 'orders')  loadOrders();
  if (name === 'settings') loadSettings();
}
// ── Admin Inventory Data ──────────────────────────────────────────
let adminInventory = { sizes: [], designs: [], beads: [] };
let unsubscribers = [];
// Start real-time listeners for all inventory
function startInventoryListeners() {
  if (DEMO_MODE) {
    // Load demo data into admin view
    adminInventory = {
      sizes:   [...DEMO_INVENTORY.sizes],
      designs: [...DEMO_INVENTORY.designs],
      beads:   [...DEMO_INVENTORY.beads],
    };
    renderAdminSizes();
    renderAdminDesigns();
    renderAdminBeads();
    updateStats();
    return;
  }
  const collections = ['sizes', 'designs', 'beads'];
  collections.forEach(col => {
    const unsub = db.collection('inventory').doc(col).collection('items')
      .orderBy('order')
      .onSnapshot(snap => {
        adminInventory[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (col === 'sizes')   renderAdminSizes();
        if (col === 'designs') renderAdminDesigns();
        if (col === 'beads')   renderAdminBeads();
        updateStats();
        buildPricingPanel(); // refresh pricing lists
      }, err => {
        console.error(`Listener error for ${col}:`, err);
        showToast(`Failed to load ${col} data.`, 'error');
      });
    unsubscribers.push(unsub);
  });
  // Orders count listener
  db.collection('orders').onSnapshot(snap => {
    const badge = document.getElementById('orders-badge');
    const statOrders = document.getElementById('stat-orders');
    const count = snap.size;
    if (statOrders) statOrders.textContent = count;
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  });
}
function updateStats() {
  const el = (id) => document.getElementById(id);
  if (el('stat-sizes'))   el('stat-sizes').textContent   = adminInventory.sizes.length;
  if (el('stat-designs')) el('stat-designs').textContent = adminInventory.designs.length;
  if (el('stat-beads'))   el('stat-beads').textContent   = adminInventory.beads.length;
}
// ── Admin Item Card Builder ────────────────────────────────────────
function buildAdminCard(item, collection) {
  const priceField = collection === 'sizes'   ? '' :
                     collection === 'designs' ? `basePrice` : `addonPrice`;
  const priceLabel = collection === 'designs' ? 'Base Price' : 'Add-on Price';
  const priceVal   = item[priceField] || 0;
  const showPrice  = collection !== 'sizes';
  const imgHtml = item.imageUrl
    ? `<img src="${item.imageUrl}" alt="${item.title}" class="admin-item-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <div class="admin-item-placeholder" style="background:${item.gradient || '#1A1D2E'};display:none"><span>${item.emoji || '📦'}</span></div>`
    : `<div class="admin-item-placeholder" style="background:${item.gradient || '#1A1D2E'}"><span>${item.emoji || '📦'}</span></div>`;
  return `
    <div class="admin-item-card" id="acard-${item.id}">
      <div class="admin-item-img-wrap">
        ${imgHtml}
        <div class="admin-item-overlay">
          <button class="admin-item-action-btn edit"   onclick="openEditModal('${collection}','${item.id}')" title="Edit">✏️</button>
          <button class="admin-item-action-btn delete" onclick="openDeleteModal('${collection}','${item.id}','${escapeStr(item.title)}')" title="Delete">🗑</button>
        </div>
      </div>
      <div class="admin-item-body">
        <div class="admin-item-title">${item.title}</div>
        <div class="admin-item-meta">${item.subtitle || ''}</div>
        <div class="admin-item-footer">
          <div class="toggle-wrap">
            <label class="toggle" title="${item.inStock ? 'In Stock' : 'Out of Stock'}">
              <input type="checkbox" ${item.inStock ? 'checked' : ''}
                onchange="toggleStock('${collection}','${item.id}',this.checked)">
              <div class="toggle-track"></div>
            </label>
            <span class="toggle-label" id="stock-label-${item.id}">${item.inStock ? 'In Stock' : 'Out of Stock'}</span>
          </div>
          ${showPrice ? `
          <input
            type="number"
            class="admin-price-input"
            value="${priceVal}"
            min="0"
            step="1"
            title="${priceLabel} (₹)"
            onchange="updateItemPrice('${collection}','${item.id}','${priceField}',this.value)"
          >` : ''}
        </div>
      </div>
    </div>`;
}
function escapeStr(str) {
  return String(str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}
function renderAdminSizes() {
  const grid = document.getElementById('admin-sizes-grid');
  if (!grid) return;
  const cards = adminInventory.sizes.map(s => buildAdminCard(s, 'sizes')).join('');
  const addBtn = `<div class="add-item-card" onclick="openAddModal('sizes')"><div class="add-item-icon">➕</div>Add Size</div>`;
  grid.innerHTML = cards + addBtn;
}
function renderAdminDesigns() {
  const grid = document.getElementById('admin-designs-grid');
  if (!grid) return;
  const cards = adminInventory.designs.map(d => buildAdminCard(d, 'designs')).join('');
  const addBtn = `<div class="add-item-card" onclick="openAddModal('designs')"><div class="add-item-icon">➕</div>Add Design</div>`;
  grid.innerHTML = cards + addBtn;
}
function renderAdminBeads() {
  const grid = document.getElementById('admin-beads-grid');
  if (!grid) return;
  const cards = adminInventory.beads.map(b => buildAdminCard(b, 'beads')).join('');
  const addBtn = `<div class="add-item-card" onclick="openAddModal('beads')"><div class="add-item-icon">➕</div>Add Bead</div>`;
  grid.innerHTML = cards + addBtn;
}
// ── Stock Toggle ──────────────────────────────────────────────────
async function toggleStock(collection, id, inStock) {
  const label = document.getElementById(`stock-label-${id}`);
  if (label) label.textContent = inStock ? 'In Stock' : 'Out of Stock';
  if (DEMO_MODE) {
    const item = adminInventory[collection].find(i => i.id === id);
    if (item) item.inStock = inStock;
    showToast(`Updated — connect Firebase to persist changes.`, 'warning', 3000);
    return;
  }
  try {
    await db.collection('inventory').doc(collection).collection('items').doc(id).update({ inStock });
    showToast(inStock ? '✅ Item marked In Stock' : '🚫 Item marked Out of Stock', 'success');
  } catch (err) {
    showToast('Failed to update stock status.', 'error');
    console.error(err);
  }
}
// ── Price Update (inline) ─────────────────────────────────────────
async function updateItemPrice(collection, id, field, value) {
  const price = parseFloat(value) || 0;
  if (DEMO_MODE) {
    const item = adminInventory[collection].find(i => i.id === id);
    if (item) item[field] = price;
    return;
  }
  try {
    await db.collection('inventory').doc(collection).collection('items').doc(id).update({ [field]: price });
    showToast('Price updated ✅', 'success', 2000);
  } catch (err) {
    showToast('Failed to update price.', 'error');
    console.error(err);
  }
}
// ── Add / Edit Modal ──────────────────────────────────────────────
let currentModalType = null;
let currentModalId   = null;
let modalUploadedImageUrl = null;
function openAddModal(type) {
  currentModalType = type;
  currentModalId   = null;
  modalUploadedImageUrl = null;
  document.getElementById('item-modal-title').textContent = `Add New ${capitalize(type.slice(0,-1))}`;
  document.getElementById('item-modal-type').value = type;
  document.getElementById('item-modal-id').value = '';
  document.getElementById('item-modal-name').value = '';
  document.getElementById('item-modal-subtitle').value = '';
  document.getElementById('item-modal-price').value = '';
  document.getElementById('item-modal-instock').checked = true;
  // Reset URL image field and all preview states
  document.getElementById('item-modal-image-url').value = '';
  document.getElementById('modal-img-preview').style.display    = 'none';
  document.getElementById('modal-img-loading').style.display    = 'none';
  document.getElementById('modal-img-error').style.display      = 'none';
  // Adjust price label
  const priceGroup = document.getElementById('price-group');
  const priceLabel = document.getElementById('price-label');
  if (type === 'sizes') {
    priceGroup.style.display = 'none';
  } else {
    priceGroup.style.display = '';
    priceLabel.textContent = type === 'designs' ? 'Base Price (₹)' : 'Add-on Price (₹)';
  }
  document.getElementById('item-modal-submit-text').textContent = 'Add Item';
  document.getElementById('item-modal-overlay').classList.add('active');
}
function openEditModal(type, id) {
  const item = adminInventory[type].find(i => i.id === id);
  if (!item) return;
  currentModalType = type;
  currentModalId   = id;
  modalUploadedImageUrl = item.imageUrl || null;
  document.getElementById('item-modal-title').textContent = `Edit ${capitalize(type.slice(0,-1))}`;
  document.getElementById('item-modal-type').value = type;
  document.getElementById('item-modal-id').value = id;
  document.getElementById('item-modal-name').value = item.title || '';
  document.getElementById('item-modal-subtitle').value = item.subtitle || '';
  document.getElementById('item-modal-instock').checked = !!item.inStock;
  const priceField = type === 'designs' ? 'basePrice' : 'addonPrice';
  document.getElementById('item-modal-price').value = item[priceField] || '';
  const priceGroup = document.getElementById('price-group');
  const priceLabel = document.getElementById('price-label');
  if (type === 'sizes') {
    priceGroup.style.display = 'none';
  } else {
    priceGroup.style.display = '';
    priceLabel.textContent = type === 'designs' ? 'Base Price (₹)' : 'Add-on Price (₹)';
  }
  // Populate the URL input and reset preview states
  const urlInput = document.getElementById('item-modal-image-url');
  urlInput.value = item.imageUrl || '';
  document.getElementById('modal-img-loading').style.display = 'none';
  document.getElementById('modal-img-error').style.display   = 'none';
  const previewWrap = document.getElementById('modal-img-preview');
  const previewImg  = document.getElementById('modal-img-preview-img');
  if (item.imageUrl) {
    previewImg.src = item.imageUrl;
    previewWrap.style.display = 'block';
  } else {
    previewWrap.style.display = 'none';
  }
  document.getElementById('item-modal-submit-text').textContent = 'Save Changes';
  document.getElementById('item-modal-overlay').classList.add('active');
}
function closeItemModal(event) {
  if (event && event.target !== document.getElementById('item-modal-overlay')) return;
  document.getElementById('item-modal-overlay').classList.remove('active');
}
// ── URL Image Preview (live, debounced) ──────────────────────────
let _imgPreviewTimer = null;
function onImageUrlInput(rawUrl) {
  const url = rawUrl.trim();
  const loadingEl = document.getElementById('modal-img-loading');
  const previewEl = document.getElementById('modal-img-preview');
  const previewImg = document.getElementById('modal-img-preview-img');
  const errorEl   = document.getElementById('modal-img-error');
  // Reset states
  loadingEl.style.display = 'none';
  previewEl.style.display = 'none';
  errorEl.style.display   = 'none';
  modalUploadedImageUrl   = null;
  // Clear any pending debounce
  clearTimeout(_imgPreviewTimer);
  if (!url) return;
  // Validate: must look like a URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    errorEl.style.display = 'block';
    return;
  }
  // Show loading spinner, then try to load the image
  loadingEl.style.display = 'block';
  _imgPreviewTimer = setTimeout(() => {
    const testImg = new Image();
    testImg.onload = () => {
      // Success
      loadingEl.style.display  = 'none';
      errorEl.style.display    = 'none';
      previewImg.src           = url;
      previewEl.style.display  = 'block';
      modalUploadedImageUrl    = url;   // ← this is what saveItem() will use
    };
    testImg.onerror = () => {
      // Failed to load
      loadingEl.style.display  = 'none';
      previewEl.style.display  = 'none';
      errorEl.style.display    = 'block';
      modalUploadedImageUrl    = null;
    };
    testImg.src = url;
  }, 600); // 600ms debounce — waits for user to stop typing
}
async function saveItem(event) {
  event.preventDefault();
  const type     = document.getElementById('item-modal-type').value;
  const id       = document.getElementById('item-modal-id').value;
  const name     = document.getElementById('item-modal-name').value.trim();
  const subtitle = document.getElementById('item-modal-subtitle').value.trim();
  const inStock  = document.getElementById('item-modal-instock').checked;
  const price    = parseFloat(document.getElementById('item-modal-price').value) || 0;
  if (!name) {
    showToast('Please enter a title.', 'warning');
    return;
  }
  // ── Read imageUrl from URL input field ────────────────────────────
  // modalUploadedImageUrl is set by onImageUrlInput() after successful load.
  // As a safety net, also read the raw input value so that a URL that was
  // pre-filled on edit (and not re-typed) is never lost.
  const rawInputUrl = document.getElementById('item-modal-image-url').value.trim();
  const resolvedImageUrl = modalUploadedImageUrl || rawInputUrl || '';
  const submitBtn  = document.getElementById('item-modal-submit');
  const submitText = document.getElementById('item-modal-submit-text');
  const submitSpinner = document.getElementById('item-modal-submit-spinner');
  submitBtn.disabled = true;
  submitText.style.display = 'none';
  submitSpinner.style.display = 'flex';
  const priceField = type === 'designs' ? 'basePrice' : 'addonPrice';
  const itemData = {
    title: name,
    subtitle,
    inStock,
    imageUrl: resolvedImageUrl,   // ← always the field name used throughout
    order: Date.now(),
    [priceField]: price,
  };
  if (DEMO_MODE) {
    // Update local demo data only
    if (id) {
      const idx = adminInventory[type].findIndex(i => i.id === id);
      if (idx > -1) adminInventory[type][idx] = { ...adminInventory[type][idx], ...itemData };
    } else {
      adminInventory[type].push({ id: 'demo_' + Date.now(), ...itemData });
    }
    renderAdminSizes();
    renderAdminDesigns();
    renderAdminBeads();
    closeItemModal(null);
    showToast('Saved locally (Demo Mode). Connect Firebase to persist.', 'warning', 4000);
    submitBtn.disabled = false;
    submitText.style.display = '';
    submitSpinner.style.display = 'none';
    return;
  }
  try {
    const colRef = db.collection('inventory').doc(type).collection('items');
    if (id) {
      await colRef.doc(id).update(itemData);
      showToast('Item updated ✅', 'success');
    } else {
      await colRef.add(itemData);
      showToast('Item added ✅', 'success');
    }
    closeItemModal(null);
  } catch (err) {
    showToast('Failed to save item. Check console.', 'error');
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitText.style.display = '';
    submitSpinner.style.display = 'none';
  }
}
// ── Delete Modal ──────────────────────────────────────────────────
let pendingDeleteType = null;
let pendingDeleteId   = null;
function openDeleteModal(type, id, name) {
  pendingDeleteType = type;
  pendingDeleteId   = id;
  document.getElementById('delete-item-name').textContent = name;
  document.getElementById('delete-modal-overlay').classList.add('active');
  document.getElementById('delete-confirm-btn').onclick = () => deleteItem(type, id);
}
function closeDeleteModal(event) {
  if (event && event.target !== document.getElementById('delete-modal-overlay')) return;
  document.getElementById('delete-modal-overlay').classList.remove('active');
  pendingDeleteType = null;
  pendingDeleteId   = null;
}
async function deleteItem(type, id) {
  if (DEMO_MODE) {
    adminInventory[type] = adminInventory[type].filter(i => i.id !== id);
    renderAdminSizes();
    renderAdminDesigns();
    renderAdminBeads();
    closeDeleteModal(null);
    showToast('Deleted locally (Demo Mode).', 'warning', 3000);
    return;
  }
  try {
    // Get item to check if it has an image
    const docRef = db.collection('inventory').doc(type).collection('items').doc(id);
    const snap   = await docRef.get();
    if (snap.exists) {
      const data = snap.data();
      // Delete image from Storage if it was uploaded by us
      if (data.imageUrl && data.imageUrl.includes('firebasestorage')) {
        try {
          await storage.refFromURL(data.imageUrl).delete();
        } catch (_) { /* non-critical */ }
      }
      await docRef.delete();
    }
    showToast('Item deleted ✅', 'success');
    closeDeleteModal(null);
  } catch (err) {
    showToast('Failed to delete item.', 'error');
    console.error(err);
  }
}
// ── Pricing Panel ─────────────────────────────────────────────────
let pricingConfig = { basePrice: 149, currency: '₹' };
async function buildPricingPanel() {
  // Load current pricing config
  if (FIREBASE_READY) {
    try {
      const snap = await db.collection('pricing').doc('config').get();
      if (snap.exists) {
        pricingConfig = snap.data();
      }
    } catch (_) {}
  }
  const baseInput     = document.getElementById('pricing-base');
  const currencyInput = document.getElementById('pricing-currency');
  if (baseInput)     baseInput.value     = pricingConfig.basePrice || 149;
  if (currencyInput) currencyInput.value = pricingConfig.currency  || '₹';
  // Design prices
  const designsList = document.getElementById('pricing-designs-list');
  if (designsList) {
    if (adminInventory.designs.length === 0) {
      designsList.innerHTML = `<div style="font-size:12px;color:rgba(255,255,255,0.3)">No designs yet. Add designs first.</div>`;
    } else {
      designsList.innerHTML = adminInventory.designs.map(d => `
        <div class="pricing-list-row">
          <div class="pricing-list-row-name">${d.emoji || '🎨'} ${d.title}</div>
          <input type="number" class="admin-price-input" value="${d.basePrice || 0}" min="0" step="1"
            onchange="updateItemPrice('designs','${d.id}','basePrice',this.value)" title="Base Price (₹)">
        </div>`).join('');
    }
  }
  // Bead add-on prices
  const beadsList = document.getElementById('pricing-beads-list');
  if (beadsList) {
    if (adminInventory.beads.length === 0) {
      beadsList.innerHTML = `<div style="font-size:12px;color:rgba(255,255,255,0.3)">No beads yet. Add beads first.</div>`;
    } else {
      beadsList.innerHTML = adminInventory.beads.map(b => `
        <div class="pricing-list-row">
          <div class="pricing-list-row-name">${b.emoji || '💎'} ${b.title}</div>
          <input type="number" class="admin-price-input" value="${b.addonPrice || 0}" min="0" step="1"
            onchange="updateItemPrice('beads','${b.id}','addonPrice',this.value)" title="Add-on Price (₹)">
        </div>`).join('');
    }
  }
}
async function savePricingSnapshot() {
  const basePrice = parseFloat(document.getElementById('pricing-base')?.value) || 149;
  const currency  = document.getElementById('pricing-currency')?.value.trim() || '₹';
  pricingConfig = { basePrice, currency };
  if (DEMO_MODE) {
    showToast('Pricing saved locally (Demo Mode). Connect Firebase to persist.', 'warning', 4000);
    return;
  }
  try {
    await db.collection('pricing').doc('config').set({ basePrice, currency }, { merge: true });
    showToast('Pricing configuration saved ✅', 'success');
  } catch (err) {
    showToast('Failed to save pricing.', 'error');
    console.error(err);
  }
}
// ── Orders Panel ──────────────────────────────────────────────────
async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;
  if (DEMO_MODE) {
    tbody.innerHTML = `<tr><td colspan="10">
      <div class="empty-state">
        <span class="empty-state-icon">📡</span>
        <div class="empty-state-text">Orders will appear here once Firebase is connected.<br>Customers' WhatsApp checkout submissions are logged automatically.</div>
      </div></td></tr>`;
    return;
  }
  tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="spinner"></div></div></td></tr>`;
  try {
    const snap = await db.collection('orders').orderBy('timestamp', 'desc').limit(100).get();
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="10">
        <div class="empty-state">
          <span class="empty-state-icon">📭</span>
          <div class="empty-state-text">No orders yet.</div>
        </div></td></tr>`;
      return;
    }
    const rows = snap.docs.map((doc, index) => {
      const o = doc.data();
      const ts = o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString('en-IN') : '—';
      const beadNames = Array.isArray(o.beads) ? o.beads.map(b => b.title).join(', ') || '—' : '—';
      const statusBadge = o.status === 'reviewed'
        ? '<span class="badge badge-success">Reviewed</span>'
        : '<span class="badge badge-gold">New</span>';
      const refImg = o.referenceImageUrl
        ? `<img src="${o.referenceImageUrl}" class="order-ref-thumb" alt="Ref" onclick="openLightbox('${o.referenceImageUrl}')">`
        : '<span style="color:rgba(255,255,255,0.25);font-size:12px">—</span>';
      return `<tr>
        <td>${index + 1}</td>
        <td style="white-space:nowrap;font-size:12px">${ts}</td>
        <td>${o.customerName || '—'}<br><span style="font-size:11px;color:rgba(255,255,255,0.4)">${o.customerPhone || ''}</span></td>
        <td>${o.size || '—'}</td>
        <td>${o.design || '—'}</td>
        <td style="font-size:12px">${beadNames}</td>
        <td class="order-notes-cell" title="${escapeStr(o.notes)}">${o.notes || '—'}</td>
        <td>${refImg}</td>
        <td style="font-family:var(--font-display);color:var(--rose-light);font-weight:700">₹${o.totalPrice || '—'}</td>
        <td>
          ${statusBadge}
          ${o.status !== 'reviewed' ? `<br><button class="btn btn-sm" style="margin-top:6px;background:rgba(16,185,129,0.15);color:#6EE7B7;border:1px solid rgba(16,185,129,0.2);border-radius:999px;font-size:11px;padding:4px 10px" onclick="markOrderReviewed('${doc.id}')">✓ Mark Reviewed</button>` : ''}
        </td>
      </tr>`;
    });
    tbody.innerHTML = rows.join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><span class="empty-state-icon">❌</span><div class="empty-state-text">Failed to load orders. Check console.</div></div></td></tr>`;
    console.error(err);
  }
}
async function markOrderReviewed(orderId) {
  if (!FIREBASE_READY) return;
  try {
    await db.collection('orders').doc(orderId).update({ status: 'reviewed' });
    showToast('Order marked as reviewed ✅', 'success', 2000);
    loadOrders();
  } catch (err) {
    showToast('Failed to update order.', 'error');
    console.error(err);
  }
}
// ── Lightbox ──────────────────────────────────────────────────────
function openLightbox(url) {
  document.getElementById('lightbox-img').src = url;
  document.getElementById('lightbox-download').href = url;
  document.getElementById('lightbox-overlay').classList.add('active');
}
function closeLightbox() {
  document.getElementById('lightbox-overlay').classList.remove('active');
}
// ── Settings Panel ────────────────────────────────────────────────
async function loadSettings() {
  if (!FIREBASE_READY) return;
  try {
    const snap = await db.collection('settings').doc('business').get();
    if (snap.exists) {
      const s = snap.data();
      if (s.businessName) document.getElementById('setting-biz-name').value = s.businessName;
      if (s.whatsappNumber) document.getElementById('setting-whatsapp').value = s.whatsappNumber;
      if (s.tagline) document.getElementById('setting-tagline').value = s.tagline;
    }
  } catch (_) {}
}
async function saveSettings() {
  const bizName   = document.getElementById('setting-biz-name')?.value.trim();
  const whatsapp  = document.getElementById('setting-whatsapp')?.value.trim();
  const tagline   = document.getElementById('setting-tagline')?.value.trim();
  if (DEMO_MODE) {
    showToast('Connect Firebase to save settings.', 'warning');
    return;
  }
  try {
    await db.collection('settings').doc('business').set(
      { businessName: bizName, whatsappNumber: whatsapp, tagline },
      { merge: true }
    );
    // Update topbar
    if (bizName) document.getElementById('admin-brand-name').textContent = bizName;
    showToast('Settings saved ✅', 'success');
  } catch (err) {
    showToast('Failed to save settings.', 'error');
    console.error(err);
  }
}
// ── Seed Demo Data ────────────────────────────────────────────────
async function seedDemoData() {
  if (DEMO_MODE) {
    showToast('Connect Firebase first to seed real data.', 'warning');
    return;
  }
  const btn = document.getElementById('seed-btn');
  if (btn) btn.disabled = true;
  showToast('Seeding demo data... ⏳', 'info', 8000);
  try {
    const batch = db.batch();
    // Seed sizes
    DEMO_INVENTORY.sizes.forEach((s, i) => {
      const ref = db.collection('inventory').doc('sizes').collection('items').doc(s.id);
      batch.set(ref, { ...s, order: i });
    });
    // Seed designs
    DEMO_INVENTORY.designs.forEach((d, i) => {
      const ref = db.collection('inventory').doc('designs').collection('items').doc(d.id);
      batch.set(ref, { ...d, order: i });
    });
    // Seed beads
    DEMO_INVENTORY.beads.forEach((b, i) => {
      const ref = db.collection('inventory').doc('beads').collection('items').doc(b.id);
      batch.set(ref, { ...b, order: i });
    });
    // Seed pricing
    batch.set(db.collection('pricing').doc('config'), { basePrice: 149, currency: '₹' });
    await batch.commit();
    showToast('Demo data seeded successfully! 🌱', 'success', 4000);
  } catch (err) {
    showToast('Seed failed. Check Firestore rules (allow write in test mode).', 'error', 5000);
    console.error(err);
    if (btn) btn.disabled = false;
  }
}
// ── Helpers ───────────────────────────────────────────────────────
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
// ── Init ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Admin brand name from config
  const brandEl = document.getElementById('admin-brand-name');
  if (brandEl && typeof BUSINESS_NAME !== 'undefined') {
    brandEl.textContent = BUSINESS_NAME;
  }
  // Start inventory listeners after auth check (requireAuth is called from admin-auth.js)
  // We use a small delay to allow auth state to settle
  setTimeout(() => {
    startInventoryListeners();
  }, 300);
  if (DEMO_MODE) {
    showToast('Demo Mode — Firebase not configured. Data changes won\'t be saved.', 'warning', 6000);
  }
});


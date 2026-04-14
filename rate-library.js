// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Rate Library UI & Client Logic
// Custom material & labor rate management for estimators.
// Depends on: app.js (esc, spToast, fetchWithRetry, state, etc.)
// ═══════════════════════════════════════════════════════════════

function closeRateLibraryPanel() {
  const backdrop = document.querySelector('.rate-library-backdrop');
  const panel = document.querySelector('.rate-library-panel');
  if (backdrop) backdrop.remove();
  if (panel) panel.remove();
}

function _rateLibHeaders() {
  const h = {};
  const appToken = sessionStorage.getItem('sp_app_token') || '';
  const sessionToken = sessionStorage.getItem('sp_session_token') || '';
  if (appToken) h['X-App-Token'] = appToken;
  if (sessionToken) h['X-Session-Token'] = sessionToken;
  return h;
}

async function _fetchRates(category, search) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  const url = '/api/rate-library' + (params.toString() ? '?' + params : '');
  const res = await fetchWithRetry(url, {
    headers: { ..._rateLibHeaders() },
    _timeout: 10000,
  }, 3);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.rates || [];
}

async function _createRate(rate) {
  const res = await fetchWithRetry('/api/rate-library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._rateLibHeaders() },
    body: JSON.stringify(rate),
    _timeout: 10000,
  }, 3);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function _updateRate(rate) {
  const res = await fetchWithRetry('/api/rate-library', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ..._rateLibHeaders() },
    body: JSON.stringify(rate),
    _timeout: 10000,
  }, 3);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function _deleteRate(id) {
  const res = await fetchWithRetry(`/api/rate-library?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ..._rateLibHeaders() },
    _timeout: 10000,
  }, 3);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

function _renderRateCard(rate) {
  const lastUsed = rate.last_used ? new Date(rate.last_used).toLocaleDateString() : 'Never';
  const cost = '$' + Number(rate.unit_cost || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `
    <div class="rate-card" data-rate-id="${esc(rate.id)}">
      <div class="rate-card-header">
        <div class="rate-card-name">${esc(rate.item_name)}</div>
        <div class="rate-card-actions">
          <button class="rate-card-edit" data-rate-id="${esc(rate.id)}" title="Edit">✏️</button>
          <button class="rate-card-delete" data-rate-id="${esc(rate.id)}" title="Delete">🗑️</button>
        </div>
      </div>
      <div class="rate-card-details">
        ${rate.category ? `<span class="rate-tag">${esc(rate.category)}</span>` : ''}
        <span class="rate-detail"><strong>${cost}</strong> / ${esc(rate.unit || 'ea')}</span>
        ${rate.labor_hours ? `<span class="rate-detail">${rate.labor_hours}h labor</span>` : ''}
        ${rate.supplier ? `<span class="rate-detail">${esc(rate.supplier)}</span>` : ''}
      </div>
      <div class="rate-card-meta">
        Last used: ${esc(lastUsed)} &middot; Used ${rate.use_count || 0} time${(rate.use_count || 0) !== 1 ? 's' : ''}
      </div>
    </div>`;
}

function _renderAddRateForm() {
  return `
    <div id="rate-add-form" class="rate-add-form">
      <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:12px;">Add New Rate</div>
      <div class="rate-form-grid">
        <div class="rate-form-field">
          <label class="rate-form-label">Item Name *</label>
          <input type="text" id="rate-f-name" class="rate-form-input" placeholder="e.g. Cat6A Plenum Cable">
        </div>
        <div class="rate-form-field">
          <label class="rate-form-label">Category</label>
          <input type="text" id="rate-f-category" class="rate-form-input" placeholder="e.g. Cabling">
        </div>
        <div class="rate-form-field">
          <label class="rate-form-label">Unit Cost *</label>
          <input type="number" step="0.01" id="rate-f-cost" class="rate-form-input" placeholder="0.00">
        </div>
        <div class="rate-form-field">
          <label class="rate-form-label">Unit</label>
          <input type="text" id="rate-f-unit" class="rate-form-input" value="ea" placeholder="ea, ft, lot">
        </div>
        <div class="rate-form-field">
          <label class="rate-form-label">Labor Hours</label>
          <input type="number" step="0.1" id="rate-f-labor" class="rate-form-input" placeholder="0">
        </div>
        <div class="rate-form-field">
          <label class="rate-form-label">Supplier</label>
          <input type="text" id="rate-f-supplier" class="rate-form-input" placeholder="e.g. Graybar">
        </div>
        <div class="rate-form-field" style="grid-column:1/-1;">
          <label class="rate-form-label">Notes</label>
          <input type="text" id="rate-f-notes" class="rate-form-input" placeholder="Optional notes">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button id="rate-f-save" class="rate-btn-primary">Save Rate</button>
        <button id="rate-f-cancel" class="rate-btn-secondary">Cancel</button>
      </div>
    </div>`;
}

async function showRateLibraryPanel() {
  closeRateLibraryPanel();

  const backdrop = document.createElement('div');
  backdrop.className = 'rate-library-backdrop';
  backdrop.addEventListener('click', closeRateLibraryPanel);
  document.body.appendChild(backdrop);

  const panel = document.createElement('div');
  panel.className = 'rate-library-panel';
  panel.innerHTML = `
    <div class="rate-library-header">
      <h2>📚 Rate Library</h2>
      <button class="saved-panel-close" onclick="closeRateLibraryPanel()">✕</button>
    </div>
    <div class="rate-library-toolbar">
      <input type="text" id="rate-search" class="rate-search-input" placeholder="Search rates...">
      <select id="rate-category-filter" class="rate-category-select">
        <option value="">All Categories</option>
      </select>
      <button id="rate-add-btn" class="rate-btn-primary">+ Add Rate</button>
    </div>
    <div class="rate-library-body" id="rate-library-list">
      <div style="text-align:center;padding:40px;color:var(--text-muted);">Loading...</div>
    </div>`;
  document.body.appendChild(panel);

  // Load rates from API
  let allRates = [];
  try {
    allRates = await _fetchRates();
  } catch (err) {
    document.getElementById('rate-library-list').innerHTML =
      `<div style="text-align:center;padding:40px;color:var(--accent-rose);">Failed to load rates: ${esc(err.message)}</div>`;
    return;
  }

  // Populate category dropdown
  const categories = [...new Set(allRates.filter(r => r.category).map(r => r.category))].sort();
  const catSelect = document.getElementById('rate-category-filter');
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    catSelect.appendChild(opt);
  });

  function renderList(rates) {
    const lc = document.getElementById('rate-library-list');
    if (!rates.length) {
      lc.innerHTML = `
        <div style="text-align:center;padding:40px;">
          <div style="font-size:42px;margin-bottom:14px;">📚</div>
          <div style="font-size:14px;font-weight:600;color:var(--text-primary);">No rates saved yet</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
            Click "+ Add Rate" to save your first material rate, or use
            "Save Rates from This Estimate" after running an analysis.
          </div>
        </div>`;
      return;
    }
    lc.innerHTML = rates.map(r => _renderRateCard(r)).join('');

    // Wire delete buttons
    lc.querySelectorAll('.rate-card-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this rate?')) return;
        try {
          await _deleteRate(btn.dataset.rateId);
          allRates = allRates.filter(r => r.id !== btn.dataset.rateId);
          renderList(filterRates());
          spToast('Rate deleted');
        } catch (err) {
          spToast('Failed to delete: ' + err.message, 'error');
        }
      });
    });

    // Wire edit buttons
    lc.querySelectorAll('.rate-card-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rate = allRates.find(r => r.id === btn.dataset.rateId);
        if (rate) showEditForm(rate);
      });
    });
  }

  function filterRates() {
    const s = (document.getElementById('rate-search')?.value || '').toLowerCase();
    const c = document.getElementById('rate-category-filter')?.value || '';
    return allRates.filter(r => {
      if (c && r.category !== c) return false;
      if (s && !(r.item_name || '').toLowerCase().includes(s)) return false;
      return true;
    });
  }

  function showEditForm(rate) {
    const card = document.getElementById('rate-library-list')
      .querySelector(`.rate-card[data-rate-id="${rate.id}"]`);
    if (!card) return;

    card.innerHTML = `
      <div class="rate-form-grid" style="gap:8px;">
        <input type="text" class="rate-form-input re-name" value="${esc(rate.item_name)}" placeholder="Item name">
        <input type="text" class="rate-form-input re-cat" value="${esc(rate.category || '')}" placeholder="Category">
        <input type="number" step="0.01" class="rate-form-input re-cost" value="${rate.unit_cost}" placeholder="Unit cost">
        <input type="text" class="rate-form-input re-unit" value="${esc(rate.unit || 'ea')}" placeholder="Unit">
        <input type="number" step="0.1" class="rate-form-input re-labor" value="${rate.labor_hours || 0}" placeholder="Labor hrs">
        <input type="text" class="rate-form-input re-supplier" value="${esc(rate.supplier || '')}" placeholder="Supplier">
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button class="rate-btn-primary re-save">Save</button>
        <button class="rate-btn-secondary re-cancel">Cancel</button>
      </div>`;

    card.querySelector('.re-save').addEventListener('click', async () => {
      try {
        const updated = {
          id: rate.id,
          item_name: card.querySelector('.re-name').value.trim(),
          category: card.querySelector('.re-cat').value.trim() || null,
          unit_cost: parseFloat(card.querySelector('.re-cost').value) || 0,
          unit: card.querySelector('.re-unit').value.trim() || 'ea',
          labor_hours: parseFloat(card.querySelector('.re-labor').value) || 0,
          supplier: card.querySelector('.re-supplier').value.trim() || null,
        };
        if (!updated.item_name) {
          spToast('Item name is required', 'error');
          return;
        }
        await _updateRate(updated);
        Object.assign(rate, updated);
        renderList(filterRates());
        spToast('Rate updated');
      } catch (err) {
        spToast('Failed to update rate: ' + err.message, 'error');
      }
    });

    card.querySelector('.re-cancel').addEventListener('click', () => renderList(filterRates()));
  }

  // Initial render
  renderList(allRates);

  // Search debounce
  let _searchDebounce;
  document.getElementById('rate-search')?.addEventListener('input', () => {
    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(() => renderList(filterRates()), 250);
  });

  // Category filter
  document.getElementById('rate-category-filter')?.addEventListener('change', () => {
    renderList(filterRates());
  });

  // Add Rate toggle
  document.getElementById('rate-add-btn')?.addEventListener('click', () => {
    const existing = document.getElementById('rate-add-form');
    if (existing) { existing.remove(); return; }

    const listEl = document.getElementById('rate-library-list');
    listEl.insertAdjacentHTML('afterbegin', _renderAddRateForm());

    document.getElementById('rate-f-cancel').addEventListener('click', () => {
      document.getElementById('rate-add-form')?.remove();
    });

    document.getElementById('rate-f-save').addEventListener('click', async () => {
      const name = document.getElementById('rate-f-name').value.trim();
      const cost = parseFloat(document.getElementById('rate-f-cost').value);
      if (!name) { spToast('Item name is required', 'error'); return; }
      if (isNaN(cost) || cost < 0) { spToast('Valid unit cost is required', 'error'); return; }

      try {
        const newRate = {
          item_name: name,
          category: document.getElementById('rate-f-category').value.trim() || null,
          unit_cost: cost,
          unit: document.getElementById('rate-f-unit').value.trim() || 'ea',
          labor_hours: parseFloat(document.getElementById('rate-f-labor').value) || 0,
          supplier: document.getElementById('rate-f-supplier').value.trim() || null,
          notes: document.getElementById('rate-f-notes').value.trim() || null,
        };
        const result = await _createRate(newRate);
        newRate.id = result.id;
        newRate.use_count = 0;
        newRate.last_used = null;
        newRate.created_at = new Date().toISOString();
        newRate.updated_at = new Date().toISOString();
        allRates.unshift(newRate);

        // Add new category to dropdown if needed
        if (newRate.category && !categories.includes(newRate.category)) {
          categories.push(newRate.category);
          categories.sort();
          const opt = document.createElement('option');
          opt.value = newRate.category;
          opt.textContent = newRate.category;
          catSelect.appendChild(opt);
        }

        renderList(filterRates());
        spToast('Rate saved to library');
      } catch (err) {
        spToast('Failed to save rate: ' + err.message, 'error');
      }
    });
  });

  // Initialize Lucide icons in the panel
  if (typeof lucide !== 'undefined') {
    try { lucide.createIcons(); } catch (e) { console.warn('Lucide createIcons failed:', e); }
  }
}

// ─── Apply Rate Library to Current Estimate ──────────────────
async function applyRateLibraryToEstimate(container) {
  if (!state.aiAnalysis) {
    spToast('Run an analysis first before applying rates', 'error');
    return;
  }

  try {
    const rates = await _fetchRates();
    if (!rates.length) {
      spToast('No rates in library. Add some rates first.', 'info');
      return;
    }

    // Snapshot current overrides BEFORE applyRateLibrary mutates state
    const previousOverrides = { ...(state.supplierPriceOverrides || {}) };
    const result = SmartPlansExport.applyRateLibrary(state, rates);

    if (result.itemsMatched === 0) {
      spToast('No matching rates found for current BOM items', 'info');
      return;
    }

    const delta = result.delta >= 0
      ? '+$' + result.delta.toLocaleString()
      : '-$' + Math.abs(result.delta).toLocaleString();

    const confirmed = confirm(
      `Rate Library Match Summary\n\n` +
      `Items Matched: ${result.itemsMatched}\n` +
      `Items Unmatched: ${result.itemsUnmatched}\n\n` +
      `Old Total: $${result.oldTotal.toLocaleString()}\n` +
      `New Total: $${result.newTotal.toLocaleString()}\n` +
      `Change: ${delta}\n\n` +
      `Apply rate library pricing?`
    );

    if (!confirmed) {
      // Restore the original overrides that existed before applyRateLibrary mutated state
      state.supplierPriceOverrides = previousOverrides;
      return;
    }

    // Update use_count and last_used for matched rates
    const now = new Date().toISOString();
    const matchedRateIds = new Set();
    const overrides = state.supplierPriceOverrides || {};
    for (const ov of Object.values(overrides)) {
      if (ov._rateLibraryId) matchedRateIds.add(ov._rateLibraryId);
    }
    for (const rate of rates) {
      if (matchedRateIds.has(rate.id)) {
        try {
          await _updateRate({
            id: rate.id,
            last_used: now,
            use_count: (rate.use_count || 0) + 1,
          });
        } catch (e) { /* non-critical */ }
      }
    }

    await saveEstimate(false);
    render();
    spToast(
      `Rate library applied — ${result.itemsMatched} items matched, total changed by ${delta}`,
      'success'
    );
  } catch (err) {
    console.error('[RateLibrary] Apply failed:', err);
    spToast('Failed to apply rate library: ' + err.message, 'error');
  }
}

// ─── Bulk-Save BOM Items to Rate Library ─────────────────────
async function saveRatesFromEstimate() {
  if (!state.aiAnalysis) {
    spToast('No analysis data to save rates from', 'error');
    return;
  }

  const bom = SmartPlansExport._extractBOMFromAnalysis(state.aiAnalysis);
  if (!bom.categories || bom.categories.length === 0) {
    spToast('No BOM items found in the analysis', 'error');
    return;
  }

  let totalItems = 0;
  for (const cat of bom.categories) {
    totalItems += cat.items.length;
  }

  if (!confirm(
    `Save ${totalItems} BOM items to your Rate Library?\n\n` +
    `Existing rates with the same name will NOT be overwritten.`
  )) {
    return;
  }

  // Fetch existing rates to avoid duplicates
  let existingRates = [];
  try {
    existingRates = await _fetchRates();
  } catch (e) { /* proceed without dedup check */ }
  const existingNames = new Set(
    existingRates.map(r => (r.item_name || '').toLowerCase())
  );

  let saved = 0;
  let skipped = 0;
  const overrides = state.supplierPriceOverrides || {};

  for (let catIdx = 0; catIdx < bom.categories.length; catIdx++) {
    const cat = bom.categories[catIdx];
    for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
      const item = cat.items[itemIdx];
      const key = `${catIdx}-${itemIdx}`;
      const unitCost = overrides[key] ? overrides[key].unitCost : item.unitCost;
      const itemName = (item.item || '').trim();

      if (!itemName || itemName.length < 2) { skipped++; continue; }
      if (existingNames.has(itemName.toLowerCase())) { skipped++; continue; }

      try {
        await _createRate({
          item_name: itemName,
          category: cat.category || item.category || null,
          unit_cost: unitCost,
          unit: item.unit || 'ea',
          labor_hours: 0,
          supplier: null,
          notes: `Imported from estimate: ${state.projectName || 'Untitled'}`,
        });
        existingNames.add(itemName.toLowerCase());
        saved++;
      } catch (err) {
        console.warn('[RateLibrary] Failed to save rate:', itemName, err.message);
        skipped++;
      }
    }
  }

  spToast(`Saved ${saved} rates to library (${skipped} skipped/duplicates)`, 'success');
}

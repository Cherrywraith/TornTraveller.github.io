/* ================================================================
   app.js — Logique principale du Torn Travel Optimizer
   ================================================================ */

/* ── État global ─────────────────────────────────────────────── */
let stockData   = null;   // données YATA {stocks:{mex:{update,stocks:[...]}, ...}}
let priceData   = {};     // prix marché Torn (si clé API fournie)
let excludedCountries = new Set();
let recomputeTimer = null;

/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildCountryFilters();
  updateCapacity();
  const savedKey = sessionStorage.getItem('tornKey');
  if (savedKey) {
    document.getElementById('apiKey').value = savedKey;
    document.getElementById('keyStatus').textContent = '✓ enregistrée';
  }
});

/* ── Clé API ─────────────────────────────────────────────────── */
function saveKey() {
  const k = document.getElementById('apiKey').value.trim();
  if (!k) return;
  sessionStorage.setItem('tornKey', k);
  document.getElementById('keyStatus').textContent = '✓ enregistrée';
}

/* ── Filtres pays ────────────────────────────────────────────── */
function buildCountryFilters() {
  const container = document.getElementById('countryFilters');
  COUNTRIES.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'country-btn';
    btn.textContent = c.flag + ' ' + c.name.split(' ')[0];
    btn.dataset.code = c.code;
    btn.onclick = () => {
      if (excludedCountries.has(c.code)) {
        excludedCountries.delete(c.code);
        btn.classList.remove('excluded');
      } else {
        excludedCountries.add(c.code);
        btn.classList.add('excluded');
      }
      scheduleRecompute();
    };
    container.appendChild(btn);
  });
}

/* ── Capacité ────────────────────────────────────────────────── */
function getBaseCapacity() {
  const mode    = document.getElementById('flightMode').value;
  const base    = mode === 'standard' ? 5 : 15;
  const suit    = parseInt(document.getElementById('suitcase').value)    || 0;
  const faction = parseInt(document.getElementById('factionBonus').value) || 0;
  const ling    = parseInt(document.getElementById('lingerieBonus').value)|| 0;
  const cruise  = parseInt(document.getElementById('cruiseBonus').value)  || 0;
  return base + suit + faction + ling + cruise;
}

function getCapacityForType(type) {
  const base = getBaseCapacity();
  if (type === 'plushie') return base + (parseInt(document.getElementById('jobToy').value)    || 0);
  if (type === 'flower')  return base + (parseInt(document.getElementById('jobFlower').value)  || 0);
  return base;
}

function updateCapacity() {
  document.getElementById('capacityDisplay').textContent = getBaseCapacity() + ' items';
}

/* ── Recompute debounce ──────────────────────────────────────── */
function scheduleRecompute() {
  clearTimeout(recomputeTimer);
  recomputeTimer = setTimeout(() => {
    if (stockData !== null) compute();
  }, 200);
}

/* ── Fetch YATA + compute ────────────────────────────────────── */
async function fetchAndCompute() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('loading');
  btn.querySelector('svg').style.animation = 'spin .8s linear infinite';

  setBanner('info', '⏳ Récupération des stocks YATA…');
  document.getElementById('summaryCards').style.display = 'none';
  document.getElementById('emptyState').style.display   = 'none';
  document.getElementById('runList').innerHTML = '';

  // Tentative fetch YATA (peut échouer si CORS depuis GitHub Pages)
  try {
    const resp = await fetch('https://yata.yt/api/v1/travel/export/');
    if (resp.ok) {
      stockData = await resp.json();
      const ts = stockData.timestamp;
      document.getElementById('lastFetchInfo').textContent =
        'YATA mis à jour ' + timeAgo(ts);
      setBanner('info', '✅ Stocks YATA chargés. Les données varient en fraîcheur par pays.');
    } else {
      throw new Error('HTTP ' + resp.status);
    }
  } catch (e) {
    stockData = {};   // on calcule quand même sans stock temps réel
    setBanner('warn',
      '⚠️ Stocks YATA indisponibles (CORS). Calcul sur prix historiques — la probabilité de stock est estimée.');
  }

  // Tentative récupération prix marché via clé API
  const key = sessionStorage.getItem('tornKey');
  if (key) {
    try {
      const r = await fetch(`https://api.torn.com/torn/?selections=items&key=${key}`);
      const d = await r.json();
      if (d.items) {
        priceData = {};
        Object.values(d.items).forEach(item => {
          priceData[item.name] = item.market_value;
        });
      }
    } catch (_) {}
  }

  compute();

  btn.classList.remove('loading');
  btn.querySelector('svg').style.animation = '';
}

/* ── Calcul principal ────────────────────────────────────────── */
function compute() {
  const mode       = document.getElementById('flightMode').value;
  const sessionMin = parseInt(document.getElementById('sessionHours').value) * 60;
  const budgetCap  = parseInt(document.getElementById('travelBudget').value) || 0;
  const freshMax   = parseFloat(document.getElementById('freshnessFilter').value);
  const wantPlush  = document.getElementById('f_plushie').checked;
  const wantFlower = document.getElementById('f_flower').checked;
  const wantDrug   = document.getElementById('f_drug').checked;

  const now = Date.now() / 1000;
  const runs = [];

  COUNTRIES.forEach(country => {
    if (excludedCountries.has(country.code)) return;

    const tOneWay  = country.timeMin[mode];
    const tripMin  = tOneWay * 2 + 5;          // A/R + 5 min sur place
    if (tripMin > sessionMin) return;

    const maxTrips = Math.floor(sessionMin / tripMin);
    if (maxTrips < 1) return;

    /* Stock YATA pour ce pays */
    const countryStock = stockData?.stocks?.[country.code] ?? null;
    const lastUpdate   = countryStock?.update ?? 0;
    const ageH         = lastUpdate ? (now - lastUpdate) / 3600 : Infinity;

    if (lastUpdate && ageH > freshMax) return;

    const confidence = stockConfidence(lastUpdate, ageH);

    /* Quantités YATA par item (id Torn → quantité) */
    const yataQty = {};
    if (countryStock?.stocks) {
      countryStock.stocks.forEach(s => { yataQty[s.id] = s.quantity; });
    }

    /* Items disponibles dans ce pays */
    const availableItems = ITEMS.filter(item => {
      if (item.country !== country.code) return false;
      if (item.type === 'plushie' && !wantPlush) return false;
      if (item.type === 'flower'  && !wantFlower) return false;
      if (item.type === 'drug'    && !wantDrug)   return false;
      return true;
    });

    if (availableItems.length === 0) return;

    /* Tri par profit décroissant et allocation des slots */
    const typed = {};
    availableItems.forEach(item => {
      const sellPrice = (priceData[item.name] || item.sell);
      const profit    = sellPrice - item.buy;
      if (!typed[item.type]) typed[item.type] = [];
      typed[item.type].push({ ...item, effectiveSell: sellPrice, unitProfit: profit });
    });

    Object.values(typed).forEach(arr =>
      arr.sort((a, b) => b.unitProfit - a.unitProfit)
    );

    /* Remplissage du sac : on donne la priorité au type le plus rentable */
    const allItems = Object.values(typed).flat()
      .sort((a, b) => b.unitProfit - a.unitProfit);

    let remainingSlots = getBaseCapacity();
    const breakdown = [];

    allItems.forEach(item => {
      if (remainingSlots <= 0) return;

      // bonus de slot pour ce type
      const cap = getCapacityForType(item.type);
      const bonusSlots = cap - getBaseCapacity();
      const slotsForItem = Math.min(remainingSlots + bonusSlots, cap);
      if (slotsForItem <= 0) return;

      // Nombre d'items à prendre (max 5 d'un même item, limité par slot dispo)
      const qty = Math.min(5, slotsForItem);

      // Probabilité de stock YATA
      let stockProba;
      if (!lastUpdate) {
        stockProba = 0.5;
      } else if (yataQty[item.id] !== undefined) {
        stockProba = Math.min(1, (yataQty[item.id] / 100)) * confidence.score;
      } else {
        stockProba = confidence.score * 0.6;
      }

      const grossProfit  = item.unitProfit * qty;
      const adjustedProfit = grossProfit * stockProba;

      breakdown.push({
        ...item,
        qty,
        stockProba,
        grossProfit,
        adjustedProfit,
      });

      remainingSlots -= qty;
    });

    if (breakdown.length === 0) return;

    const travelCost     = budgetCap > 0 ? Math.min(budgetCap, country.cost) : country.cost;
    const rawProfitTrip  = breakdown.reduce((s, b) => s + b.grossProfit, 0);
    const adjProfitTrip  = breakdown.reduce((s, b) => s + b.adjustedProfit, 0);
    const netPerTrip     = adjProfitTrip - travelCost * 2;
    const totalProfit    = netPerTrip * maxTrips;
    const profitPerHour  = totalProfit / (sessionMin / 60);

    runs.push({
      country, tOneWay, tripMin, maxTrips,
      rawProfitTrip, adjProfitTrip, netPerTrip,
      totalProfit, profitPerHour,
      breakdown, confidence, lastUpdate, ageH,
      travelCost,
    });
  });

  runs.sort((a, b) => b.totalProfit - a.totalProfit);
  renderResults(runs, mode);
}

/* ── Rendu ───────────────────────────────────────────────────── */
function renderResults(runs, mode) {
  const runList = document.getElementById('runList');
  const summary = document.getElementById('summaryCards');
  const empty   = document.getElementById('emptyState');
  runList.innerHTML = '';

  if (runs.length === 0) {
    summary.style.display = 'none';
    empty.style.display   = 'flex';
    return;
  }

  empty.style.display = 'none';
  summary.style.display = 'grid';

  const best = runs[0];
  document.getElementById('s_runs').textContent       = runs.length;
  document.getElementById('s_bestProfit').textContent  = '$' + fmt(best.totalProfit);
  document.getElementById('s_bestTrips').textContent   = best.maxTrips + 'x';
  document.getElementById('s_bestPerHour').textContent = '$' + fmt(best.profitPerHour);

  runs.slice(0, 8).forEach((run, i) => {
    runList.appendChild(buildRunCard(run, i, mode));
  });

  if (runs.length > 8) {
    const more = document.createElement('p');
    more.style.cssText = 'text-align:center;color:var(--text3);font-size:12px;padding:.5rem';
    more.textContent   = `+ ${runs.length - 8} autres destinations calculées`;
    runList.appendChild(more);
  }
}

function buildRunCard(run, rank, mode) {
  const isBest = rank === 0;

  const freshnessChip = (() => {
    if (!run.lastUpdate) return `<span class="chip chip-amber">Stock inconnu</span>`;
    const c = run.confidence;
    const cls = c.score > 0.8 ? 'chip-green' : c.score > 0.5 ? 'chip-amber' : 'chip-red';
    return `<span class="chip ${cls}">Données ${c.label}</span>`;
  })();

  const modeLabel = { standard: 'Standard', airstrip: 'Airstrip', wlt: 'WLT/BC' }[mode];

  const itemsHTML = run.breakdown.map(b => {
    const color  = TYPE_COLORS[b.type] || '#888';
    const probaStr = Math.round(b.stockProba * 100) + '%';
    return `<span class="item-chip" title="Proba stock: ${probaStr}">
      <span class="dot" style="background:${color}"></span>
      <span class="qty">${b.name}</span>
      <span>×${b.qty}</span>
      <span class="gain">+$${fmt(b.grossProfit)}</span>
      <span class="chip chip-amber" style="font-size:10px;padding:1px 5px;margin-left:2px">${probaStr}</span>
    </span>`;
  }).join('');

  /* Timeline simplifiée */
  const showTrips = Math.min(run.maxTrips, 3);
  const tlSteps = Array.from({ length: showTrips }, (_, i) => {
    const start = tripStartMin(i, run.tripMin);
    return `<span class="tl-step">T${i+1} <span style="color:var(--accent)">+${run.tOneWay}min</span></span>`;
  }).join('<span class="tl-sep">→</span>');
  const tlSuffix = run.maxTrips > showTrips
    ? `<span class="tl-sep">→</span><span class="tl-step">… ×${run.maxTrips} au total</span>`
    : '';

  const card = document.createElement('div');
  card.className = 'run-card' + (isBest ? ' best' : '');
  card.innerHTML = `
    ${isBest ? '<div class="best-badge">MEILLEUR RUN</div>' : ''}
    <div class="run-header">
      <div class="run-left">
        <span class="run-flag">${run.country.flag}</span>
        <div>
          <div class="run-country">${run.country.name}</div>
          <div class="run-meta-chips">
            <span class="chip">✈ ${run.tOneWay} min A/R</span>
            <span class="chip">🔄 ${run.maxTrips} trip${run.maxTrips > 1 ? 's' : ''}</span>
            <span class="chip">${modeLabel}</span>
            ${freshnessChip}
          </div>
        </div>
      </div>
      <div class="run-profit-block">
        <div class="profit-total ${run.totalProfit < 0 ? 'red' : ''}">$${fmt(run.totalProfit)}</div>
        <div class="profit-sub">profit total estimé</div>
      </div>
    </div>

    <hr class="run-divider" />

    <div class="run-profit-row">
      <div class="prow-item">
        <div class="prow-label">Par trip (brut)</div>
        <div class="prow-val">$${fmt(run.rawProfitTrip)}</div>
      </div>
      <div class="prow-item">
        <div class="prow-label">Par trip (net, proba)</div>
        <div class="prow-val ${run.netPerTrip < 0 ? 'red' : 'green'}">$${fmt(run.netPerTrip)}</div>
      </div>
      <div class="prow-item">
        <div class="prow-label">Par heure</div>
        <div class="prow-val accent">$${fmt(run.profitPerHour)}/h</div>
      </div>
      <div class="prow-item">
        <div class="prow-label">Coût voyage (A/R)</div>
        <div class="prow-val" style="color:var(--text2)">$${fmt(run.travelCost * 2)}</div>
      </div>
    </div>

    <div class="items-grid">${itemsHTML}</div>

    <div class="run-timeline">
      ⏱ ${tlSteps}${tlSuffix}
      &nbsp;·&nbsp; Temps utilisé : ${Math.round(run.tripMin * run.maxTrips / 60 * 10) / 10}h / ${document.getElementById('sessionHours').value}h
    </div>
  `;
  return card;
}

/* ── Helpers ─────────────────────────────────────────────────── */
function tripStartMin(index, tripMin) {
  return index * tripMin;
}

function stockConfidence(lastUpdate, ageH) {
  if (!lastUpdate || ageH === Infinity) return { score: 0.5, label: 'inconnue',    color: '#888' };
  if (ageH < 1)  return { score: 0.95, label: '< 1h',  color: '#22c55e' };
  if (ageH < 2)  return { score: 0.80, label: '< 2h',  color: '#84cc16' };
  if (ageH < 4)  return { score: 0.60, label: '< 4h',  color: '#f59e0b' };
  if (ageH < 8)  return { score: 0.35, label: '< 8h',  color: '#f97316' };
  return           { score: 0.15, label: '> 8h',  color: '#ef4444' };
}

function timeAgo(ts) {
  const diff = Math.round((Date.now() / 1000 - ts) / 60);
  if (diff < 1)  return 'à l\'instant';
  if (diff < 60) return `il y a ${diff} min`;
  return `il y a ${Math.round(diff / 60)}h`;
}

function fmt(n) {
  return Math.round(n).toLocaleString('fr-FR');
}

function setBanner(type, msg) {
  const el = document.getElementById('statusBanner');
  el.className = `banner banner-${type}`;
  el.textContent = msg;
  el.style.display = 'flex';
}

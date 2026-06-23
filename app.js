/* ================================================================
   app.js — Torn Travel Optimizer
   ================================================================ */

let stockData         = null;
let priceData         = {};
let excludedCountries = new Set();
let recomputeTimer    = null;
let departMode        = 'now';   // 'now' ou 'custom'
let departCustomTime  = null;    // string "HH:MM"

/* ── Init ──────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildCountryFilters();
  updateCapacity();
  updateFlightLabel();
  setDepartNow();
  const savedKey = sessionStorage.getItem('tornKey');
  if (savedKey) {
    document.getElementById('apiKey').value = savedKey;
    document.getElementById('keyStatus').textContent = '✓ enregistrée';
  }
});

/* ── Heure de départ ───────────────────────────────────────────── */
function setDepartNow() {
  departMode = 'now';
  departCustomTime = null;
  document.getElementById('btnNow').classList.add('active');
  document.getElementById('departTime').value = '';
  scheduleRecompute();
}

function setDepartCustom() {
  const val = document.getElementById('departTime').value;
  if (!val) return;
  departMode = 'custom';
  departCustomTime = val;
  document.getElementById('btnNow').classList.remove('active');
  scheduleRecompute();
}

function getDepartTimestamp() {
  if (departMode === 'now') return Date.now() / 1000;
  const [h, m] = departCustomTime.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime() / 1000;
}

function fmtHour(ts) {
  const d = new Date(ts * 1000);
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}

/* ── Slider longueur de vol ────────────────────────────────────── */
function updateFlightLabel() {
  const v = parseInt(document.getElementById('minFlightTime').value);
  const lbl = document.getElementById('minFlightLabel');
  const hint = document.getElementById('minFlightHint');
  if (v === 0) {
    lbl.textContent = 'Tous';
    hint.textContent = 'Toutes les destinations incluses.';
  } else {
    const h = Math.floor(v / 60);
    const m = v % 60;
    const str = h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`;
    lbl.textContent = str + ' min';
    const dest = COUNTRIES.filter(c => c.timeMin.airstrip >= v);
    hint.textContent = `${dest.length} destination${dest.length > 1 ? 's' : ''} retenue${dest.length > 1 ? 's' : ''}.`;
  }
}

/* ── Clé API ───────────────────────────────────────────────────── */
function saveKey() {
  const k = document.getElementById('apiKey').value.trim();
  if (!k) return;
  sessionStorage.setItem('tornKey', k);
  document.getElementById('keyStatus').textContent = '✓ enregistrée';
}

/* ── Filtres pays ──────────────────────────────────────────────── */
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

/* ── Capacité ──────────────────────────────────────────────────── */
function getBaseCapacity() {
  const mode    = document.getElementById('flightMode').value;
  const base    = mode === 'standard' ? 5 : 15;
  const suit    = parseInt(document.getElementById('suitcase').value)     || 0;
  const faction = parseInt(document.getElementById('factionBonus').value) || 0;
  const ling    = parseInt(document.getElementById('lingerieBonus').value)|| 0;
  const cruise  = parseInt(document.getElementById('cruiseBonus').value)  || 0;
  return base + suit + faction + ling + cruise;
}

function getCapacityForType(type) {
  const base = getBaseCapacity();
  if (type === 'plushie') return base + (parseInt(document.getElementById('jobToy').value)   || 0);
  if (type === 'flower')  return base + (parseInt(document.getElementById('jobFlower').value) || 0);
  return base;
}

function updateCapacity() {
  document.getElementById('capacityDisplay').textContent = getBaseCapacity() + ' items';
}

/* ── Debounce recompute ────────────────────────────────────────── */
function scheduleRecompute() {
  clearTimeout(recomputeTimer);
  recomputeTimer = setTimeout(() => {
    if (stockData !== null) compute();
  }, 250);
}

/* ── Fetch YATA ────────────────────────────────────────────────── */
async function fetchAndCompute() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('loading');

  setBanner('info', '⏳ Récupération des stocks YATA…');
  document.getElementById('summaryCards').style.display = 'none';
  document.getElementById('emptyState').style.display   = 'none';
  document.getElementById('runList').innerHTML = '';

  try {
    const resp = await fetch('https://yata.yt/api/v1/travel/export/');
    if (resp.ok) {
      stockData = await resp.json();
      document.getElementById('lastFetchInfo').textContent =
        'YATA ' + timeAgo(stockData.timestamp);
      setBanner('info', '✅ Stocks YATA chargés — fraîcheur variable par pays.');
    } else throw new Error('HTTP ' + resp.status);
  } catch (e) {
    stockData = {};
    setBanner('warn', '⚠️ Stocks YATA indisponibles (CORS). Calcul sur prix historiques.');
  }

  const key = sessionStorage.getItem('tornKey');
  if (key) {
    try {
      const r = await fetch(`https://api.torn.com/torn/?selections=items&key=${key}`);
      const d = await r.json();
      if (d.items) {
        priceData = {};
        Object.values(d.items).forEach(item => { priceData[item.name] = item.market_value; });
      }
    } catch (_) {}
  }

  compute();
  btn.classList.remove('loading');
}

/* ── Calcul principal ──────────────────────────────────────────── */
function compute() {
  const mode       = document.getElementById('flightMode').value;
  const sessionMin = parseInt(document.getElementById('sessionHours').value) * 60;
  const budgetCap  = parseInt(document.getElementById('travelBudget').value) || 0;
  const freshMax   = parseFloat(document.getElementById('freshnessFilter').value);
  const minFlight  = parseInt(document.getElementById('minFlightTime').value) || 0;
  const maxTripsAllowed = parseInt(document.getElementById('maxTrips').value) || 999;
  const wantPlush  = document.getElementById('f_plushie').checked;
  const wantFlower = document.getElementById('f_flower').checked;
  const wantDrug   = document.getElementById('f_drug').checked;

  const now        = Date.now() / 1000;
  const departTs   = getDepartTimestamp();
  const runs       = [];

  COUNTRIES.forEach(country => {
    if (excludedCountries.has(country.code)) return;

    const tOneWay  = country.timeMin[mode];
    if (tOneWay < minFlight) return;

    const tripMin  = tOneWay * 2 + 5;
    if (tripMin > sessionMin) return;

    const maxTrips = Math.min(Math.floor(sessionMin / tripMin), maxTripsAllowed);
    if (maxTrips < 1) return;

    const countryStock = stockData?.stocks?.[country.code] ?? null;
    const lastUpdate   = countryStock?.update ?? 0;
    const ageH         = lastUpdate ? (now - lastUpdate) / 3600 : Infinity;
    if (lastUpdate && ageH > freshMax) return;

    const confidence = stockConfidence(lastUpdate, ageH);

    const yataQty = {};
    if (countryStock?.stocks) {
      countryStock.stocks.forEach(s => { yataQty[s.id] = s.quantity; });
    }

    const availableItems = ITEMS.filter(item => {
      if (item.country !== country.code) return false;
      if (item.type === 'plushie' && !wantPlush) return false;
      if (item.type === 'flower'  && !wantFlower) return false;
      if (item.type === 'drug'    && !wantDrug)   return false;
      return true;
    });
    if (availableItems.length === 0) return;

    const typed = {};
    availableItems.forEach(item => {
      const sellPrice = priceData[item.name] || item.sell;
      const profit    = sellPrice - item.buy;
      if (!typed[item.type]) typed[item.type] = [];
      typed[item.type].push({ ...item, effectiveSell: sellPrice, unitProfit: profit });
    });
    Object.values(typed).forEach(arr => arr.sort((a, b) => b.unitProfit - a.unitProfit));

    const allItems = Object.values(typed).flat().sort((a, b) => b.unitProfit - a.unitProfit);
    let remainingSlots = getBaseCapacity();
    const breakdown = [];

    allItems.forEach(item => {
      if (remainingSlots <= 0) return;
      const cap = getCapacityForType(item.type);
      const bonusSlots = cap - getBaseCapacity();
      const slotsForItem = Math.min(remainingSlots + bonusSlots, cap);
      if (slotsForItem <= 0) return;
      const qty = Math.min(5, slotsForItem);

      let stockProba;
      if (!lastUpdate) {
        stockProba = 0.5;
      } else if (yataQty[item.id] !== undefined) {
        stockProba = Math.min(1, yataQty[item.id] / 100) * confidence.score;
      } else {
        stockProba = confidence.score * 0.6;
      }

      breakdown.push({
        ...item,
        qty,
        stockProba,
        grossProfit:    item.unitProfit * qty,
        adjustedProfit: item.unitProfit * qty * stockProba,
      });
      remainingSlots -= qty;
    });
    if (breakdown.length === 0) return;

    const travelCost    = budgetCap > 0 ? Math.min(budgetCap, country.cost) : country.cost;
    const rawProfitTrip = breakdown.reduce((s, b) => s + b.grossProfit, 0);
    const adjProfitTrip = breakdown.reduce((s, b) => s + b.adjustedProfit, 0);
    const netPerTrip    = adjProfitTrip - travelCost * 2;
    const totalProfit   = netPerTrip * maxTrips;
    const profitPerHour = totalProfit / (sessionMin / 60);

    /* Timeline des trips */
    const trips = Array.from({ length: maxTrips }, (_, i) => {
      const startTs   = departTs + i * tripMin * 60;
      const arriveTs  = startTs + tOneWay * 60;
      const returnTs  = arriveTs + 5 * 60;
      const landTs    = returnTs + tOneWay * 60;
      return { startTs, arriveTs, returnTs, landTs };
    });

    runs.push({
      country, tOneWay, tripMin, maxTrips,
      rawProfitTrip, adjProfitTrip, netPerTrip,
      totalProfit, profitPerHour,
      breakdown, confidence, lastUpdate, ageH,
      travelCost, trips, departTs,
    });
  });

  runs.sort((a, b) => b.totalProfit - a.totalProfit);
  renderResults(runs, mode);
}

/* ── Rendu ─────────────────────────────────────────────────────── */
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

  empty.style.display   = 'none';
  summary.style.display = 'grid';

  const best = runs[0];
  document.getElementById('s_runs').textContent       = runs.length;
  document.getElementById('s_bestProfit').textContent  = '$' + fmt(best.totalProfit);
  document.getElementById('s_bestTrips').textContent   = best.maxTrips + 'x';
  document.getElementById('s_bestPerHour').textContent = '$' + fmt(best.profitPerHour) + '/h';

  runs.slice(0, 8).forEach((run, i) => runList.appendChild(buildRunCard(run, i, mode)));

  if (runs.length > 8) {
    const more = document.createElement('p');
    more.style.cssText = 'text-align:center;color:var(--text3);font-size:12px;padding:.5rem';
    more.textContent   = `+ ${runs.length - 8} autres destinations calculées`;
    runList.appendChild(more);
  }
}

function buildRunCard(run, rank, mode) {
  const isBest = rank === 0;
  const modeLabel = { standard: 'Standard', airstrip: 'Airstrip', wlt: 'WLT/BC' }[mode];

  const freshnessChip = run.lastUpdate
    ? `<span class="chip ${run.confidence.score > 0.8 ? 'chip-green' : run.confidence.score > 0.5 ? 'chip-amber' : 'chip-red'}">Données ${run.confidence.label}</span>`
    : `<span class="chip chip-amber">Stock inconnu</span>`;

  const itemsHTML = run.breakdown.map(b => {
    const color    = TYPE_COLORS[b.type] || '#888';
    const probaStr = Math.round(b.stockProba * 100) + '%';
    return `<span class="item-chip" title="Proba stock: ${probaStr}">
      <span class="dot" style="background:${color}"></span>
      <span>${b.name} ×${b.qty}</span>
      <span class="gain">+$${fmt(b.grossProfit)}</span>
      <span class="chip chip-amber" style="font-size:10px;padding:1px 5px">${probaStr}</span>
    </span>`;
  }).join('');

  /* Mini-timeline textuelle */
  const firstTrip = run.trips[0];
  const lastTrip  = run.trips[run.trips.length - 1];
  const tlText    = `Départ ${fmtHour(firstTrip.startTs)} → Arrivée ${fmtHour(firstTrip.arriveTs)} → Retour ${fmtHour(firstTrip.returnTs)} → Atterrissage ${fmtHour(firstTrip.landTs)}`;

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
            <span class="chip">✈ ${run.tOneWay} min</span>
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
        <div class="prow-label">Par trip (net)</div>
        <div class="prow-val ${run.netPerTrip < 0 ? 'red' : 'green'}">$${fmt(run.netPerTrip)}</div>
      </div>
      <div class="prow-item">
        <div class="prow-label">Par heure</div>
        <div class="prow-val accent">$${fmt(run.profitPerHour)}/h</div>
      </div>
      <div class="prow-item">
        <div class="prow-label">Frais vol (A/R)</div>
        <div class="prow-val" style="color:var(--text2)">$${fmt(run.travelCost * 2)}</div>
      </div>
    </div>

    <div class="items-grid">${itemsHTML}</div>

    <button class="btn-timeline" onclick="openTimeline(${rank})">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      Voir la timeline des stocks — ${tlText}
    </button>
  `;
  card._runData = run;
  return card;
}

/* ── Timeline modal ─────────────────────────────────────────────── */
let currentRuns = [];

function openTimeline(rank) {
  const cards = document.querySelectorAll('.run-card');
  const run   = cards[rank]._runData;
  if (!run) return;

  document.getElementById('modalTitle').textContent =
    run.country.flag + ' ' + run.country.name + ' — Timeline des stocks';

  document.getElementById('modalContent').innerHTML = buildTimelineHTML(run);
  document.getElementById('timelineModal').style.display = 'flex';
}

function closeModal(e) {
  if (e.target === document.getElementById('timelineModal'))
    document.getElementById('timelineModal').style.display = 'none';
}

function buildTimelineHTML(run) {
  const sessionMin = parseInt(document.getElementById('sessionHours').value) * 60;
  const departTs   = run.departTs;
  const endTs      = departTs + sessionMin * 60;
  const totalSec   = endTs - departTs;

  /* Événements */
  const events = [];
  run.trips.forEach((t, i) => {
    events.push({ ts: t.startTs,  type: 'depart',  label: `Départ T${i+1}` });
    events.push({ ts: t.arriveTs, type: 'arrive',  label: `Arrivée T${i+1}` });
    events.push({ ts: t.returnTs, type: 'return',  label: `Décollage retour T${i+1}` });
    events.push({ ts: t.landTs,   type: 'land',    label: `Atterrissage T${i+1}` });
  });

  /* Ticks de restock toutes les 15 min */
  const ticks = [];
  let tickTs = departTs - (departTs % (15 * 60)) + 15 * 60;
  while (tickTs < endTs) {
    ticks.push(tickTs);
    tickTs += 15 * 60;
  }

  /* Calcul du stock estimé au fil du temps
     On part du stock YATA (si dispo), et on estime :
     - diminution progressive pendant les fenêtres où les joueurs arrivent
     - restock à chaque tick de 15 min (partiel, estimé) */
  const mainItem = run.breakdown[0];
  const yataInitQty = stockData?.stocks?.[run.country.code]?.stocks?.find(s => s.id === mainItem?.id)?.quantity ?? 500;
  const RESTOCK_AMT = 2500;
  const DECAY_RATE  = 20;   // items perdus par minute environ (estimation)

  /* Génération de points de stock sur la timeline (toutes les 5 min) */
  const stockPoints = [];
  let curStock = yataInitQty;
  for (let t = departTs; t <= endTs; t += 5 * 60) {
    const sinceLastTick = (t % (15 * 60));
    if (sinceLastTick < 5 * 60 && t > departTs) curStock = Math.min(2500, curStock + RESTOCK_AMT);
    curStock = Math.max(0, curStock - DECAY_RATE * 5);
    stockPoints.push({ ts: t, qty: curStock });
  }

  const maxStock = 2500;
  const chartH   = 120;
  const chartW   = 100;   // en % via SVG viewBox

  /* Chemin SVG de la courbe de stock */
  const pathPoints = stockPoints.map((p, i) => {
    const x = ((p.ts - departTs) / totalSec) * 100;
    const y = chartH - (p.qty / maxStock) * chartH;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');

  /* Barres verticales des événements */
  const eventColors = { depart: '#4f7ef8', arrive: '#22c55e', return: '#f59e0b', land: '#a78bfa' };
  const eventBars = events.filter(e => e.ts >= departTs && e.ts <= endTs).map(e => {
    const x = ((e.ts - departTs) / totalSec * 100).toFixed(2);
    const color = eventColors[e.type] || '#888';
    return `<line x1="${x}" y1="0" x2="${x}" y2="${chartH}" stroke="${color}" stroke-width="0.8" stroke-dasharray="3,2"/>`;
  }).join('');

  /* Barres de restock */
  const restockBars = ticks.filter(t => t >= departTs && t <= endTs).map(t => {
    const x = ((t - departTs) / totalSec * 100).toFixed(2);
    return `<line x1="${x}" y1="0" x2="${x}" y2="${chartH}" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>`;
  }).join('');

  /* Légende des événements */
  const legendItems = events.filter(e => e.ts >= departTs && e.ts <= endTs).map(e => {
    const color = eventColors[e.type] || '#888';
    return `<span class="tl-legend-item">
      <span style="display:inline-block;width:10px;height:2px;background:${color};vertical-align:middle;margin-right:4px"></span>
      ${e.label} <span style="color:var(--text3)">${fmtHour(e.ts)}</span>
    </span>`;
  }).join('');

  /* Liste des items sur place */
  const itemRows = run.breakdown.map(b => {
    const color    = TYPE_COLORS[b.type] || '#888';
    const probaStr = Math.round(b.stockProba * 100) + '%';
    const barW     = Math.round(b.stockProba * 100);
    return `<div class="tl-item-row">
      <span class="dot" style="background:${color}"></span>
      <span style="flex:1">${b.name}</span>
      <span style="color:var(--text2)">×${b.qty}</span>
      <div class="tl-proba-bar">
        <div class="tl-proba-fill" style="width:${barW}%;background:${color}"></div>
      </div>
      <span style="color:${color};min-width:32px;text-align:right">${probaStr}</span>
      <span style="color:var(--green);min-width:80px;text-align:right">+$${fmt(b.grossProfit)}</span>
    </div>`;
  }).join('');

  /* Timeline trips */
  const tripRows = run.trips.map((t, i) => `
    <div class="tl-trip-row">
      <span class="tl-trip-num">T${i+1}</span>
      <span class="tl-trip-seg" style="background:#4f7ef822;border:1px solid #4f7ef844">
        ✈ Départ ${fmtHour(t.startTs)}
      </span>
      <span class="tl-arrow">→</span>
      <span class="tl-trip-seg" style="background:#22c55e22;border:1px solid #22c55e44">
        🛬 Arrivée ${fmtHour(t.arriveTs)}
      </span>
      <span class="tl-arrow">→</span>
      <span class="tl-trip-seg" style="background:#f59e0b22;border:1px solid #f59e0b44">
        🛒 Sur place 5 min
      </span>
      <span class="tl-arrow">→</span>
      <span class="tl-trip-seg" style="background:#a78bfa22;border:1px solid #a78bfa44">
        🛬 Retour ${fmtHour(t.landTs)}
      </span>
    </div>
  `).join('');

  return `
    <div class="tl-section-title">Stock estimé — ${mainItem ? mainItem.name : 'item principal'}</div>
    <div class="tl-chart-wrap">
      <svg viewBox="0 0 100 ${chartH}" preserveAspectRatio="none" style="width:100%;height:${chartH}px;display:block">
        ${restockBars}
        ${eventBars}
        <path d="${pathPoints}" fill="none" stroke="#4f7ef8" stroke-width="1.5"/>
        <path d="${pathPoints} L100,${chartH} L0,${chartH} Z" fill="rgba(79,126,248,0.1)"/>
      </svg>
      <div class="tl-chart-labels">
        <span>${fmtHour(departTs)}</span>
        <span style="color:var(--text3);font-size:10px">Stock estimé (ordre de grandeur)</span>
        <span>${fmtHour(endTs)}</span>
      </div>
      <div class="tl-chart-ylabels">
        <span>2500</span>
        <span>0</span>
      </div>
    </div>
    <div class="tl-legend">${legendItems}</div>

    <div class="tl-section-title" style="margin-top:1.25rem">Items à acheter</div>
    <div>${itemRows}</div>

    <div class="tl-section-title" style="margin-top:1.25rem">Détail des trips</div>
    <div class="tl-trips">${tripRows}</div>

    <div class="tl-summary">
      <span>💰 Profit total estimé : <strong class="green">$${fmt(run.totalProfit)}</strong></span>
      <span>⏱ Temps utilisé : <strong>${Math.round(run.tripMin * run.maxTrips / 60 * 10) / 10}h</strong></span>
    </div>
  `;
}

/* ── Helpers ────────────────────────────────────────────────────── */
function stockConfidence(lastUpdate, ageH) {
  if (!lastUpdate || ageH === Infinity) return { score: 0.5, label: 'inconnue', color: '#888' };
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

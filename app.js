/* ================================================================
   app.js — Torn Travel Optimizer
   ================================================================ */

let stockData = null, priceData = {}, excludedCountries = new Set();
let recomputeTimer = null, departMode = 'now', departCustomTime = null;

/* ── Init ── */
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
  const cached = localStorage.getItem('yataCache');
  if (cached) {
    try {
      stockData = JSON.parse(cached);
      const ageMin = Math.round((Date.now()/1000 - stockData.timestamp) / 60);
      document.getElementById('lastFetchInfo').textContent = `Cache YATA (${ageMin} min)`;
      setBanner('info', `📦 Données en cache (${ageMin} min). Clique "Actualiser YATA" pour rafraîchir.`);
      compute();
    } catch(e) { localStorage.removeItem('yataCache'); }
  }
});

/* ── Départ ── */
function setDepartNow() {
  departMode = 'now'; departCustomTime = null;
  document.getElementById('btnNow').classList.add('active');
  document.getElementById('departTime').value = '';
  scheduleRecompute();
}
function setDepartCustom() {
  const val = document.getElementById('departTime').value;
  if (!val) return;
  departMode = 'custom'; departCustomTime = val;
  document.getElementById('btnNow').classList.remove('active');
  scheduleRecompute();
}
function getDepartTs() {
  if (departMode === 'now') return Date.now()/1000;
  const [h,m] = departCustomTime.split(':').map(Number);
  const d = new Date(); d.setHours(h,m,0,0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate()+1);
  return d.getTime()/1000;
}
function fmtH(ts) {
  const d = new Date(ts*1000);
  return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
}

/* ── Slider vol ── */
function updateFlightLabel() {
  const v = parseInt(document.getElementById('minFlightTime').value);
  if (v===0) {
    document.getElementById('minFlightLabel').textContent = 'Tous';
    document.getElementById('minFlightHint').textContent  = 'Toutes les destinations incluses.';
    return;
  }
  const h=Math.floor(v/60), m=v%60;
  document.getElementById('minFlightLabel').textContent = (h?h+'h':'')+(m?m+'min':'')+' min';
  const n = COUNTRIES.filter(c=>c.timeMin.airstrip>=v).length;
  document.getElementById('minFlightHint').textContent = `${n} destination${n>1?'s':''} retenue${n>1?'s':''}.`;
}

/* ── Clé API ── */
function saveKey() {
  const k = document.getElementById('apiKey').value.trim();
  if (!k) return;
  sessionStorage.setItem('tornKey', k);
  document.getElementById('keyStatus').textContent = '✓ enregistrée';
}

/* ── Pays ── */
function buildCountryFilters() {
  const container = document.getElementById('countryFilters');
  COUNTRIES.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'country-btn';
    btn.innerHTML = `<img src="https://flagcdn.com/16x12/${c.flag}.png" width="16" height="12"
      style="vertical-align:middle;margin-right:4px;border-radius:1px"
      onerror="this.style.display='none'">${c.name.split(' ')[0]}`;
    btn.onclick = () => {
      if (excludedCountries.has(c.code)) { excludedCountries.delete(c.code); btn.classList.remove('excluded'); }
      else { excludedCountries.add(c.code); btn.classList.add('excluded'); }
      scheduleRecompute();
    };
    container.appendChild(btn);
  });
}

/* ── Capacité ── */
function getBaseCapacity() {
  const mode = document.getElementById('flightMode').value;
  return (mode==='standard'?5:15)
    +(parseInt(document.getElementById('suitcase').value)||0)
    +(parseInt(document.getElementById('factionBonus').value)||0)
    +(parseInt(document.getElementById('lingerieBonus').value)||0)
    +(parseInt(document.getElementById('cruiseBonus').value)||0);
}
function updateCapacity() {
  document.getElementById('capacityDisplay').textContent = getBaseCapacity()+' items';
}

/* ── Recompute ── */
function scheduleRecompute() {
  clearTimeout(recomputeTimer);
  recomputeTimer = setTimeout(()=>{ if(stockData!==null) compute(); }, 250);
}

/* ── Fetch ── */
async function fetchAndCompute() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('loading');
  setBanner('info','⏳ Récupération des stocks YATA…');
  document.getElementById('summaryCards').style.display='none';
  document.getElementById('emptyState').style.display='none';
  document.getElementById('runList').innerHTML='';

  try {
    const resp = await fetch('https://yata.yt/api/v1/travel/export/');
    if (!resp.ok) throw new Error();
    stockData = await resp.json();
    localStorage.setItem('yataCache', JSON.stringify(stockData));
    document.getElementById('lastFetchInfo').textContent = 'YATA '+timeAgo(stockData.timestamp);
    setBanner('info','✅ Stocks YATA chargés.');
  } catch(e) {
    const c = localStorage.getItem('yataCache');
    if (c) { stockData=JSON.parse(c); setBanner('warn','⚠️ YATA inaccessible — cache utilisé.'); }
    else    { stockData={}; setBanner('warn','⚠️ YATA inaccessible — prix historiques.'); }
  }

  /* Prix marché Torn via API */
  const key = sessionStorage.getItem('tornKey');
  if (key) {
    try {
      setBanner('info','⏳ Récupération des prix marché Torn…');
      const r = await fetch(`https://api.torn.com/torn/?selections=items&key=${key}`);
      const d = await r.json();
      if (d.items) {
        priceData = {};
        Object.entries(d.items).forEach(([id, item]) => {
          if (item.market_value > 0) {
            priceData[parseInt(id)] = item.market_value;
            priceData[item.name]    = item.market_value;
          }
        });
        setBanner('info','✅ Stocks YATA + prix marché Torn chargés en direct.');
      }
    } catch(_) { setBanner('warn','⚠️ Prix Torn API indisponibles — valeurs estimées.'); }
  }

  compute();
  btn.classList.remove('loading');
}

/* ── Modèle de stock ──────────────────────────────────────────────
   On simule l'évolution du stock entre "maintenant" et l'arrivée.
   Logique :
   - Le stock descend linéairement selon vidageMin (temps pour vider 2500 items)
   - À chaque tick de 15 min, si stock <= 0, restock possible
   - Le restock se produit après vidageMin/2 minutes d'attente post-vidage
   - On retourne le stock estimé à l'arrivée + une probabilité 0-1
────────────────────────────────────────────────────────────────── */
function estimateStockAtArrival(item, yataQtyNow, lastUpdateTs, arrivalTs) {
  const nowTs = Date.now()/1000;
  /* Si pas de données YATA, on retourne une proba neutre */
  if (!lastUpdateTs || yataQtyNow === undefined) return { qty: null, proba: 0.5, label: 'inconnu' };

  const ageAtUpdate = nowTs - lastUpdateTs;
  const timeToArrival = arrivalTs - nowTs; /* secondes jusqu'à l'arrivée */
  const totalElapsed = ageAtUpdate + timeToArrival; /* secondes depuis la mesure YATA */

  const { restockQty, vidageMin } = item;
  const decayPerSec = restockQty / (vidageMin * 60);
  const restockDelay = (vidageMin / 2) * 60; /* secondes avant restock */

  /* Simuler minute par minute */
  let stock = yataQtyNow;
  let t = 0;
  let emptyAt = null;

  const STEP = 60;
  while (t < totalElapsed) {
    stock = Math.max(0, stock - decayPerSec * STEP);
    if (stock === 0 && emptyAt === null) emptyAt = t;

    /* Restock : si vide depuis restockDelay et qu'on est sur un tick de 15 min */
    if (emptyAt !== null && (t - emptyAt) >= restockDelay) {
      const absoluteT = lastUpdateTs + t;
      const minInTick = (absoluteT % (15*60));
      if (minInTick < STEP) { /* on est sur un tick */
        stock = restockQty;
        emptyAt = null;
      }
    }
    t += STEP;
  }

  /* Probabilité basée sur le stock estimé */
  let proba, label;
  if (stock >= restockQty * 0.5) { proba = 0.90; label = `~${Math.round(stock)} en stock`; }
  else if (stock >= 100)          { proba = 0.65; label = `~${Math.round(stock)} en stock (faible)`; }
  else if (stock > 0)             { proba = 0.30; label: 'stock très faible'; label = 'stock très faible'; }
  else {
    /* Stock vide — est-ce qu'un restock est imminent ? */
    const timeSinceEmpty = emptyAt !== null ? totalElapsed - emptyAt : restockDelay*2;
    if (timeSinceEmpty >= restockDelay * 0.8) { proba = 0.55; label = 'restock probable à l\'arrivée'; }
    else { proba = 0.15; label = 'stock vide, restock lointain'; }
  }

  return { qty: Math.round(stock), proba, label };
}

/* ── Calcul principal ── */
function compute() {
  const mode            = document.getElementById('flightMode').value;
  const sessionMin      = parseInt(document.getElementById('sessionHours').value)*60;
  const budgetCap       = parseInt(document.getElementById('travelBudget').value)||0;
  const freshMax        = parseFloat(document.getElementById('freshnessFilter').value);
  const minFlight       = parseInt(document.getElementById('minFlightTime').value)||0;
  const maxTripsAllowed = parseInt(document.getElementById('maxTrips').value)||999;
  const canFinishAbroad = document.getElementById('finishAbroad').value==='yes';
  const wantPlush       = document.getElementById('f_plushie').checked;
  const wantFlower      = document.getElementById('f_flower').checked;
  const wantDrug        = document.getElementById('f_drug').checked;
  const toyBonus        = parseInt(document.getElementById('jobToy').value)||0;
  const flowerBonus     = parseInt(document.getElementById('jobFlower').value)||0;
  const baseCapacity    = getBaseCapacity();

  const now = Date.now()/1000, departTs = getDepartTs(), runs = [];

  COUNTRIES.forEach(country => {
    if (excludedCountries.has(country.code)) return;
    const tOneWay = country.timeMin[mode];
    if (tOneWay < minFlight) return;

    const tripMinFull = tOneWay*2+5;
    let maxTrips = canFinishAbroad
      ? (sessionMin >= tOneWay ? Math.floor((sessionMin-tOneWay)/tripMinFull)+1 : 0)
      : Math.floor(sessionMin/tripMinFull);
    maxTrips = Math.min(maxTrips, maxTripsAllowed);
    if (maxTrips < 1) return;

    const countryStock = stockData?.stocks?.[country.code]??null;
    const lastUpdate   = countryStock?.update??0;
    const ageH         = lastUpdate?(now-lastUpdate)/3600:Infinity;
    if (lastUpdate && ageH > freshMax) return;

    const yataQtyMap = {};
    if (countryStock?.stocks) countryStock.stocks.forEach(s=>{ yataQtyMap[s.id]=s.quantity; });

    const avail = ITEMS.filter(item => {
      if (item.country !== country.code) return false;
      if (item.type==='plushie' && !wantPlush) return false;
      if (item.type==='flower'  && !wantFlower) return false;
      if (item.type==='drug'    && !wantDrug)   return false;
      return true;
    });
    if (avail.length === 0) return;

    /* Prix via API Torn (tornId en priorité, puis nom, puis fallback statique) */
    const firstArrivalTs = departTs + tOneWay*60;

    const sorted = avail.map(item => {
      const sellPrice = priceData[item.tornId] || priceData[item.name] || item.sell;
      const yataQty   = yataQtyMap[item.id];
      const stockEst  = estimateStockAtArrival(item, yataQty, lastUpdate, firstArrivalTs);
      return { ...item, effectiveSell: sellPrice, unitProfit: sellPrice - item.buy, stockEst };
    }).sort((a,b) => b.unitProfit - a.unitProfit);

    /* Allocation : base capacity pour tous, bonus toy/flower en plus */
    const breakdown = [];
    let baseRem = baseCapacity, toyRem = toyBonus, flowerRem = flowerBonus;

    sorted.forEach(item => {
      let qty = 0;
      if (baseRem > 0) { qty = baseRem; baseRem = 0; }
      if (item.type==='plushie' && toyRem>0)    { qty += toyRem;    toyRem=0; }
      if (item.type==='flower'  && flowerRem>0) { qty += flowerRem; flowerRem=0; }
      if (qty <= 0) return;

      breakdown.push({
        ...item, qty,
        stockProba:     item.stockEst.proba,
        stockLabel:     item.stockEst.label,
        stockQtyEst:    item.stockEst.qty,
        grossProfit:    item.unitProfit * qty,
        adjustedProfit: item.unitProfit * qty * item.stockEst.proba,
        yataQtyNow:     yataQtyMap[item.id] ?? null,
      });
    });
    if (breakdown.length === 0) return;

    const travelCost      = budgetCap>0 ? Math.min(budgetCap, country.cost) : country.cost;
    const rawProfitTrip   = breakdown.reduce((s,b)=>s+b.grossProfit, 0);
    const adjProfitTrip   = breakdown.reduce((s,b)=>s+b.adjustedProfit, 0);
    const totalTravelCost = canFinishAbroad
      ? travelCost*2*(maxTrips-1)+travelCost
      : travelCost*2*maxTrips;
    const totalProfit   = adjProfitTrip*maxTrips - totalTravelCost;
    const profitPerHour = totalProfit / (sessionMin/60);

    const trips = Array.from({length:maxTrips}, (_,i) => {
      const startTs      = departTs + i*tripMinFull*60;
      const arriveTs     = startTs + tOneWay*60;
      const returnTs     = arriveTs + 5*60;
      const isLastAbroad = canFinishAbroad && i===maxTrips-1;
      return { startTs, arriveTs, returnTs, landTs: isLastAbroad?null:returnTs+tOneWay*60, isLastAbroad };
    });

    runs.push({
      country, tOneWay, tripMin:tripMinFull, maxTrips,
      rawProfitTrip, adjProfitTrip, netPerTrip: adjProfitTrip-travelCost*2,
      totalProfit, profitPerHour,
      breakdown, lastUpdate, ageH,
      travelCost, trips, departTs, canFinishAbroad,
      totalCapacity: baseCapacity+toyBonus+flowerBonus,
    });
  });

  runs.sort((a,b)=>b.totalProfit-a.totalProfit);
  window._runs = runs;
  renderResults(runs, mode);
}

/* ── Rendu ── */
function renderResults(runs, mode) {
  const runList = document.getElementById('runList');
  const summary = document.getElementById('summaryCards');
  const empty   = document.getElementById('emptyState');
  runList.innerHTML = '';
  if (runs.length===0) { summary.style.display='none'; empty.style.display='flex'; return; }
  empty.style.display = 'none'; summary.style.display = 'grid';
  const best = runs[0];
  document.getElementById('s_runs').textContent       = runs.length;
  document.getElementById('s_bestProfit').textContent  = '$'+fmt(best.totalProfit);
  document.getElementById('s_bestTrips').textContent   = best.maxTrips+'x';
  document.getElementById('s_bestPerHour').textContent = '$'+fmt(best.profitPerHour)+'/h';

  runs.slice(0,5).forEach((run,i) => runList.appendChild(buildRunCard(run,i,mode)));
  if (runs.length>5) {
    const more = document.createElement('p');
    more.style.cssText='text-align:center;color:var(--text3);font-size:12px;padding:.75rem;cursor:pointer;border:1px solid var(--border);border-radius:var(--radius-sm);margin-top:.5rem';
    more.textContent = `Voir les ${runs.length-5} autres destinations ▼`;
    more.onclick = ()=>{ runs.slice(5).forEach((r,i)=>runList.insertBefore(buildRunCard(r,i+5,mode),more)); more.remove(); };
    runList.appendChild(more);
  }
}

function flagImg(code, size=24) {
  const h = Math.round(size*0.75);
  return `<img src="https://flagcdn.com/${size}x${h}/${code}.png" width="${size}" height="${h}"
    style="border-radius:2px;vertical-align:middle;flex-shrink:0"
    onerror="this.style.display='none'">`;
}

function itemImg(tornId) {
  return `https://www.torn.com/images/items/${tornId}/large.png`;
}

function buildRunCard(run, rank, mode) {
  const isBest = rank===0;
  const modeLabel = {standard:'Standard',airstrip:'Airstrip',wlt:'WLT/BC'}[mode];

  /* Badge fraîcheur */
  const freshnessChip = (() => {
    if (!run.lastUpdate) return `<span class="chip chip-amber">Stock inconnu</span>`;
    const ageH = run.ageH;
    const cls  = ageH<1?'chip-green':ageH<4?'chip-amber':'chip-red';
    const lbl  = ageH<1?'< 1h':ageH<2?'< 2h':ageH<4?'< 4h':ageH<8?'< 8h':'> 8h';
    return `<span class="chip ${cls}">Données ${lbl}</span>`;
  })();

  /* Items : max 5 affichés, design épuré avec image, nom, quantité, profit, proba */
  const itemsHTML = run.breakdown.slice(0,5).map(b => {
    const color    = TYPE_COLORS[b.type]||'#888';
    const probaStr = Math.round(b.stockProba*100)+'%';
    const probaCls = b.stockProba>0.7?'chip-green':b.stockProba>0.4?'chip-amber':'chip-red';
    return `<div class="item-row">
      <img src="${itemImg(b.tornId)}" alt="${b.name}"
        style="width:44px;height:44px;object-fit:contain;border-radius:8px;background:var(--bg3);flex-shrink:0">
      <div class="item-row-info">
        <div class="item-row-name">${b.name}</div>
        <div class="item-row-sub">×${b.qty} &nbsp;·&nbsp; achat $${fmt(b.buy*b.qty)} &nbsp;·&nbsp; revente $${fmt(b.effectiveSell*b.qty)}</div>
      </div>
      <div class="item-row-right">
        <div class="item-row-profit">+$${fmt(b.grossProfit)}</div>
        <span class="chip ${probaCls}" style="font-size:10px">${probaStr} stock</span>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">${b.stockLabel}</div>
      </div>
    </div>`;
  }).join('');

  const firstTrip = run.trips[0];
  const tlPreview = `${fmtH(firstTrip.startTs)} → ${fmtH(firstTrip.arriveTs)}${firstTrip.landTs?' → '+fmtH(firstTrip.landTs):''}`;

  const card = document.createElement('div');
  card.className = 'run-card'+(isBest?' best':'');
  card.innerHTML = `
    ${isBest?'<div class="best-badge">MEILLEUR RUN</div>':''}
    <div class="run-header">
      <div class="run-left">
        ${flagImg(run.country.flag, 28)}
        <div style="margin-left:10px">
          <div class="run-country">${run.country.name}</div>
          <div class="run-meta-chips">
            <span class="chip">✈ ${run.tOneWay} min</span>
            <span class="chip">🔄 ${run.maxTrips} trip${run.maxTrips>1?'s':''}</span>
            <span class="chip">${modeLabel} — ${run.totalCapacity} items</span>
            ${freshnessChip}
            ${run.canFinishAbroad?'<span class="chip chip-blue">Finit à l\'étranger</span>':''}
          </div>
        </div>
      </div>
      <div class="run-profit-block">
        <div class="profit-total ${run.totalProfit<0?'red':''}">$${fmt(run.totalProfit)}</div>
        <div class="profit-sub">profit total estimé</div>
      </div>
    </div>
    <hr class="run-divider"/>
    <div class="run-profit-row">
      <div class="prow-item"><div class="prow-label">Par trip (brut)</div><div class="prow-val">$${fmt(run.rawProfitTrip)}</div></div>
      <div class="prow-item"><div class="prow-label">Par trip (net)</div><div class="prow-val ${run.netPerTrip<0?'red':'green'}">$${fmt(run.netPerTrip)}</div></div>
      <div class="prow-item"><div class="prow-label">Par heure</div><div class="prow-val accent">$${fmt(run.profitPerHour)}/h</div></div>
      <div class="prow-item"><div class="prow-label">Frais vol</div><div class="prow-val" style="color:var(--text2)">$${fmt(run.travelCost*2)}/trip</div></div>
    </div>
    <div class="items-stack">${itemsHTML}</div>
    <button class="btn-timeline" onclick="openTimeline(${rank})">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      Timeline détaillée — ${tlPreview}
    </button>`;
  return card;
}

/* ── Timeline modal ── */
function openTimeline(rank) {
  const run = window._runs?.[rank];
  if (!run) return;
  document.getElementById('modalTitle').innerHTML =
    flagImg(run.country.flag,20)+' <span style="margin-left:6px">'+run.country.name+' — Timeline</span>';
  document.getElementById('modalContent').innerHTML = buildTimelineHTML(run);
  document.getElementById('timelineModal').style.display = 'flex';
}
function closeModal(e) {
  if (e.target===document.getElementById('timelineModal'))
    document.getElementById('timelineModal').style.display='none';
}

function buildTimelineHTML(run) {
  const sessionMin = parseInt(document.getElementById('sessionHours').value)*60;
  const departTs = run.departTs, endTs = departTs+sessionMin*60;
  const WINDOW_SEC = Math.min(2.5*3600, endTs-departTs);
  const chartH = 120, W = 660;

  /* Courbe de stock pour l'item principal */
  const mainItem = run.breakdown[0];
  const yataInit = mainItem?.yataQtyNow ?? mainItem?.restockQty ?? 2500;
  const RESTOCK  = mainItem?.restockQty ?? 2500;
  const vidageSec = (mainItem?.vidageMin ?? 60)*60;
  const decayPerSec = RESTOCK / vidageSec;
  const restockDelaySec = vidageSec / 2;

  let stock = yataInit, emptyAt = null;
  const pts = [];
  let lastTickBase = Math.floor((Date.now()/1000)/(15*60))*(15*60);

  for (let t = departTs; t <= endTs; t += 60) {
    stock = Math.max(0, stock - decayPerSec*60);
    if (stock===0 && emptyAt===null) emptyAt = t;
    if (emptyAt!==null && (t-emptyAt)>=restockDelaySec) {
      const minInTick = t%(15*60);
      if (minInTick < 60) { stock=RESTOCK; emptyAt=null; }
    }
    pts.push({ts:t, qty:stock});
  }

  const totalSec = endTs-departTs;
  const numPanels = Math.ceil(totalSec/WINDOW_SEC);

  function tsX(ts,ps){ return ((ts-ps)/WINDOW_SEC*W).toFixed(1); }
  function qY(q){ return (chartH-(q/RESTOCK)*chartH).toFixed(1); }

  let svgs = '';
  for (let p=0; p<numPanels; p++) {
    const ps=departTs+p*WINDOW_SEC, pe=Math.min(ps+WINDOW_SEC,endTs);
    const panPts=pts.filter(pt=>pt.ts>=ps&&pt.ts<=pe);
    if (!panPts.length) continue;
    const pathD=panPts.map((pt,i)=>`${i===0?'M':'L'}${tsX(pt.ts,ps)},${qY(pt.qty)}`).join(' ');
    const fillD=pathD+` L${W},${chartH} L0,${chartH} Z`;

    let ticks='';
    let tk=Math.ceil(ps/(15*60))*15*60;
    while(tk<=pe){ ticks+=`<line x1="${tsX(tk,ps)}" y1="0" x2="${tsX(tk,ps)}" y2="${chartH}" stroke="rgba(255,255,255,.05)" stroke-width="0.8"/>`;tk+=15*60; }

    let evs='';
    run.trips.forEach(t=>{
      if(t.startTs>=ps&&t.startTs<=pe)
        evs+=`<line x1="${tsX(t.startTs,ps)}" y1="0" x2="${tsX(t.startTs,ps)}" y2="${chartH}" stroke="#4f7ef8" stroke-width="1" stroke-dasharray="4,3"/>`;
      if(t.arriveTs>=ps&&t.arriveTs<=pe)
        evs+=`<line x1="${tsX(t.arriveTs,ps)}" y1="0" x2="${tsX(t.arriveTs,ps)}" y2="${chartH}" stroke="#ef4444" stroke-width="2"/>`;
    });

    let lbls=''; let lt=Math.ceil(ps/(30*60))*30*60;
    while(lt<=pe){ lbls+=`<text x="${tsX(lt,ps)}" y="${chartH+13}" font-size="9" fill="rgba(255,255,255,.3)" text-anchor="middle">${fmtH(lt)}</text>`;lt+=30*60; }

    svgs+=`<svg viewBox="0 0 ${W} ${chartH+16}" width="${W}" height="${chartH+16}" style="display:block;flex-shrink:0">
      <text x="2" y="9" font-size="8" fill="rgba(255,255,255,.2)">${RESTOCK}</text>
      <text x="2" y="${chartH-1}" font-size="8" fill="rgba(255,255,255,.2)">0</text>
      ${ticks}${evs}
      <path d="${fillD}" fill="rgba(79,126,248,.08)"/>
      <path d="${pathD}" fill="none" stroke="#4f7ef8" stroke-width="1.5"/>
      ${lbls}
    </svg>`;
  }

  /* Items détaillés */
  const itemRows = run.breakdown.map(b=>{
    const color=TYPE_COLORS[b.type]||'#888';
    const barW=Math.round(b.stockProba*100);
    return `<div class="tl-item-row">
      <img src="${itemImg(b.tornId)}" style="width:40px;height:40px;object-fit:contain;border-radius:6px;background:var(--bg3);flex-shrink:0" onerror="this.style.display='none'">
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:13px">${b.name}</div>
        <div style="font-size:11px;color:var(--text3)">${b.stockLabel}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:12px;color:var(--text2)">×${b.qty} · achat $${fmt(b.buy*b.qty)}</div>
        <div style="font-size:13px;color:var(--green);font-weight:600">+$${fmt(b.grossProfit)}</div>
      </div>
      <div style="width:70px;flex-shrink:0">
        <div class="tl-proba-bar"><div class="tl-proba-fill" style="width:${barW}%;background:${color}"></div></div>
        <div style="font-size:10px;color:${color};text-align:right;margin-top:2px">${Math.round(b.stockProba*100)}%</div>
      </div>
    </div>`;
  }).join('');

  /* Trips — max 3 affichés */
  const tripRows = run.trips.slice(0,3).map((t,i)=>`
    <div class="tl-trip-row">
      <span class="tl-trip-num">T${i+1}</span>
      <span class="tl-trip-seg" style="background:rgba(79,126,248,.15);border:1px solid rgba(79,126,248,.3)">✈ ${fmtH(t.startTs)}</span>
      <span class="tl-arrow">→</span>
      <span class="tl-trip-seg" style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3)">🛬 Arrivée ${fmtH(t.arriveTs)}</span>
      ${t.isLastAbroad
        ?`<span class="tl-arrow">→</span><span class="tl-trip-seg" style="background:rgba(34,197,94,.2);border:1px solid rgba(34,197,94,.4)">🏖 Reste à l'étranger</span>`
        :`<span class="tl-arrow">→</span>
          <span class="tl-trip-seg" style="background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3)">✈ Retour ${fmtH(t.returnTs)}</span>
          <span class="tl-arrow">→</span>
          <span class="tl-trip-seg" style="background:rgba(167,139,250,.15);border:1px solid rgba(167,139,250,.3)">🛬 Torn ${fmtH(t.landTs)}</span>`
      }
    </div>`).join('');
  const moreTrips = run.maxTrips>3 ? `<p style="font-size:11px;color:var(--text3);margin-top:6px">… + ${run.maxTrips-3} trips identiques</p>` : '';

  return `
    <div class="tl-section-title">
      Stock estimé — ${mainItem?.name||'item principal'}
      <span style="font-size:11px;font-weight:400;margin-left:10px;color:var(--text3)">
        <span style="display:inline-block;width:10px;height:2px;background:#4f7ef8;vertical-align:middle"></span> Départ &nbsp;
        <span style="display:inline-block;width:10px;height:2px;background:#ef4444;vertical-align:middle"></span> Arrivée &nbsp;
        <span style="display:inline-block;width:10px;height:2px;background:rgba(255,255,255,.15);vertical-align:middle"></span> Tick 15min
      </span>
    </div>
    <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg3);padding:.5rem .75rem">
      <div style="display:flex;width:${W*numPanels}px">${svgs}</div>
    </div>
    <p style="font-size:10px;color:var(--text3);margin-top:4px">Simulation basée sur les données YATA + mécanique de restock Torn (vidage ÷ 2)</p>

    <div class="tl-section-title" style="margin-top:1.25rem">Items à acheter</div>
    ${itemRows}

    <div class="tl-section-title" style="margin-top:1.25rem">Trips</div>
    <div class="tl-trips">${tripRows}${moreTrips}</div>

    <div class="tl-summary">
      <span>💰 Profit total estimé : <strong class="green">$${fmt(run.totalProfit)}</strong></span>
      <span>⏱ ${Math.round(run.tripMin*run.maxTrips/60*10)/10}h utilisées / ${document.getElementById('sessionHours').value}h</span>
    </div>`;
}

/* ── Helpers ── */
function timeAgo(ts) {
  const d=Math.round((Date.now()/1000-ts)/60);
  if(d<1) return 'à l\'instant'; if(d<60) return `il y a ${d} min`; return `il y a ${Math.round(d/60)}h`;
}
function fmt(n){ return Math.round(n).toLocaleString('fr-FR'); }
function setBanner(type,msg){
  const el=document.getElementById('statusBanner');
  el.className=`banner banner-${type}`; el.textContent=msg; el.style.display='flex';
}

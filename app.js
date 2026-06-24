/* ================================================================
   app.js — Torn Travel Optimizer
   ================================================================ */

let stockData = null, priceData = {}, excludedCountries = new Set();
let recomputeTimer = null, departMode = 'now', departCustomTime = null;

document.addEventListener('DOMContentLoaded', () => {
  buildCountryFilters();
  updateCapacity();
  updateFlightLabel();
  setDepartNow();
  const savedKey = sessionStorage.getItem('tornKey');
  if (savedKey) { document.getElementById('apiKey').value=savedKey; document.getElementById('keyStatus').textContent='✓'; }
  const cached = localStorage.getItem('yataCache');
  if (cached) {
    try {
      stockData = JSON.parse(cached);
      const age = Math.round((Date.now()/1000-stockData.timestamp)/60);
      document.getElementById('lastFetchInfo').textContent=`Cache YATA (${age} min)`;
      setBanner('info',`📦 Cache YATA (${age} min) — clique "Actualiser YATA" pour rafraîchir.`);
      compute();
    } catch(e) { localStorage.removeItem('yataCache'); }
  }
});

/* ── Départ ── */
function setDepartNow() {
  departMode='now'; departCustomTime=null;
  document.getElementById('btnNow').classList.add('active');
  document.getElementById('departTime').value='';
  scheduleRecompute();
}
function setDepartCustom() {
  const val=document.getElementById('departTime').value; if(!val) return;
  departMode='custom'; departCustomTime=val;
  document.getElementById('btnNow').classList.remove('active');
  scheduleRecompute();
}
function getDepartTs() {
  if (departMode==='now') return Date.now()/1000;
  const [h,m]=departCustomTime.split(':').map(Number);
  const d=new Date(); d.setHours(h,m,0,0);
  if (d.getTime()<Date.now()) d.setDate(d.getDate()+1);
  return d.getTime()/1000;
}
function fmtH(ts) {
  const d=new Date(ts*1000);
  return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
}

function updateFlightLabel() {
  const v=parseInt(document.getElementById('minFlightTime').value);
  if (v===0) { document.getElementById('minFlightLabel').textContent='Tous'; document.getElementById('minFlightHint').textContent='Toutes les destinations incluses.'; return; }
  const h=Math.floor(v/60),m=v%60;
  document.getElementById('minFlightLabel').textContent=(h?h+'h':'')+(m?m+'min':'')+' min';
  const n=COUNTRIES.filter(c=>c.timeMin.airstrip>=v).length;
  document.getElementById('minFlightHint').textContent=`${n} destination${n>1?'s':''} retenue${n>1?'s':''}.`;
}

function saveKey() {
  const k=document.getElementById('apiKey').value.trim(); if(!k) return;
  sessionStorage.setItem('tornKey',k); document.getElementById('keyStatus').textContent='✓ enregistrée';
}

function buildCountryFilters() {
  const container=document.getElementById('countryFilters');
  COUNTRIES.forEach(c=>{
    const btn=document.createElement('button');
    btn.className='country-btn';
    btn.innerHTML=`<img src="https://flagcdn.com/16x12/${c.flag}.png" width="16" height="12" style="vertical-align:middle;margin-right:3px;border-radius:1px" onerror="this.style.display='none'">${c.name.split(' ')[0]}`;
    btn.onclick=()=>{
      if(excludedCountries.has(c.code)){excludedCountries.delete(c.code);btn.classList.remove('excluded');}
      else{excludedCountries.add(c.code);btn.classList.add('excluded');}
      scheduleRecompute();
    };
    container.appendChild(btn);
  });
}

function getBaseCapacity() {
  const mode=document.getElementById('flightMode').value;
  return (mode==='standard'?5:15)
    +(parseInt(document.getElementById('suitcase').value)||0)
    +(parseInt(document.getElementById('factionBonus').value)||0)
    +(parseInt(document.getElementById('lingerieBonus').value)||0)
    +(parseInt(document.getElementById('cruiseBonus').value)||0);
}
function updateCapacity() { document.getElementById('capacityDisplay').textContent=getBaseCapacity()+' items'; }

function scheduleRecompute() {
  clearTimeout(recomputeTimer);
  recomputeTimer=setTimeout(()=>{ if(stockData!==null) compute(); },250);
}

async function fetchAndCompute() {
  const btn=document.getElementById('refreshBtn'); btn.classList.add('loading');
  setBanner('info','⏳ Récupération des stocks YATA…');
  document.getElementById('globalStats').style.display='none';
  document.getElementById('bestRunTimeline').style.display='none';
  document.getElementById('otherRuns').style.display='none';
  document.getElementById('emptyState').style.display='none';

  try {
    const r=await fetch('https://yata.yt/api/v1/travel/export/');
    if(!r.ok) throw new Error();
    stockData=await r.json();
    localStorage.setItem('yataCache',JSON.stringify(stockData));
    document.getElementById('lastFetchInfo').textContent='YATA '+timeAgo(stockData.timestamp);
    setBanner('info','✅ Stocks YATA chargés.');
  } catch(e) {
    const c=localStorage.getItem('yataCache');
    if(c){stockData=JSON.parse(c);setBanner('warn','⚠️ YATA inaccessible — cache utilisé.');}
    else{stockData={};setBanner('warn','⚠️ YATA inaccessible — prix historiques.');}
  }

  const key=sessionStorage.getItem('tornKey');
  if(key) {
    try {
      setBanner('info','⏳ Récupération des prix marché Torn…');
      const r=await fetch(`https://api.torn.com/torn/?selections=items&key=${key}`);
      const d=await r.json();
      if(d.items){
        priceData={};
        Object.entries(d.items).forEach(([id,item])=>{
          if(item.market_value>0){priceData[parseInt(id)]=item.market_value;priceData[item.name]=item.market_value;}
        });
        setBanner('info','✅ Stocks YATA + prix marché Torn chargés.');
      }
    } catch(_){setBanner('warn','⚠️ Prix Torn API indisponibles.');}
  }

  compute();
  btn.classList.remove('loading');
}

/* ── Modèle de stock ── */
function estimateStockAtArrival(item, yataQtyNow, lastUpdateTs, arrivalTs) {
  if(!lastUpdateTs||yataQtyNow===undefined) return{qty:null,proba:0.5,label:'inconnu'};
  const nowTs=Date.now()/1000;
  const totalElapsed=(nowTs-lastUpdateTs)+(arrivalTs-nowTs);
  const{restockQty,vidageMin}=item;
  const decayPerSec=restockQty/(vidageMin*60);
  const restockDelaySec=(vidageMin/2)*60;
  let stock=yataQtyNow,emptyAt=null;
  for(let t=0;t<totalElapsed;t+=60){
    stock=Math.max(0,stock-decayPerSec*60);
    if(stock===0&&emptyAt===null) emptyAt=t;
    if(emptyAt!==null&&(t-emptyAt)>=restockDelaySec){
      const absT=lastUpdateTs+t;
      if(absT%(15*60)<60){stock=restockQty;emptyAt=null;}
    }
  }
  let proba,label;
  if(stock>=restockQty*0.5){proba=0.90;label=`~${Math.round(stock)} en stock`;}
  else if(stock>=100){proba=0.65;label=`~${Math.round(stock)} (faible)`;}
  else if(stock>0){proba=0.30;label='stock très faible';}
  else{
    const tse=emptyAt!==null?totalElapsed-emptyAt:restockDelaySec*2;
    if(tse>=restockDelaySec*0.8){proba=0.55;label='restock probable à l\'arrivée';}
    else{proba=0.15;label='stock vide, restock lointain';}
  }
  return{qty:Math.round(stock),proba,label};
}

/* ── Calcul ── */
function compute() {
  const mode=document.getElementById('flightMode').value;
  const sessionMin=parseInt(document.getElementById('sessionHours').value)*60;
  const budgetCap=parseInt(document.getElementById('travelBudget').value)||0;
  const freshMax=parseFloat(document.getElementById('freshnessFilter').value);
  const minFlight=parseInt(document.getElementById('minFlightTime').value)||0;
  const maxTripsAllowed=parseInt(document.getElementById('maxTrips').value)||999;
  const canFinishAbroad=document.getElementById('finishAbroad').value==='yes';
  const wantPlush=document.getElementById('f_plushie').checked;
  const wantFlower=document.getElementById('f_flower').checked;
  const wantDrug=document.getElementById('f_drug').checked;
  const toyBonus=parseInt(document.getElementById('jobToy').value)||0;
  const flowerBonus=parseInt(document.getElementById('jobFlower').value)||0;
  const baseCapacity=getBaseCapacity();
  const now=Date.now()/1000,departTs=getDepartTs(),runs=[];

  COUNTRIES.forEach(country=>{
    if(excludedCountries.has(country.code)) return;
    const tOneWay=country.timeMin[mode];
    if(tOneWay<minFlight) return;
    const tripMin=tOneWay*2+5;
    let maxTrips=canFinishAbroad
      ?(sessionMin>=tOneWay?Math.floor((sessionMin-tOneWay)/tripMin)+1:0)
      :Math.floor(sessionMin/tripMin);
    maxTrips=Math.min(maxTrips,maxTripsAllowed);
    if(maxTrips<1) return;

    const cs=stockData?.stocks?.[country.code]??null;
    const lastUpdate=cs?.update??0;
    const ageH=lastUpdate?(now-lastUpdate)/3600:Infinity;
    if(lastUpdate&&ageH>freshMax) return;

    const yataMap={};
    if(cs?.stocks) cs.stocks.forEach(s=>{yataMap[s.id]=s.quantity;});

    const avail=ITEMS.filter(item=>{
      if(item.country!==country.code) return false;
      if(item.type==='plushie'&&!wantPlush) return false;
      if(item.type==='flower'&&!wantFlower) return false;
      if(item.type==='drug'&&!wantDrug) return false;
      return true;
    });
    if(!avail.length) return;

    const firstArrival=departTs+tOneWay*60;
    const sorted=avail.map(item=>{
      const sell=priceData[item.tornId]||priceData[item.name]||item.sell;
      const est=estimateStockAtArrival(item,yataMap[item.id],lastUpdate,firstArrival);
      return{...item,effectiveSell:sell,unitProfit:sell-item.buy,stockEst:est};
    }).sort((a,b)=>b.unitProfit-a.unitProfit);

    /* Allocation correcte */
    const breakdown=[];
    let baseRem=baseCapacity,toyRem=toyBonus,flowerRem=flowerBonus;
    sorted.forEach(item=>{
      let qty=0;
      if(baseRem>0){qty=baseRem;baseRem=0;}
      if(item.type==='plushie'&&toyRem>0){qty+=toyRem;toyRem=0;}
      if(item.type==='flower'&&flowerRem>0){qty+=flowerRem;flowerRem=0;}
      if(qty<=0) return;
      breakdown.push({
        ...item,qty,
        stockProba:item.stockEst.proba,
        stockLabel:item.stockEst.label,
        grossProfit:item.unitProfit*qty,
        adjustedProfit:item.unitProfit*qty*item.stockEst.proba,
        yataQtyNow:yataMap[item.id]??null,
      });
    });
    if(!breakdown.length) return;

    const travelCost=budgetCap>0?Math.min(budgetCap,country.cost):country.cost;
    const rawProfitTrip=breakdown.reduce((s,b)=>s+b.grossProfit,0);
    const adjProfitTrip=breakdown.reduce((s,b)=>s+b.adjustedProfit,0);
    const totalTravelCost=canFinishAbroad?travelCost*2*(maxTrips-1)+travelCost:travelCost*2*maxTrips;
    const totalProfit=adjProfitTrip*maxTrips-totalTravelCost;
    const profitPerHour=totalProfit/(sessionMin/60);
    const cashRequired=breakdown.reduce((s,b)=>s+b.buy*b.qty,0)+travelCost*2;

    const trips=Array.from({length:maxTrips},(_,i)=>{
      const startTs=departTs+i*(tOneWay*2+5)*60;
      const arriveTs=startTs+tOneWay*60;
      const returnTs=arriveTs+5*60;
      const isLast=canFinishAbroad&&i===maxTrips-1;
      return{startTs,arriveTs,returnTs,landTs:isLast?null:returnTs+tOneWay*60,isLastAbroad:isLast};
    });

    runs.push({
      country,tOneWay,tripMin,maxTrips,
      rawProfitTrip,adjProfitTrip,netPerTrip:adjProfitTrip-travelCost*2,
      totalProfit,profitPerHour,cashRequired,
      breakdown,lastUpdate,ageH,travelCost,trips,departTs,canFinishAbroad,
      totalCapacity:baseCapacity+toyBonus+flowerBonus,
    });
  });

  runs.sort((a,b)=>b.totalProfit-a.totalProfit);
  window._runs=runs;
  renderResults(runs,mode);
}

/* ── Rendu ── */
function renderResults(runs,mode) {
  const empty=document.getElementById('emptyState');
  if(!runs.length){
    empty.style.display='flex';
    document.getElementById('globalStats').style.display='none';
    document.getElementById('bestRunTimeline').style.display='none';
    document.getElementById('otherRuns').style.display='none';
    return;
  }
  empty.style.display='none';

  const best=runs[0];

  /* Stats globales */
  document.getElementById('gs_profit').textContent='$'+fmt(best.totalProfit);
  document.getElementById('gs_pph').textContent='$'+fmt(best.profitPerHour)+'/h';
  document.getElementById('gs_cash').textContent='$'+fmt(best.cashRequired);
  document.getElementById('gs_trips').textContent=best.maxTrips;
  document.getElementById('globalStats').style.display='grid';

  /* Timeline meilleur run */
  document.getElementById('bestRunTimeline').style.display='block';
  document.getElementById('timelineInner').innerHTML=buildTimeline(best);

  /* Autres runs sous forme compacte */
  if(runs.length>1){
    document.getElementById('otherRuns').style.display='block';
    const list=document.getElementById('otherRunsList');
    list.innerHTML='';
    runs.slice(1,6).forEach((run,i)=>list.appendChild(buildCompactCard(run,i+1,mode)));
    if(runs.length>6){
      const more=document.createElement('p');
      more.style.cssText='text-align:center;color:var(--text3);font-size:12px;padding:.75rem;cursor:pointer;border:1px solid var(--border);border-radius:var(--radius-sm);margin-top:.5rem';
      more.textContent=`Voir les ${runs.length-6} autres ▼`;
      more.onclick=()=>{runs.slice(6).forEach((r,i)=>list.insertBefore(buildCompactCard(r,i+6,mode),more));more.remove();};
      list.appendChild(more);
    }
  } else {
    document.getElementById('otherRuns').style.display='none';
  }
}

/* ── Timeline horizontale ── */
function buildTimeline(run) {
  const departTs=run.departTs;
  const sessionEnd=departTs+parseInt(document.getElementById('sessionHours').value)*3600;

  /* Noeuds de la timeline */
  const nodes=[];
  /* Départ Torn */
  nodes.push({type:'torn',ts:departTs,label:'Torn',sub:'Départ'});
  run.trips.forEach((t,i)=>{
    /* Arrivée à destination */
    nodes.push({type:'arrive',ts:t.arriveTs,country:run.country,trip:i+1,items:run.breakdown});
    if(t.isLastAbroad){
      nodes.push({type:'abroad_end',ts:t.arriveTs+5*60,label:run.country.name,sub:'Reste sur place'});
    } else {
      /* Retour à Torn */
      nodes.push({type:'torn',ts:t.landTs,label:'Torn',sub:`Retour T${i+1}`});
    }
  });

  /* Calcul des positions X en % */
  const totalDuration=sessionEnd-departTs;
  nodes.forEach(n=>{ n.pct=Math.min(98,Math.max(2,(n.ts-departTs)/totalDuration*100)); });

  /* Générer le HTML */
  const nodesHTML=nodes.map((n,i)=>{
    let dot='', content='';
    if(n.type==='torn'){
      dot=`<div class="tl-dot tl-dot-torn"></div>`;
      content=`<div class="tl-node-time">${fmtH(n.ts)}</div><div class="tl-node-label">${n.sub}</div>`;
    } else if(n.type==='arrive'){
      const mainItem=n.items[0];
      const profitStr='$'+fmt(n.items.reduce((s,b)=>s+b.grossProfit,0));
      const probaStr=Math.round(mainItem.stockProba*100)+'%';
      dot=`<div class="tl-dot tl-dot-country">
        <img src="https://flagcdn.com/20x15/${n.country.flag}.png" width="20" height="15"
          style="border-radius:2px" onerror="this.style.display='none'">
      </div>`;
      content=`<div class="tl-node-time">${fmtH(n.ts)}</div>
        <div class="tl-node-country">${n.country.name}</div>
        <div class="tl-node-item">
          <img src="https://www.torn.com/images/items/${mainItem.tornId}/large.png"
            style="width:32px;height:32px;object-fit:contain;border-radius:5px;background:var(--bg3)"
            onerror="this.style.display='none'">
          <div>
            <div style="font-size:11px;color:var(--text2)">×${mainItem.qty} ${mainItem.name}</div>
            <div class="tl-node-profit">${profitStr}</div>
            <div style="font-size:10px;color:var(--text3)">${probaStr} stock · T${n.trip}</div>
          </div>
        </div>`;
    } else {
      dot=`<div class="tl-dot tl-dot-end"></div>`;
      content=`<div class="tl-node-time">${fmtH(n.ts)}</div><div class="tl-node-label">${n.sub}</div>`;
    }

    const above = i%2===0;
    return `<div class="tl-node ${above?'tl-above':'tl-below'}" style="left:${n.pct}%">
      ${above?`<div class="tl-node-content tl-content-above">${content}</div>`:''}
      ${dot}
      ${!above?`<div class="tl-node-content tl-content-below">${content}</div>`:''}
    </div>`;
  }).join('');

  return `<div class="tl-track-wrap">
    <div class="tl-line"></div>
    ${nodesHTML}
  </div>`;
}

/* ── Carte compacte (autres runs) ── */
function buildCompactCard(run,rank,mode) {
  const mainItem=run.breakdown[0];
  const freshnessChip=run.lastUpdate
    ?`<span class="chip ${run.ageH<1?'chip-green':run.ageH<4?'chip-amber':'chip-red'}">${run.ageH<1?'< 1h':run.ageH<4?'< 4h':'> 4h'}</span>`
    :`<span class="chip chip-amber">inconnu</span>`;

  const card=document.createElement('div');
  card.className='compact-card';
  card.innerHTML=`
    <div class="compact-left">
      <img src="https://flagcdn.com/24x18/${run.country.flag}.png" width="24" height="18"
        style="border-radius:2px;flex-shrink:0" onerror="this.style.display='none'">
      <div>
        <div style="font-size:14px;font-weight:600">${run.country.name}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">
          ✈ ${run.tOneWay} min · ${run.maxTrips} trip${run.maxTrips>1?'s':''} · ${run.totalCapacity} items
          ${freshnessChip}
        </div>
      </div>
    </div>
    <div class="compact-items">
      ${run.breakdown.slice(0,3).map(b=>`
        <div class="compact-item">
          <img src="https://www.torn.com/images/items/${b.tornId}/large.png"
            style="width:30px;height:30px;object-fit:contain;border-radius:4px;background:var(--bg3)"
            onerror="this.style.display='none'">
          <div style="font-size:10px;color:var(--text2)">×${b.qty}</div>
        </div>`).join('')}
    </div>
    <div class="compact-right">
      <div class="compact-profit">$${fmt(run.totalProfit)}</div>
      <div style="font-size:11px;color:var(--text2)">$${fmt(run.profitPerHour)}/h</div>
      <button class="btn-detail" onclick="showRunDetail(${rank-1})">Détail</button>
    </div>`;
  return card;
}

function showRunDetail(rank) {
  const run=window._runs?.[rank];
  if(!run) return;
  document.getElementById('modalTitle').innerHTML=
    `<img src="https://flagcdn.com/20x15/${run.country.flag}.png" width="20" height="15" style="border-radius:2px;margin-right:8px;vertical-align:middle" onerror="this.style.display='none'">${run.country.name} — Détail stock`;
  document.getElementById('modalContent').innerHTML=buildStockDetail(run);
  document.getElementById('timelineModal').style.display='flex';
}
function closeModal(e) {
  if(e.target===document.getElementById('timelineModal'))
    document.getElementById('timelineModal').style.display='none';
}

/* ── Détail stock modal ── */
function buildStockDetail(run) {
  const sessionMin=parseInt(document.getElementById('sessionHours').value)*60;
  const departTs=run.departTs,endTs=departTs+sessionMin*60;
  const WINDOW_SEC=Math.min(2.5*3600,endTs-departTs);
  const chartH=120,W=640;
  const mainItem=run.breakdown[0];
  const RESTOCK=mainItem?.restockQty??2500;
  const vidageSec=(mainItem?.vidageMin??60)*60;
  const decay=RESTOCK/vidageSec;
  const restockDelay=vidageSec/2;
  let stock=mainItem?.yataQtyNow??RESTOCK,emptyAt=null;
  const pts=[];
  for(let t=departTs;t<=endTs;t+=60){
    stock=Math.max(0,stock-decay*60);
    if(stock===0&&emptyAt===null) emptyAt=t;
    if(emptyAt!==null&&(t-emptyAt)>=restockDelay&&t%(15*60)<60){stock=RESTOCK;emptyAt=null;}
    pts.push({ts:t,qty:stock});
  }
  const totalSec=endTs-departTs;
  const numPanels=Math.ceil(totalSec/WINDOW_SEC);
  function tsX(ts,ps){return((ts-ps)/WINDOW_SEC*W).toFixed(1);}
  function qY(q){return(chartH-(q/RESTOCK)*chartH).toFixed(1);}
  let svgs='';
  for(let p=0;p<numPanels;p++){
    const ps=departTs+p*WINDOW_SEC,pe=Math.min(ps+WINDOW_SEC,endTs);
    const pp=pts.filter(pt=>pt.ts>=ps&&pt.ts<=pe);
    if(!pp.length) continue;
    const pathD=pp.map((pt,i)=>`${i===0?'M':'L'}${tsX(pt.ts,ps)},${qY(pt.qty)}`).join(' ');
    let ticks='',tk=Math.ceil(ps/(15*60))*15*60;
    while(tk<=pe){ticks+=`<line x1="${tsX(tk,ps)}" y1="0" x2="${tsX(tk,ps)}" y2="${chartH}" stroke="rgba(255,255,255,.05)" stroke-width="0.8"/>`;tk+=15*60;}
    let evs='';
    run.trips.forEach(t=>{
      if(t.startTs>=ps&&t.startTs<=pe) evs+=`<line x1="${tsX(t.startTs,ps)}" y1="0" x2="${tsX(t.startTs,ps)}" y2="${chartH}" stroke="#4f7ef8" stroke-width="1" stroke-dasharray="4,3"/>`;
      if(t.arriveTs>=ps&&t.arriveTs<=pe) evs+=`<line x1="${tsX(t.arriveTs,ps)}" y1="0" x2="${tsX(t.arriveTs,ps)}" y2="${chartH}" stroke="#ef4444" stroke-width="2"/>`;
    });
    let lbls='',lt=Math.ceil(ps/(30*60))*30*60;
    while(lt<=pe){lbls+=`<text x="${tsX(lt,ps)}" y="${chartH+13}" font-size="9" fill="rgba(255,255,255,.3)" text-anchor="middle">${fmtH(lt)}</text>`;lt+=30*60;}
    svgs+=`<svg viewBox="0 0 ${W} ${chartH+16}" width="${W}" height="${chartH+16}" style="display:block;flex-shrink:0">
      <text x="2" y="9" font-size="8" fill="rgba(255,255,255,.2)">${RESTOCK}</text>
      <text x="2" y="${chartH-1}" font-size="8" fill="rgba(255,255,255,.2)">0</text>
      ${ticks}${evs}
      <path d="${pp.map((pt,i)=>`${i===0?'M':'L'}${tsX(pt.ts,ps)},${qY(pt.qty)}`).join(' ')} L${W},${chartH} L0,${chartH} Z" fill="rgba(79,126,248,.08)"/>
      <path d="${pathD}" fill="none" stroke="#4f7ef8" stroke-width="1.5"/>
      ${lbls}
    </svg>`;
  }

  const itemRows=run.breakdown.map(b=>{
    const color=TYPE_COLORS[b.type]||'#888';
    const barW=Math.round(b.stockProba*100);
    return `<div class="tl-item-row">
      <img src="https://www.torn.com/images/items/${b.tornId}/large.png"
        style="width:40px;height:40px;object-fit:contain;border-radius:6px;background:var(--bg3);flex-shrink:0"
        onerror="this.style.display='none'">
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:13px">${b.name}</div>
        <div style="font-size:11px;color:var(--text3)">${b.stockLabel}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-right:12px">
        <div style="font-size:12px;color:var(--text2)">×${b.qty} · achat $${fmt(b.buy*b.qty)}</div>
        <div style="font-size:13px;color:var(--green);font-weight:600">+$${fmt(b.grossProfit)}</div>
      </div>
      <div style="width:70px;flex-shrink:0">
        <div class="tl-proba-bar"><div class="tl-proba-fill" style="width:${barW}%;background:${color}"></div></div>
        <div style="font-size:10px;color:${color};text-align:right;margin-top:2px">${Math.round(b.stockProba*100)}%</div>
      </div>
    </div>`;
  }).join('');

  /* Explication profit */
  const profitExplain=`<div class="profit-explain">
    <div class="pe-row"><span>Profit brut / trip</span><span>$${fmt(run.rawProfitTrip)}</span></div>
    <div class="pe-row"><span>× proba stock moy.</span><span>${Math.round(run.breakdown.reduce((s,b)=>s+b.stockProba,0)/run.breakdown.length*100)}%</span></div>
    <div class="pe-row"><span>= profit ajusté / trip</span><span>$${fmt(run.adjProfitTrip)}</span></div>
    <div class="pe-row"><span>− frais vol A/R</span><span>−$${fmt(run.travelCost*2)}</span></div>
    <div class="pe-row"><span>= profit net / trip</span><span class="green">$${fmt(run.netPerTrip)}</span></div>
    <div class="pe-row"><span>× ${run.maxTrips} trips</span><span class="green">$${fmt(run.totalProfit)}</span></div>
  </div>`;

  return `
    <div class="tl-section-title">Stock estimé — ${mainItem?.name||''}
      <span style="font-size:11px;font-weight:400;margin-left:10px;color:var(--text3)">
        <span style="display:inline-block;width:10px;height:2px;background:#4f7ef8;vertical-align:middle"></span> Départ &nbsp;
        <span style="display:inline-block;width:10px;height:2px;background:#ef4444;vertical-align:middle"></span> Arrivée
      </span>
    </div>
    <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg3);padding:.5rem .75rem">
      <div style="display:flex;width:${W*numPanels}px">${svgs}</div>
    </div>
    <p style="font-size:10px;color:var(--text3);margin-top:4px">Simulation stock Torn — ticks de restock toutes les 15 min</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1.25rem">
      <div>
        <div class="tl-section-title">Items à acheter</div>
        ${itemRows}
      </div>
      <div>
        <div class="tl-section-title">Calcul du profit</div>
        ${profitExplain}
      </div>
    </div>`;
}

/* ── Helpers ── */
function timeAgo(ts){const d=Math.round((Date.now()/1000-ts)/60);if(d<1)return'à l\'instant';if(d<60)return`il y a ${d} min`;return`il y a ${Math.round(d/60)}h`;}
function fmt(n){return Math.round(n).toLocaleString('fr-FR');}
function setBanner(type,msg){const el=document.getElementById('statusBanner');el.className=`banner banner-${type}`;el.textContent=msg;el.style.display='flex';}

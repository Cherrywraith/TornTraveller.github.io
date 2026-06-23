/* ── Reset & base ─────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #0f1117;
  --bg2:       #181c27;
  --bg3:       #1e2335;
  --border:    rgba(255,255,255,.08);
  --border2:   rgba(255,255,255,.14);
  --text:      #e8eaf0;
  --text2:     #8b90a0;
  --text3:     #555b70;
  --accent:    #4f7ef8;
  --accent2:   #3a5fd0;
  --green:     #22c55e;
  --green-bg:  rgba(34,197,94,.1);
  --amber:     #f59e0b;
  --amber-bg:  rgba(245,158,11,.1);
  --red:       #ef4444;
  --red-bg:    rgba(239,68,68,.1);
  --blue-bg:   rgba(79,126,248,.1);
  --radius:    10px;
  --radius-sm: 6px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  font-size: 14px;
  line-height: 1.6;
}

/* ── Header ───────────────────────────────────────────────────── */
header {
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
}
.logo { display: flex; align-items: center; gap: 10px; }
.logo-icon { font-size: 20px; }
.logo-title { font-size: 15px; font-weight: 600; color: var(--text); }
.logo-sub { font-size: 11px; color: var(--text2); }
.header-actions { display: flex; align-items: center; gap: 12px; }
.last-fetch-info { font-size: 11px; color: var(--text3); }

/* ── Layout ───────────────────────────────────────────────────── */
main { max-width: 1400px; margin: 0 auto; padding: 1.5rem; }
.layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1.5rem;
  align-items: start;
}

/* ── Sidebar / Cards ──────────────────────────────────────────── */
.sidebar { display: flex; flex-direction: column; gap: 1rem; }

.card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
}

.card-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--text2);
  margin-bottom: .75rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

label {
  display: block;
  font-size: 12px;
  color: var(--text2);
  margin-bottom: .5rem;
  margin-top: .5rem;
}
label:first-of-type { margin-top: 0; }

input[type="text"],
input[type="password"],
select {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 7px 10px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color .15s;
}
input:focus, select:focus { border-color: var(--accent); }
select option { background: var(--bg2); }

.hint {
  font-size: 11px;
  color: var(--text3);
  margin-top: 4px;
  line-height: 1.5;
}

/* ── Sliders ──────────────────────────────────────────────────── */
.slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.slider-val { font-size: 13px; font-weight: 600; color: var(--accent); min-width: 36px; text-align: right; }
input[type="range"] {
  flex: 1;
  -webkit-appearance: none;
  height: 4px;
  background: var(--bg3);
  border-radius: 2px;
  outline: none;
  border: none;
  padding: 0;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--bg2);
}
input[type="range"]::-moz-range-thumb {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--bg2);
}

/* ── Capacity chip ────────────────────────────────────────────── */
.capacity-chip {
  margin-top: .75rem;
  background: var(--blue-bg);
  border: 1px solid rgba(79,126,248,.2);
  border-radius: var(--radius-sm);
  padding: .5rem .75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text2);
}
.capacity-chip strong { font-size: 18px; font-weight: 700; color: var(--accent); }

/* ── Checkboxes ───────────────────────────────────────────────── */
.checkbox-group { display: flex; flex-direction: column; gap: 5px; margin-top: 4px; }
.cb-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
}
.cb-label input[type="checkbox"] {
  width: 15px; height: 15px;
  accent-color: var(--accent);
  cursor: pointer;
  display: inline;
  margin: 0;
}

/* ── Country filter buttons ───────────────────────────────────── */
.country-filter-grid { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
.country-btn {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 20px;
  border: 1px solid var(--border2);
  background: transparent;
  color: var(--text2);
  cursor: pointer;
  transition: all .15s;
}
.country-btn.excluded {
  background: var(--red-bg);
  border-color: rgba(239,68,68,.3);
  color: var(--red);
  text-decoration: line-through;
}

/* ── Buttons ──────────────────────────────────────────────────── */
.btn-icon {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--bg3);
  border: 1px solid var(--border2);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  transition: background .15s;
}
.btn-icon:hover { background: var(--accent2); border-color: var(--accent); }
.btn-icon.loading svg { animation: spin .8s linear infinite; }

.btn-sm {
  margin-top: 6px;
  padding: 5px 12px;
  background: var(--bg3);
  border: 1px solid var(--border2);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}
.btn-sm:hover { border-color: var(--accent); }

.btn-primary {
  padding: 10px 24px;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  transition: background .15s;
}
.btn-primary:hover { background: var(--accent2); }

.key-status { font-size: 11px; margin-left: 8px; color: var(--green); }

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Banners ──────────────────────────────────────────────────── */
.banner {
  border-radius: var(--radius-sm);
  padding: .65rem 1rem;
  font-size: 13px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}
.banner-info  { background: var(--blue-bg);  border: 1px solid rgba(79,126,248,.2); color: #7ba7ff; }
.banner-warn  { background: var(--amber-bg); border: 1px solid rgba(245,158,11,.2); color: var(--amber); }
.banner-error { background: var(--red-bg);   border: 1px solid rgba(239,68,68,.2);  color: var(--red); }

/* ── Summary cards ────────────────────────────────────────────── */
.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: .75rem;
  margin-bottom: 1.25rem;
}
.stat-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: .75rem 1rem;
  text-align: center;
}
.stat-val { font-size: 22px; font-weight: 700; }
.stat-lbl { font-size: 11px; color: var(--text2); margin-top: 2px; }
.green  { color: var(--green); }
.amber  { color: var(--amber); }
.red    { color: var(--red); }
.accent { color: var(--accent); }

/* ── Run cards ────────────────────────────────────────────────── */
.run-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  margin-bottom: .75rem;
  position: relative;
  transition: border-color .2s;
}
.run-card:hover { border-color: var(--border2); }
.run-card.best { border-color: rgba(79,126,248,.45); }

.run-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
.run-left { display: flex; align-items: center; gap: 10px; }
.run-flag { font-size: 24px; }
.run-country { font-size: 16px; font-weight: 600; }
.run-meta-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }

.chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 20px;
  border: 1px solid var(--border2);
  color: var(--text2);
}
.chip-green  { background: var(--green-bg); border-color: rgba(34,197,94,.2); color: var(--green); }
.chip-amber  { background: var(--amber-bg); border-color: rgba(245,158,11,.2); color: var(--amber); }
.chip-red    { background: var(--red-bg);   border-color: rgba(239,68,68,.2);  color: var(--red); }
.chip-blue   { background: var(--blue-bg);  border-color: rgba(79,126,248,.2); color: #7ba7ff; }

.run-profit-block { text-align: right; }
.profit-total { font-size: 24px; font-weight: 700; color: var(--green); }
.profit-sub { font-size: 11px; color: var(--text2); margin-top: 2px; }

.run-divider { border: none; border-top: 1px solid var(--border); margin: .75rem 0; }

.run-profit-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: .75rem;
}
.prow-item { }
.prow-label { font-size: 11px; color: var(--text2); }
.prow-val { font-size: 15px; font-weight: 600; }

.items-grid { display: flex; flex-wrap: wrap; gap: 6px; }

.item-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg3);
}
.item-chip .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.item-chip .qty { font-weight: 600; }
.item-chip .gain { color: var(--text2); }

.run-timeline {
  margin-top: .75rem;
  padding-top: .75rem;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text3);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.tl-step {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text2);
}
.tl-sep { color: var(--text3); }

.best-badge {
  position: absolute;
  top: -1px; right: 14px;
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  letter-spacing: .04em;
}

/* ── Empty state ──────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}
.empty-icon { font-size: 48px; margin-bottom: 1rem; }
.empty-title { font-size: 18px; font-weight: 600; margin-bottom: .5rem; }
.empty-sub { color: var(--text2); font-size: 14px; max-width: 360px; line-height: 1.7; }

/* ── Responsive ───────────────────────────────────────────────── */
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .summary-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  main { padding: 1rem; }
  .summary-row { grid-template-columns: 1fr 1fr; }
  header { padding: 0 1rem; }
}

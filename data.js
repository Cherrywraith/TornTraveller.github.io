/* ================================================================
   data.js — Données statiques Torn (pays, items, temps de vol)
   Sources : wiki.torn.com, guides communautaires
   ================================================================ */

const COUNTRIES = [
  {
    name: 'Mexico', code: 'mex', flag: '🇲🇽',
    timeMin: { standard: 20, airstrip: 14, wlt: 10 },
    cost: 5000
  },
  {
    name: 'Cayman Islands', code: 'cay', flag: '🇰🇾',
    timeMin: { standard: 57, airstrip: 40, wlt: 29 },
    cost: 10000
  },
  {
    name: 'Canada', code: 'can', flag: '🇨🇦',
    timeMin: { standard: 37, airstrip: 26, wlt: 19 },
    cost: 7500
  },
  {
    name: 'Hawaii', code: 'haw', flag: '🇺🇸',
    timeMin: { standard: 121, airstrip: 85, wlt: 61 },
    cost: 12000
  },
  {
    name: 'United Kingdom', code: 'uni', flag: '🇬🇧',
    timeMin: { standard: 159, airstrip: 111, wlt: 80 },
    cost: 18000
  },
  {
    name: 'Argentina', code: 'arg', flag: '🇦🇷',
    timeMin: { standard: 189, airstrip: 132, wlt: 95 },
    cost: 22000
  },
  {
    name: 'Switzerland', code: 'swi', flag: '🇨🇭',
    timeMin: { standard: 169, airstrip: 118, wlt: 85 },
    cost: 20000
  },
  {
    name: 'Japan', code: 'jap', flag: '🇯🇵',
    timeMin: { standard: 203, airstrip: 142, wlt: 102 },
    cost: 25000
  },
  {
    name: 'China', code: 'chi', flag: '🇨🇳',
    timeMin: { standard: 242, airstrip: 169, wlt: 121 },
    cost: 35000
  },
  {
    name: 'UAE', code: 'uae', flag: '🇦🇪',
    timeMin: { standard: 271, airstrip: 190, wlt: 136 },
    cost: 32000
  },
  {
    name: 'South Africa', code: 'sou', flag: '🇿🇦',
    timeMin: { standard: 311, airstrip: 218, wlt: 156 },
    cost: 40000
  },
];

/* Items : buy = prix à l'étranger, sell = prix moyen marché Torn
   Les prix sell sont des estimations communautaires — la clé API
   permet de les remplacer par les vraies valeurs du marché. */
const ITEMS = [
  /* ─── Plushies ─────────────────────────────────────────────── */
  { id: 'caiman',   name: 'Caiman Plushie',        country: 'mex', type: 'plushie', buy: 1000,  sell: 120000 },
  { id: 'jaguar',   name: 'Jaguar Plushie',         country: 'mex', type: 'plushie', buy: 1500,  sell: 200000 },
  { id: 'stingray', name: 'Stingray Plushie',       country: 'cay', type: 'plushie', buy: 2000,  sell: 160000 },
  { id: 'wolverine',name: 'Wolverine Plushie',      country: 'can', type: 'plushie', buy: 500,   sell: 100000 },
  { id: 'lion',     name: 'Lion Plushie',           country: 'sou', type: 'plushie', buy: 3000,  sell: 160000 },
  { id: 'monkey',   name: 'Monkey Plushie',         country: 'arg', type: 'plushie', buy: 2500,  sell: 200000 },
  { id: 'chamois',  name: 'Chamois Plushie',        country: 'swi', type: 'plushie', buy: 2000,  sell: 130000 },
  { id: 'nessie',   name: 'Nessie Plushie',         country: 'uni', type: 'plushie', buy: 2500,  sell: 160000 },
  { id: 'redfox',   name: 'Red Fox Plushie',        country: 'uni', type: 'plushie', buy: 2000,  sell: 160000 },
  { id: 'panda',    name: 'Panda Plushie',          country: 'chi', type: 'plushie', buy: 3000,  sell: 300000 },
  { id: 'camel',    name: 'Camel Plushie',          country: 'uae', type: 'plushie', buy: 4000,  sell: 350000 },
  { id: 'cherry_p', name: 'Cherry Blossom Plushie', country: 'jap', type: 'plushie', buy: 2500,  sell: 220000 },

  /* ─── Flowers ──────────────────────────────────────────────── */
  { id: 'dahlia',   name: 'Dahlia',                 country: 'mex', type: 'flower',  buy: 500,   sell: 50000  },
  { id: 'orchid_b', name: 'Banana Orchid',          country: 'cay', type: 'flower',  buy: 600,   sell: 55000  },
  { id: 'trillium', name: 'Trillium',               country: 'can', type: 'flower',  buy: 400,   sell: 45000  },
  { id: 'violet',   name: 'African Violet',         country: 'sou', type: 'flower',  buy: 600,   sell: 55000  },
  { id: 'ceibo',    name: 'Ceibo',                  country: 'arg', type: 'flower',  buy: 800,   sell: 65000  },
  { id: 'edelweiss',name: 'Edelweiss',              country: 'swi', type: 'flower',  buy: 700,   sell: 60000  },
  { id: 'heather',  name: 'Heather',                country: 'uni', type: 'flower',  buy: 500,   sell: 55000  },
  { id: 'peony',    name: 'Peony',                  country: 'chi', type: 'flower',  buy: 1500,  sell: 130000 },
  { id: 'tribulus', name: 'Tribulus Omanense',      country: 'uae', type: 'flower',  buy: 2000,  sell: 200000 },
  { id: 'cherry_f', name: 'Cherry Blossom',         country: 'jap', type: 'flower',  buy: 1200,  sell: 110000 },
  { id: 'orchid',   name: 'Orchid',                 country: 'haw', type: 'flower',  buy: 800,   sell: 75000  },

  /* ─── Drugs ────────────────────────────────────────────────── */
  { id: 'cannabis', name: 'Cannabis',               country: 'mex', type: 'drug',    buy: 500,   sell: 30000  },
  { id: 'cocaine',  name: 'Cocaine',                country: 'arg', type: 'drug',    buy: 5000,  sell: 90000  },
  { id: 'ecstasy',  name: 'Ecstasy',                country: 'uni', type: 'drug',    buy: 3000,  sell: 70000  },
  { id: 'shrooms',  name: 'Shrooms',                country: 'can', type: 'drug',    buy: 400,   sell: 25000  },
  { id: 'opium',    name: 'Opium',                  country: 'chi', type: 'drug',    buy: 8000,  sell: 150000 },
  { id: 'xanax',    name: 'Xanax',                  country: 'swi', type: 'drug',    buy: 250,   sell: 800000 },
  { id: 'lsd',      name: 'LSD',                    country: 'jap', type: 'drug',    buy: 2000,  sell: 60000  },
  { id: 'ketamine', name: 'Ketamine',               country: 'uae', type: 'drug',    buy: 6000,  sell: 110000 },
  { id: 'vicodin',  name: 'Vicodin',                country: 'haw', type: 'drug',    buy: 1000,  sell: 20000  },
  { id: 'melatonin',name: 'Melatonin',              country: 'sou', type: 'drug',    buy: 200,   sell: 15000  },
];

/* Couleurs par type d'item */
const TYPE_COLORS = {
  plushie: '#8b5cf6',
  flower:  '#22c55e',
  drug:    '#f59e0b',
  other:   '#60a5fa',
};

const TYPE_LABELS = {
  plushie: 'Peluche',
  flower:  'Fleur',
  drug:    'Drogue',
  other:   'Autre',
};

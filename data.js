/* ================================================================
   data.js — Torn Travel Optimizer
   Prix sell = fallback si pas de clé API (seront remplacés par API Torn)
   restockQty = quantité remise en stock à chaque restock
   vidageMin  = temps estimé pour vider le stock (en minutes), selon popularité
   restockMin = temps estimé avant restock après vidage (= vidageMin / 2)
   ================================================================ */

const COUNTRIES = [
  { name:'Mexico',         code:'mex', flag:'mx', timeMin:{standard:20,  airstrip:14,  wlt:10},  cost:5000  },
  { name:'Cayman Islands', code:'cay', flag:'ky', timeMin:{standard:57,  airstrip:40,  wlt:29},  cost:10000 },
  { name:'Canada',         code:'can', flag:'ca', timeMin:{standard:37,  airstrip:26,  wlt:19},  cost:7500  },
  { name:'Hawaii',         code:'haw', flag:'us', timeMin:{standard:121, airstrip:85,  wlt:61},  cost:12000 },
  { name:'United Kingdom', code:'uni', flag:'gb', timeMin:{standard:159, airstrip:111, wlt:80},  cost:18000 },
  { name:'Argentina',      code:'arg', flag:'ar', timeMin:{standard:189, airstrip:132, wlt:95},  cost:22000 },
  { name:'Switzerland',    code:'swi', flag:'ch', timeMin:{standard:169, airstrip:118, wlt:85},  cost:20000 },
  { name:'Japan',          code:'jap', flag:'jp', timeMin:{standard:203, airstrip:142, wlt:102}, cost:25000 },
  { name:'China',          code:'chi', flag:'cn', timeMin:{standard:242, airstrip:169, wlt:121}, cost:35000 },
  { name:'UAE',            code:'uae', flag:'ae', timeMin:{standard:271, airstrip:190, wlt:136}, cost:32000 },
  { name:'South Africa',   code:'sou', flag:'za', timeMin:{standard:311, airstrip:218, wlt:156}, cost:40000 },
];

const ITEMS = [
  /* Plushies — restockQty=2500, vidage rapide sur destinations populaires */
  { id:'jaguar',   tornId:258, name:'Jaguar Plushie',         country:'mex', type:'plushie', buy:10000, sell:14500,  restockQty:2500, vidageMin:20  },
  { id:'stingray', tornId:618, name:'Stingray Plushie',       country:'cay', type:'plushie', buy:2000,  sell:6500,   restockQty:2500, vidageMin:45  },
  { id:'wolverine',tornId:261, name:'Wolverine Plushie',      country:'can', type:'plushie', buy:500,   sell:7000,   restockQty:2500, vidageMin:60  },
  { id:'lion',     tornId:281, name:'Lion Plushie',           country:'sou', type:'plushie', buy:3000,  sell:60000,  restockQty:2500, vidageMin:30  },
  { id:'monkey',   tornId:269, name:'Monkey Plushie',         country:'arg', type:'plushie', buy:2500,  sell:35000,  restockQty:2500, vidageMin:25  },
  { id:'chamois',  tornId:273, name:'Chamois Plushie',        country:'swi', type:'plushie', buy:2000,  sell:5500,   restockQty:2500, vidageMin:90  },
  { id:'nessie',   tornId:266, name:'Nessie Plushie',         country:'uni', type:'plushie', buy:2500,  sell:30000,  restockQty:2500, vidageMin:35  },
  { id:'redfox',   tornId:268, name:'Red Fox Plushie',        country:'uni', type:'plushie', buy:2000,  sell:31500,  restockQty:2500, vidageMin:35  },
  { id:'cherry_p', tornId:277, name:'Cherry Blossom Plushie', country:'jap', type:'plushie', buy:2500,  sell:25000,  restockQty:2500, vidageMin:20  },
  { id:'panda',    tornId:274, name:'Panda Plushie',          country:'chi', type:'plushie', buy:400,   sell:52000,  restockQty:2500, vidageMin:10  },
  { id:'camel',    tornId:384, name:'Camel Plushie',          country:'uae', type:'plushie', buy:14000, sell:90000,  restockQty:2500, vidageMin:8   },
  /* Flowers */
  { id:'dahlia',   tornId:260, name:'Dahlia',                 country:'mex', type:'flower',  buy:500,   sell:3000,   restockQty:2500, vidageMin:120 },
  { id:'orchid_b', tornId:617, name:'Banana Orchid',          country:'cay', type:'flower',  buy:600,   sell:4000,   restockQty:2500, vidageMin:120 },
  { id:'crocus',   tornId:263, name:'Crocus',                 country:'can', type:'flower',  buy:400,   sell:3500,   restockQty:2500, vidageMin:180 },
  { id:'violet',   tornId:282, name:'African Violet',         country:'sou', type:'flower',  buy:600,   sell:4500,   restockQty:2500, vidageMin:150 },
  { id:'ceibo',    tornId:271, name:'Ceibo Flower',           country:'arg', type:'flower',  buy:800,   sell:8000,   restockQty:2500, vidageMin:90  },
  { id:'edelweiss',tornId:272, name:'Edelweiss',              country:'swi', type:'flower',  buy:700,   sell:5000,   restockQty:2500, vidageMin:150 },
  { id:'heather',  tornId:267, name:'Heather',                country:'uni', type:'flower',  buy:500,   sell:9000,   restockQty:2500, vidageMin:60  },
  { id:'cherry_f', tornId:278, name:'Cherry Blossom',         country:'jap', type:'flower',  buy:1200,  sell:12000,  restockQty:2500, vidageMin:45  },
  { id:'peony',    tornId:276, name:'Peony',                  country:'chi', type:'flower',  buy:1500,  sell:18000,  restockQty:2500, vidageMin:30  },
  { id:'tribulus', tornId:385, name:'Tribulus Omanense',      country:'uae', type:'flower',  buy:2000,  sell:25000,  restockQty:2500, vidageMin:20  },
  { id:'orchid',   tornId:264, name:'Orchid',                 country:'haw', type:'flower',  buy:800,   sell:6000,   restockQty:2500, vidageMin:120 },
  /* Drugs — Xanax restock 10k mais se vide très lentement */
  { id:'cannabis', tornId:196, name:'Cannabis',               country:'mex', type:'drug',    buy:500,   sell:2000,   restockQty:500,  vidageMin:240 },
  { id:'shrooms',  tornId:203, name:'Shrooms',                country:'can', type:'drug',    buy:400,   sell:1500,   restockQty:500,  vidageMin:300 },
  { id:'ecstasy',  tornId:197, name:'Ecstasy',                country:'uni', type:'drug',    buy:3000,  sell:12000,  restockQty:500,  vidageMin:180 },
  { id:'pcp',      tornId:201, name:'PCP',                    country:'arg', type:'drug',    buy:5000,  sell:18000,  restockQty:500,  vidageMin:180 },
  { id:'xanax',    tornId:206, name:'Xanax',                  country:'swi', type:'drug',    buy:250,   sell:750000, restockQty:10000,vidageMin:600 },
  { id:'lsd',      tornId:199, name:'LSD',                    country:'jap', type:'drug',    buy:2000,  sell:8000,   restockQty:500,  vidageMin:240 },
  { id:'opium',    tornId:200, name:'Opium',                  country:'chi', type:'drug',    buy:8000,  sell:35000,  restockQty:500,  vidageMin:180 },
  { id:'ketamine', tornId:198, name:'Ketamine',               country:'uae', type:'drug',    buy:6000,  sell:20000,  restockQty:500,  vidageMin:200 },
  { id:'vicodin',  tornId:205, name:'Vicodin',                country:'haw', type:'drug',    buy:1000,  sell:3500,   restockQty:500,  vidageMin:300 },
  { id:'melatonin',tornId:464, name:'Melatonin',              country:'sou', type:'drug',    buy:200,   sell:1000,   restockQty:500,  vidageMin:360 },
];

const TYPE_COLORS = { plushie:'#8b5cf6', flower:'#22c55e', drug:'#f59e0b' };

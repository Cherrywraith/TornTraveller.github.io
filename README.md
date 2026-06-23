fix
-flags not showing (ez)
-wrong stuff with the expected amount of plushie / flowers abroad (hard no real data)
-look at restocks (med)
-images are widen (med)
-too small text (med)
-grab prices with torn API (ez)
-add other obs like the cruise fo radditional items (ez)
-add tourism day (ez)


# ✈️ Torn Travel Optimizer

Outil de planification de voyages pour [Torn City](https://www.torn.com), hébergeable gratuitement sur **GitHub Pages**.

Calcule les meilleurs runs à l'étranger en fonction de :
- Ta durée de session disponible
- Ton mode de vol (Standard / Airstrip / WLT / Business Class)
- Ta valise (Small / Medium / Large)
- Les bonus faction (Excursion, jusqu'à +10 items)
- Les bonus de job (Toy Shop 7★ +5 peluches, Flower Shop 7★ +5 fleurs, Lingerie Store 5★, Cruise Line)
- Les stocks temps réel via l'**API YATA** (crowd-sourced)
- Les prix du marché Torn via ta **clé API publique** (optionnel)

---

## 🔑 Clé API Torn

Pour récupérer les **prix du marché en temps réel**, ajoute ta clé API :

1. Dans Torn, va dans **Settings → API Keys**
2. Crée une clé avec accès **Public Only** (suffisant, sans risque)
3. Colle-la dans le champ "Clé API Torn" de l'outil

La clé est stockée uniquement dans ta session de navigateur (`sessionStorage`), jamais envoyée ailleurs.

---

## 📊 Sources de données

| Donnée | Source | Fraîcheur |
|--------|--------|-----------|
| Stocks étrangers | [YATA API](https://yata.yt/api/v1/travel/export/) | Crowd-sourced (varie) |
| Prix du marché | API Torn (ta clé) | Quotidien |
| Prix de base | Base statique (`js/data.js`) | À mettre à jour manuellement |
| Temps de vol | [Wiki Torn](https://wiki.torn.com/wiki/Travel) | Statique |

**Note CORS** : L'API YATA peut bloquer les requêtes depuis GitHub Pages selon la politique CORS du serveur. Si les stocks ne se chargent pas, l'outil fonctionne quand même avec les prix historiques.

---

## 🛠️ Mettre à jour les prix

Les prix de vente dans `js/data.js` sont des estimations. Pour les mettre à jour :

1. Ouvre `js/data.js`
2. Modifie les valeurs `sell` de chaque item
3. Commit et push

Tu peux aussi utiliser ta clé API pour avoir les prix automatiquement.

---

## 📝 Structure du projet

```
torn-travel-optimizer/
├── index.html        # Page principale
├── css/
│   └── style.css     # Thème sombre, responsive
├── js/
│   ├── data.js       # Données statiques (pays, items, prix)
│   └── app.js        # Logique de calcul et rendu
└── README.md         # Ce fichier
```

---

## ⚖️ Disclaimer

Cet outil est indépendant et non-officiel. Il utilise uniquement des APIs publiques (YATA, Torn API publique). Les prix et temps de vol peuvent varier.

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

## 🚀 Déploiement sur GitHub Pages

### Étape 1 — Créer le dépôt

1. Va sur [github.com](https://github.com) et connecte-toi
2. Clique sur **New repository**
3. Nom : `torn-travel-optimizer` (ou ce que tu veux)
4. Laisse **Public** coché (requis pour GitHub Pages gratuit)
5. Clique **Create repository**

### Étape 2 — Uploader les fichiers

**Option A — via l'interface web GitHub (plus simple)**

1. Dans ton dépôt vide, clique **uploading an existing file**
2. Glisse-dépose TOUS les fichiers/dossiers du projet :
   ```
   index.html
   css/style.css
   js/data.js
   js/app.js
   README.md
   ```
3. Clique **Commit changes**

**Option B — via Git (si tu as Git installé)**

```bash
cd torn-travel-optimizer
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/torn-travel-optimizer.git
git push -u origin main
```

### Étape 3 — Activer GitHub Pages

1. Dans ton dépôt, va dans **Settings** (onglet en haut)
2. Dans le menu gauche, clique **Pages**
3. Sous *Source*, sélectionne **Deploy from a branch**
4. Branch : `main`, dossier : `/ (root)`
5. Clique **Save**

Ton site sera disponible en quelques minutes sur :
```
https://TON_USERNAME.github.io/torn-travel-optimizer/
```

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

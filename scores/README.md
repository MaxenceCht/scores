# 🃏 Compteurs de points — Belote · Contrée · Tarot

Site statique de compteurs de points pour jeux de cartes, optimisé mobile. Aucune dépendance, aucun serveur.

## Structure

```
scores/
├── index.html          # Accueil — choix du jeu, badges "partie en cours"
├── css/
│   └── common.css      # Styles partagés
├── belote/
│   ├── index.html
│   └── app.js
├── contree/
│   ├── index.html
│   └── app.js
└── tarot/
    ├── index.html
    └── app.js
```

Chaque jeu sauvegarde sa partie dans le navigateur (localStorage, une clé par jeu). On peut donc avoir trois parties en cours en parallèle et naviguer entre les jeux sans rien perdre.

## Belote

- Saisie des points d'une équipe, l'autre déduite (162 − x)
- Belote/Rebelote (+20), capot (250), litige 81/81 (81 pts au défenseur, 81 pts en attente pour le vainqueur de la manche suivante)
- Objectif : 1000 / 2000 / 3000 / sans limite

## Contrée

Trois modes de comptage, choisis en configuration :

| Mode | Réussite | Chute | Objectif pré-rempli |
|---|---|---|---|
| **Contrat** | annonceur marque le contrat | défense marque 160 | 1010 |
| **Contrat + réalisé** | contrat + réalisé des deux équipes | défense : 160 + réalisé (160) | 2001 (2010 si arrondi) |
| **Réalisé** | réalisé des deux équipes | défense : 160 | 1001 (1010 si arrondi) |

- Annonces de 80 à 160, capot (250), capot beloté (270)
- Coinche ×2, surcoinche ×4
- Règle de réussite : l'annonceur doit atteindre son contrat **et** faire strictement plus que la défense (belote incluse des deux côtés) — contrat à 80 → 82 minimum
- Option "compter la belote dans les points" (mode contrat) : si cochée, l'équipe qui a la belote marque 20 quoi qu'il arrive ; sinon la belote sert uniquement au calcul réussite/chute
- Option arrondi à la dizaine (modes avec réalisé) : reste de 5 → vers le bas (85 → 80), 6 et plus → vers le haut (86 → 90)

## Tarot

Barème FFT. 3, 4 ou 5 joueurs.

- Contrats : petite ×1, garde ×2, garde sans ×4, garde contre ×6
- Score = (25 + écart au contrat) × multiplicateur ; seuils 56/51/41/36 pts selon 0/1/2/3 bouts
- Petit au bout : ±10 × multiplicateur
- Poignées : simple +20, double +30, triple +40 (le bonus va au camp vainqueur de la donne)
- Chelem : non annoncé réussi +200, annoncé réussi +400, annoncé chuté −200
- À 5 joueurs : preneur 2 parts, partenaire 1 part ; appel à soi-même = seul contre 4 (×4)
- Changer le nombre de joueurs réinitialise la partie en cours (confirmation demandée)

## Utilisation en local

Ouvrir `index.html` dans un navigateur.

## Déploiement sur GitHub Pages

### 1. Créer le dépôt

Sur github.com → **New repository**, nom au choix (ex. `scores`), visibilité **Public**.

### 2. Pousser le code

```bash
git init
git add .
git commit -m "Compteurs belote, contrée, tarot"
git branch -M main
git remote add origin https://github.com/TON_PSEUDO/scores.git
git push -u origin main
```

### 3. Activer GitHub Pages

Dépôt → **Settings** → **Pages** → *Source* : **Deploy from a branch** → `main` / `(root)` → **Save**.

Le site sera accessible sous 1 à 2 minutes à `https://TON_PSEUDO.github.io/scores/`.

### 4. Sur téléphone

Ouvrir l'URL puis **Ajouter à l'écran d'accueil** pour l'utiliser comme une application.

## Mise à jour

```bash
git add .
git commit -m "Description de la modif"
git push
```

## Notes

- Les scores restent **locaux à chaque appareil** (rien n'est partagé ni envoyé à un serveur).
- Le bouton Réinitialiser de chaque jeu n'efface que la partie de ce jeu.

# Car Arena Combat 2D

Prototype de jeu web 2D d'arène de combat de voitures (HTML5 Canvas + JavaScript). Contrôles simples: avancer/reculer. La "tête" à l'avant de chaque voiture est le point faible.

## Démarrer en local

1. Ouvrez `index.html` dans votre navigateur.
2. Contrôles par défaut:
   - Joueur 1: Flèche droite = avancer, Flèche gauche = reculer (ou D/Q)
   - Joueur 2: A = avancer, R = reculer

## Déploiement gratuit

- GitHub Pages: Settings → Pages → Deploy from branch → main
- Netlify / Vercel: importer ce repo et déployer en un clic

## Personnalisation

- Voitures: éditez `CARS` dans `game.js` (stats et couleurs)
- Arènes: éditez `ARENAS` (friction, limites, couleur)
- Dimensions: ajustez le canvas dans `index.html`

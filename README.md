# Macy

Carnet quotidien en React / Next.js : connexion, quatre repères de 1 à 5, marqueur de crise facultatif, notes et consultation des dernières journées. `/` mène à `/today` ; la connexion protège le carnet et les endpoints.

## Démarrage local

Installer les dépendances avec `pnpm install`, puis configurer `.env.local` à partir de `.env.example`. Conserver les valeurs privées `PASSWORD_HASH` et `SESSION_SECRET` existantes. Lancer `pnpm dev` et ouvrir l’URL affichée.

Le mode `MACY_STORAGE=local` enregistre le carnet sur le serveur local dans `.macy-data/entries.json` (ignoré par Git, répertoire privé). Les données persistent après rechargement et redémarrage. `MACY_DATA_DIR` permet de choisir un autre répertoire persistant. Ce stockage est prévu pour un seul processus Node ; ne pas l’utiliser sur plusieurs instances ou un hébergement au disque éphémère. Les essais automatisés utilisent des répertoires temporaires séparés.

La connexion MySQL du plan historique n’est pas implémentée : ce mode local explicite permet d’utiliser le carnet sans base configurée. En l’absence de `MACY_STORAGE=local`, l’API refuse la sauvegarde plutôt que de sélectionner silencieusement un autre stockage. Sauvegarder le dossier privé pour conserver son carnet lors d’un changement de machine.

Les quatre repères sont neutres à 3 par défaut ; leurs extrémités sont décrites à l’écran. Aucun score global ni interprétation médicale n’est calculé. La date du carnet suit Europe/Brussels. Une journée future ou une valeur hors barème est refusée côté serveur.

Le jour de plaquette est affiché seulement si `DATE_DEBUT_PLAQUETTE`, `PILULES_ACTIVES` et `JOURS_ARRET` sont renseignés. Utiliser sa véritable date de référence ; aucune date n’est inventée par défaut.

## Vérifications

- `pnpm test` : validation des données, stockage local réel isolé, endpoints et authentification.
- `pnpm lint`
- `pnpm build` (réseau requis pour les polices Google).

La sauvegarde est bloquée tant que la journée n’a pas été chargée correctement. En cas d’échec d’enregistrement, la saisie reste affichée. Un changement de date ou une déconnexion demande confirmation si des modifications n’ont pas été enregistrées.

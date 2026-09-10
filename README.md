# Macy

Carnet quotidien en React / Next.js : connexion, quatre repères de 1 à 5, marqueur de crise facultatif, notes et consultation des dernières journées. `/` mène à `/today` ; la connexion protège le carnet et les endpoints.

## Démarrage local

Installer les dépendances avec `pnpm install`, puis configurer `.env.local` à partir de `.env.example`. Conserver les valeurs privées `PASSWORD_HASH` et `SESSION_SECRET` existantes. Lancer `pnpm dev` et ouvrir l’URL affichée.

Le mode `MACY_STORAGE=local` enregistre le carnet sur le serveur local dans `.macy-data/entries.json` (ignoré par Git, répertoire privé). Les données persistent après rechargement et redémarrage. `MACY_DATA_DIR` permet de choisir un autre répertoire persistant. Ce stockage est prévu pour un seul processus Node ; ne pas l’utiliser sur plusieurs instances ou un hébergement au disque éphémère. Les essais automatisés utilisent des répertoires temporaires séparés.

La connexion MySQL du plan historique n’est pas implémentée : ce mode local explicite permet d’utiliser le carnet sans base configurée. En l’absence de `MACY_STORAGE=local`, l’API refuse la sauvegarde plutôt que de sélectionner silencieusement un autre stockage. Sauvegarder le dossier privé pour conserver son carnet lors d’un changement de machine.

Les nouvelles mesures restent non renseignées par défaut ; leurs extrémités sont décrites à l’écran. Les anciennes valeurs sont conservées, y compris les 3 et les absences d’événements qui pouvaient provenir des valeurs initiales du carnet minimal. Aucun score global ni interprétation médicale n’est calculé. La date du carnet suit Europe/Brussels. Une journée future ou une valeur hors barème est refusée côté serveur.

Le jour de plaquette est affiché seulement si `DATE_DEBUT_PLAQUETTE`, `PILULES_ACTIVES` et `JOURS_ARRET` sont renseignés. Utiliser sa véritable date de référence ; aucune date n’est inventée par défaut.

## Vérifications

- `pnpm test` : validation des données, stockage local réel isolé, endpoints et authentification.
- `pnpm lint`
- `pnpm build` (réseau requis pour les polices Google).

La sauvegarde est bloquée tant que la journée n’a pas été chargée correctement. En cas d’échec d’enregistrement, la saisie reste affichée. Un changement de date ou une déconnexion demande confirmation si des modifications n’ont pas été enregistrées.

Pour ouvrir le carnet sans connexion en développement local, définir `MACY_LOCAL_NO_PASSWORD=true` dans `.env.local`. Cette option est ignorée en production et ne modifie ni le mot de passe ni les données.


## Suivi détaillé et dashboard

- `/today` : quatre repères rapides, détails par sections (émotions, corps, sommeil, appétit, contexte), saignements, prise, heure de prise, maladie, changement de médicament et début réel de plaquette.
- `/dashboard` : plage de dates, indicateur, filtre de contexte, couverture des données, jusqu’à quatre courbes de plaquettes sélectionnées, profil moyen et dispersion pour un même régime, comparaison actifs/pause, événements avec dénominateurs renseignés, tableau de deux paramètres, calendrier, périodes de traitement, CSV et sauvegarde JSON complète.
- `/settings` : historique de régimes par date d’effet (ajout, sans écrasement), champs visibles, seuils personnels pour sommeil, stress et effort. Le seuil de sommeil initial de 7 h est un réglage de lecture modifiable, pas une interprétation médicale.

Les périodes antérieures à la première référence ne sont pas affectées à un cycle inventé. La phase active/pause est prévue selon le régime ; l’oubli est une observation distincte. Un début réel de plaquette recale le calendrier à partir de ce jour. En continu, aucune pause n’est ajoutée. Les jours manquants interrompent les courbes. Les moyennes utilisent uniquement les mesures présentes, et le profil moyen ne mélange pas les régimes. Les points d’attention ne sont ni des diagnostics ni des exclusions automatiques.

La première sauvegarde enrichie conserve une copie exacte de l’ancien fichier, s’il existe, dans `.macy-data/entries-before-detailed-tracking.json`. Les champs masqués dans les paramètres restent stockés. Les réglages se trouvent dans `settings.json` à côté du carnet. Les exports JSON portent la version 2 et comprennent le carnet complet avec ses réglages ; l’import n’est pas proposé dans cette version. Le CSV suit les filtres affichés et neutralise les préfixes de formules.

Pour conserver les données lors d’un déplacement, sauvegarder le répertoire privé complet. L’application ne synchronise pas le carnet avec un service externe. La comparaison décrit des associations ; aucun effet causal de la pilule n’est déduit.

# Macy — Suivi détaillé et comparaison personnelle

## Objectif exprimé

Comprendre les variations du vécu quotidien sous pilule et comparer les périodes de prise, les pauses et plusieurs plaquettes. Remplacer le périmètre minimal des quatre curseurs par un carnet configurable et un dashboard d’analyse personnel. Stockage local sur le Mac conservé ; pas de migration MySQL implicite.

Implémentation locale réalisée : suivi détaillé, réglages, superposition des plaquettes, profil moyen, contextes, comparaison tabulaire de deux indicateurs, calendrier et exports. Les coefficients de corrélation, les rappels de saisie et l’import de sauvegarde restent hors de cette livraison. Les sections ci-dessous constituent le cadrage de référence.

## Point de départ vérifié

Le plan du 7 juillet prévoyait déjà : globalement, humeur basse, énergie, envie de sucre, crise et notes, saignement, irritabilité, anxiété, sensibilité, libido, concentration, ressenti de l’effort, stress, durée et qualité du sommeil, heure du coucher, réveils nocturnes, entraînement, alcool, maladie, envie de salé et appétit. Le plan MVP du 5 août a différé la plupart de ces éléments, ainsi que les écrans cycle, tendance et paramètres.

## Paramétrage du suivi

Historique des régimes, avec date d’effet et sans réécriture des anciens cycles : nom de la pilule, type si connu, prise continue ou rythme avec pause/placebo, nombre de comprimés actifs, jours sans comprimé actif, date réelle de début de plaquette, heure habituelle. Autoriser les débuts de plaquette et pauses réels à corriger le calendrier prévu. Un changement de pilule crée une nouvelle période comparable, pas un remplacement rétroactif.

Ne pas calculer un cycle à partir d’une date fictive. Pour une prise continue, proposer des fenêtres calendaires ou les plaquettes réellement enregistrées ; ne pas inventer de pause. Parler de jour de plaquette et de période sous traitement, sans déduire ovulation ou fertilité.

Choix des paramètres suivis, favoris et ordre des sections. Les champs désactivés restent dans l’historique. Toutes les notes ont des extrémités et une unité explicites. Les données non renseignées sont nulles, jamais zéro, absence ou neutre par défaut.

## Carnet quotidien

- Ressenti : état global, humeur basse, irritabilité, anxiété, sensibilité émotionnelle, stress, concentration, énergie et libido (échelles 1–5).
- Physique : saignement (aucun, spotting, léger, moyen, abondant), crampes/douleurs pelviennes, maux de tête, nausées, ballonnements, sensibilité des seins, peau/acné (sévérité 1–5 avec absence explicite). Localisation/détails libres, sans diagnostic.
- Sommeil et récupération : durée en heures, qualité, heure du coucher, nombre réel de réveils nocturnes ; entraînement, durée et effort ressenti.
- Appétit : appétit, envies de sucré/salé ; crise comme événement facultatif, avec détail libre.
- Prise : comprimé actif/placebo/pause, pris/non pris/non renseigné, heure réelle facultative, retard ou oubli renseigné, début réel d’une plaquette. Aucun conseil automatique de rattrapage ou de contraception.
- Contexte : maladie, stress inhabituel, alcool (unité indiquée), caféine et changements de médicaments facultatifs, événements libres. Les comparaisons peuvent afficher ou filtrer ces jours.

Une vue rapide configurable et des sections dépliables permettent d’éviter de remplir tous les champs tous les jours. Signaler les journées manquantes, sans les remplir automatiquement. Les anciennes notes à 3 sont conservées : faute de provenance, impossible de savoir si elles ont été explicitement choisies ; documenter cette limite historique.

## Dashboard

1. Vue d’ensemble : période choisie, nombre de jours renseignés/attendus, nombre de plaquettes observées, paramètres les plus documentés, évolution descriptive des mesures sélectionnées. Aucun score global agrégeant des unités différentes.
2. Comparer les plaquettes : superposition d’un indicateur par jour relatif, choix des plaquettes, distinction actifs/pause, gaps visibles pour les jours manquants. Pas de prolongation graphique d’une série incomplète.
3. Profil moyen : moyenne par jour de plaquette, dispersion et nombre d’observations par point, sur les plaquettes compatibles sélectionnées. Indiquer quand plusieurs jours proviennent d’un seul cycle.
4. Comparer les périodes : indicateur par indicateur, actifs vs pause ou deux plages choisies. Afficher moyenne/médiane, effectif renseigné et couverture. Pour saignements/crises/oubli : jours concernés rapportés aux jours réellement renseignés, pas aux jours manquants.
5. Calendrier : intensité d’un indicateur avec légende, saignements et événements, navigation vers la fiche du jour. Aucun fond coloré pour une donnée absente.
6. Associations exploratoires : juxtaposer deux séries (p.ex. énergie et sommeil), compter les journées où les deux existent, permettre de voir les points et les contextes. Ne pas annoncer une causalité ni un diagnostic. Différer les coefficients/statistiques inférentielles tant qu’une méthode et un seuil de données ne sont pas définis.
7. Historique des traitements : comparer les périodes documentées avant/après un changement, avec dates, effectifs et avertissement sur les différences de contexte et l’absence de référence avant traitement.
8. Export : CSV détaillé et JSON de sauvegarde, synthèse imprimable des observations et de la couverture pour une consultation. Les données restent locales.

Sur téléphone : navigation Carnet / Dashboard / Comparer / Paramètres, graphiques lisibles et valeurs accessibles au clavier. Les états sans données expliquent ce qu’il faut renseigner ; aucune fausse série de démonstration mélangée au carnet.

## Fiabilité et compatibilité

Versionner le format local. Préserver intégralement les entrées existantes ; migration explicite testée sur copie, sauvegarde préalable. Le changement de réglage ne recalcule pas silencieusement l’appartenance historique des journées à une période de traitement. Exporter sans formules exécutables dans un tableur.

Validation à tester : mesures manquantes, absence explicite, jours de pause, prise continue, changement de pilule/régime, démarrage de plaquette réel décalé, périodes incomplètes, fuseau Europe/Brussels, unités, doublons par date, sauvegarde et réouverture. Le dashboard doit lire toute la période sélectionnée, et pas seulement les 30 entrées retournées pour l’historique court actuel.

## Informations à confirmer

Nom de la pilule, rythme réellement suivi (dont placebos/pause ou continu), date de début de la plaquette actuelle. Identifier les effets prioritaires souhaités pour les favoris. Le paramétrage doit rester modifiable ; aucune posologie n’est suggérée par l’application.

## Références de cadrage

- NHS, effets rapportés de la pilule combinée : https://www.nhs.uk/contraception/methods-of-contraception/combined-pill/side-effects/
- NHS, intérêt d’un journal de symptômes : https://www.nhs.uk/conditions/periods/period-problems/

Les effets varient selon la personne et la méthode. L’application décrit des observations ; une association temporelle seule ne permet pas d’attribuer un changement à la pilule.

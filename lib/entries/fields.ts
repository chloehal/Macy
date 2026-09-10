export type Field = {
  key: string;
  label: string;
  group: string;
  min: number;
  max: number;
  step?: number;
  unit: string;
  low?: string;
  high?: string;
};
const scale = (
  key: string,
  label: string,
  group: string,
  low = "Pas du tout",
  high = "Beaucoup",
): Field => ({ key, label, group, min: 1, max: 5, unit: "/5", low, high });
export const detailFields: Field[] = [
  scale("irritabilite", "Irritabilité", "Émotions"),
  scale("anxiete", "Anxiété", "Émotions"),
  scale("sensibilite", "Sensibilité émotionnelle", "Émotions"),
  scale("stress", "Stress", "Émotions"),
  scale("concentration", "Concentration", "Émotions", "Difficile", "Facile"),
  scale("libido", "Libido", "Émotions", "Basse", "Haute"),
  ...[
    ["crampes", "Crampes / douleurs pelviennes"],
    ["mauxTete", "Maux de tête"],
    ["nausees", "Nausées"],
    ["ballonnements", "Ballonnements"],
    ["seins", "Sensibilité des seins"],
    ["peau", "Acné / peau"],
  ].map(([k, l]) => scale(k, l, "Corps", "Absent", "Très marqué")),
  {
    key: "sommeilHeures",
    label: "Durée du sommeil",
    group: "Sommeil",
    min: 0,
    max: 24,
    step: 0.25,
    unit: "h",
  },
  scale("sommeilQualite", "Qualité du sommeil", "Sommeil", "Mauvaise", "Bonne"),
  {
    key: "reveils",
    label: "Réveils nocturnes",
    group: "Sommeil",
    min: 0,
    max: 30,
    unit: "réveils",
  },
  scale("envieSale", "Envie de salé", "Appétit", "Aucune", "Forte"),
  scale("appetit", "Appétit", "Appétit", "Faible", "Fort"),
  {
    key: "sportMinutes",
    label: "Durée du sport",
    group: "Contexte",
    min: 0,
    max: 1440,
    unit: "min",
  },
  scale("effort", "Effort ressenti", "Contexte", "Léger", "Intense"),
  {
    key: "alcool",
    label: "Alcool",
    group: "Contexte",
    min: 0,
    max: 30,
    step: 0.5,
    unit: "verres standards (10 g)",
  },
  {
    key: "cafeine",
    label: "Caféine",
    group: "Contexte",
    min: 0,
    max: 2000,
    unit: "mg",
  },
];
export const categories = [...new Set(detailFields.map((f) => f.group))];
export const selections = {
  saignement: {
    label: "Saignements",
    options: ["Aucun", "Spotting", "Légers", "Moyens", "Abondants"],
  },
  prise: {
    label: "Prise du jour",
    options: [
      "Comprimé actif pris",
      "Pause prévue",
      "Placebo pris",
      "Oubli / non pris",
    ],
  },
  maladie: { label: "Maladie", options: ["Non", "Oui"] },
  evenement: { label: "Événement inhabituel", options: ["Non", "Oui"] },
  medicament: { label: "Changement de médicament", options: ["Non", "Oui"] },
} as const;
export type SelectionKey = keyof typeof selections;

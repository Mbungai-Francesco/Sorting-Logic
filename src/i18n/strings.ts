export type Locale = 'fr' | 'en';

export const LOCALES: Locale[] = ['fr', 'en'];

/** Placeholders like {i} are filled by t(key, { i: 3 }). */
export const strings = {
  appTitle: { fr: 'Visualiseur d’algorithmes de tri', en: 'Sorting algorithm visualizer' },
  langToggle: { fr: 'English', en: 'Français' },
  langToggleTitle: { fr: 'Switch to English', en: 'Passer en français' },

  // picker
  pickerTitle: { fr: 'Algorithmes', en: 'Algorithms' },
  groupSort: { fr: 'Tris', en: 'Sorting' },
  groupSearch: { fr: 'Recherche', en: 'Searching' },
  notImplemented: { fr: 'à implémenter', en: 'to implement' },

  // toolbar
  size: { fr: 'Taille', en: 'Size' },
  preset: { fr: 'Données', en: 'Data' },
  seed: { fr: 'Graine', en: 'Seed' },
  regenerate: { fr: 'Régénérer', en: 'Regenerate' },
  regenerateTitle: { fr: 'Nouvelle graine aléatoire (R)', en: 'New random seed (R)' },
  customArray: { fr: 'Tableau perso', en: 'Custom array' },
  customPlaceholder: { fr: 'ex. 5, 3, 8, 1', en: 'e.g. 5, 3, 8, 1' },
  customApply: { fr: 'Appliquer', en: 'Apply' },
  customClear: { fr: 'Effacer', en: 'Clear' },
  customActive: { fr: 'Données personnalisées ({n} valeurs)', en: 'Custom data ({n} values)' },
  customInvalid: {
    fr: 'Entrez de 1 à {max} nombres entre 0 et 1000, séparés par des virgules ou des espaces.',
    en: 'Enter 1 to {max} numbers between 0 and 1000, separated by commas or spaces.',
  },
  target: { fr: 'Valeur cherchée', en: 'Target value' },
  targetAuto: { fr: 'auto ({v})', en: 'auto ({v})' },

  presetRandom: { fr: 'Aléatoire', en: 'Random' },
  presetNearlySorted: { fr: 'Presque trié', en: 'Nearly sorted' },
  presetReversed: { fr: 'Inversé', en: 'Reversed' },
  presetFewUnique: { fr: 'Peu de valeurs distinctes', en: 'Few unique' },
  presetAllEqual: { fr: 'Toutes égales', en: 'All equal' },
  presetSorted: { fr: 'Déjà trié', en: 'Already sorted' },

  // stage
  stageLabel: { fr: 'Visualisation du tableau', en: 'Array visualization' },
  auxRow: { fr: 'Tableau auxiliaire', en: 'Auxiliary array' },
  mainRow: { fr: 'Tableau', en: 'Array' },
  todoTitle: { fr: '« {name} » est à implémenter', en: '“{name}” is not implemented yet' },
  todoBody: {
    fr: 'Écrivez le générateur dans {file}, puis passez implemented: true dans src/algorithms/index.ts. Le guide : docs/ADDING_AN_ALGORITHM.md.',
    en: 'Write the generator in {file}, then set implemented: true in src/algorithms/index.ts. Guide: docs/ADDING_AN_ALGORITHM.md.',
  },
  errorTitle: { fr: 'L’enregistrement a échoué', en: 'Recording failed' },
  errorAtStep: { fr: 'après {n} étapes', en: 'after {n} steps' },
  notSortedWarning: {
    fr: '⚠ Le tableau final n’est pas trié — lancez npm run test.',
    en: '⚠ The final array is not sorted — run npm run test.',
  },
  sortedInput: { fr: 'Entrée triée automatiquement (prérequis de l’algorithme)', en: 'Input sorted automatically (required by the algorithm)' },

  // player
  play: { fr: 'Lecture', en: 'Play' },
  pause: { fr: 'Pause', en: 'Pause' },
  stepBack: { fr: 'Étape précédente (←, ⇧← : −10)', en: 'Step back (←, ⇧← : −10)' },
  stepForward: { fr: 'Étape suivante (→, ⇧→ : +10)', en: 'Step forward (→, ⇧→ : +10)' },
  reset: { fr: 'Revenir au début (0)', en: 'Back to start (0)' },
  timeline: { fr: 'Chronologie', en: 'Timeline' },
  speed: { fr: 'Vitesse', en: 'Speed' },
  stepsPerSec: { fr: 'étapes/s', en: 'steps/s' },
  shortcuts: {
    fr: 'Espace : lecture/pause · ←/→ : étape · ⇧ : ×10 · R : régénérer · 0 : début',
    en: 'Space: play/pause · ←/→: step · ⇧: ×10 · R: regenerate · 0: start',
  },

  // code / stats / complexity
  codeTitle: { fr: 'Code source', en: 'Source code' },
  statsTitle: { fr: 'Compteurs', en: 'Counters' },
  statsNow: { fr: 'maintenant', en: 'now' },
  statsTotal: { fr: 'total', en: 'total' },
  comparisons: { fr: 'Comparaisons', en: 'Comparisons' },
  swaps: { fr: 'Échanges', en: 'Swaps' },
  writes: { fr: 'Écritures', en: 'Writes' },
  reads: { fr: 'Lectures', en: 'Reads' },
  maxDepth: { fr: 'Profondeur max.', en: 'Max depth' },
  complexityTitle: { fr: 'Complexité', en: 'Complexity' },
  best: { fr: 'Meilleur cas', en: 'Best case' },
  average: { fr: 'Cas moyen', en: 'Average case' },
  worst: { fr: 'Pire cas', en: 'Worst case' },
  space: { fr: 'Mémoire', en: 'Space' },
  stable: { fr: 'Stable', en: 'Stable' },
  yes: { fr: 'oui', en: 'yes' },
  no: { fr: 'non', en: 'no' },
  notApplicable: { fr: '—', en: '—' },

  // step captions (fallback when the algorithm gives no note)
  capStart: { fr: 'Prêt. Appuyez sur lecture ou →.', en: 'Ready. Press play or →.' },
  capDone: { fr: 'Terminé en {n} étapes.', en: 'Done in {n} steps.' },
  capCompare: { fr: 'Compare a[{i}] = {a} et a[{j}] = {b}', en: 'Compare a[{i}] = {a} and a[{j}] = {b}' },
  capSwap: { fr: 'Échange a[{i}] et a[{j}]', en: 'Swap a[{i}] and a[{j}]' },
  capWrite: { fr: 'Écrit {v} dans {arr}[{i}]', en: 'Write {v} into {arr}[{i}]' },
  capWriteMany: { fr: '{n} écritures', en: '{n} writes' },
  capInsertRight: { fr: 'Insère a[{i}] en position {j}, décale a[{j}..{i}] vers la droite', en: 'Insert a[{i}] at {j}, shift a[{j}..{i}] right' },
  capInsertLeft: { fr: 'Insère a[{i}] en position {j}, décale a[{i}..{j}] vers la gauche', en: 'Insert a[{i}] at {j}, shift a[{i}..{j}] left' },
  capRead: { fr: 'Lit {arr}[{i}]', en: 'Read {arr}[{i}]' },
  capPivot: { fr: 'Pivot : a[{i}]', en: 'Pivot: a[{i}]' },
  capPivotLabel: { fr: '{label} : a[{i}]', en: '{label}: a[{i}]' },
  capRange: { fr: 'Sous-tableau [{lo}, {hi}] (profondeur {d})', en: 'Sub-array [{lo}, {hi}] (depth {d})' },
  capSorted: { fr: '{n} élément(s) à sa place', en: '{n} element(s) in place' },
  capProbe: { fr: 'lo = {lo}, mid = {mid}, hi = {hi}', en: 'lo = {lo}, mid = {mid}, hi = {hi}' },
  capFound: { fr: 'Trouvé à l’indice {i}', en: 'Found at index {i}' },
  capNotFound: { fr: 'Valeur absente du tableau', en: 'Value not in the array' },
  arrMain: { fr: 'a', en: 'a' },
  arrAux: { fr: 'aux', en: 'aux' },
} as const satisfies Record<string, Record<Locale, string>>;

export type StringKey = keyof typeof strings;

import type { AlgorithmEntry } from '../core/ctx';

import { bubbleSort } from './bubble';
import bubbleSource from './bubble.ts?raw';
import { insertionSort } from './insertion';
import insertionSource from './insertion.ts?raw';
import { selectionSort } from './selection';
import selectionSource from './selection.ts?raw';
import { mergeSort } from './merge';
import mergeSource from './merge.ts?raw';
import { quickSort } from './quick';
import quickSource from './quick.ts?raw';
import { heapSort } from './heap';
import heapSource from './heap.ts?raw';
import { binarySearch } from './binarySearch';
import binarySearchSource from './binarySearch.ts?raw';

/**
 * The registry. To activate an algorithm once written, flip `implemented`
 * to true — the picker, the conformance tests and the player pick it up.
 */
export const algorithms: AlgorithmEntry[] = [
  {
    id: 'bubble',
    name: { fr: 'Tri à bulles', en: 'Bubble sort' },
    kind: 'sort',
    implemented: true,
    needsAux: false,
    complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true },
    source: bubbleSource,
    run: bubbleSort,
  },
  {
    id: 'insertion',
    name: { fr: 'Tri par insertion', en: 'Insertion sort' },
    kind: 'sort',
    implemented: false,
    needsAux: false,
    complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true },
    source: insertionSource,
    run: insertionSort,
  },
  {
    id: 'selection',
    name: { fr: 'Tri par sélection', en: 'Selection sort' },
    kind: 'sort',
    implemented: true,
    needsAux: false,
    complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: false },
    source: selectionSource,
    run: selectionSort,
  },
  {
    id: 'merge',
    name: { fr: 'Tri fusion', en: 'Merge sort' },
    kind: 'sort',
    implemented: false,
    needsAux: true,
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', stable: true },
    source: mergeSource,
    run: mergeSort,
  },
  {
    id: 'quick',
    name: { fr: 'Tri rapide', en: 'Quicksort' },
    kind: 'sort',
    implemented: false,
    needsAux: false,
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)', stable: false },
    source: quickSource,
    run: quickSort,
  },
  {
    id: 'heap',
    name: { fr: 'Tri par tas', en: 'Heapsort' },
    kind: 'sort',
    implemented: false,
    needsAux: false,
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)', stable: false },
    source: heapSource,
    run: heapSort,
  },
  {
    id: 'binarySearch',
    name: { fr: 'Recherche dichotomique', en: 'Binary search' },
    kind: 'search',
    implemented: true,
    needsAux: false,
    requiresSorted: true,
    requiresTarget: true,
    complexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)', stable: false },
    source: binarySearchSource,
    run: binarySearch,
  },
];

export const DEFAULT_ALGORITHM_ID = 'bubble';

export function getAlgorithm(id: string): AlgorithmEntry | undefined {
  return algorithms.find((a) => a.id === id);
}

/** Level and position-in-level of heap index i (children of i: 2i+1, 2i+2). */
export function heapSlot(i: number): { level: number; pos: number } {
  const level = Math.floor(Math.log2(i + 1));
  return { level, pos: i - (2 ** level - 1) };
}

/** How many values fall in each class. Every class in `order` is present (zero when empty), so legends keep a stable shape. */
export function countBy<K extends string>(values: readonly number[], order: readonly K[], classify: (v: number) => K): Record<K, number> {
  const out = Object.fromEntries(order.map((k) => [k, 0])) as Record<K, number>
  for (const v of values) { if (Number.isFinite(v)) out[classify(v)] += 1 }
  return out
}

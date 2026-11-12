/** Line-oriented readable diff for model vs approved draft bodies. */

export type DiffLine =
  | { kind: 'same'; text: string }
  | { kind: 'add'; text: string }
  | { kind: 'remove'; text: string }

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.replace(/\r\n/g, '\n').split('\n')
  const b = after.replace(/\r\n/g, '\n').split('\n')
  const n = a.length
  const m = b.length
  // LCS DP (bodies are short review drafts)
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => 0)
  )
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i]![j] = dp[i + 1]![j + 1]! + 1
      else dp[i]![j] = Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i]! })
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ kind: 'remove', text: a[i]! })
      i++
    } else {
      out.push({ kind: 'add', text: b[j]! })
      j++
    }
  }
  while (i < n) {
    out.push({ kind: 'remove', text: a[i]! })
    i++
  }
  while (j < m) {
    out.push({ kind: 'add', text: b[j]! })
    j++
  }
  return out
}

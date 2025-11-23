import { Package } from "../core/Package";

/*
  Try to determine if we can pack the entire 'packages' array exactly into capacity.
  good to check for fragile bundle must be shipped together or not at all.
  Returns true if sum(sizes) === capacity or there exists a subset equal to capacity
  TC exponenital in worst case but sorting & memoisation helps
*/
export function canPackExact(packages: Package[], capacity: number): boolean {
    // quick checks
    const total = packages.reduce((s, p) => s + p.size, 0);
    if (total === capacity) return true;
    if (total < capacity) return false;

    const sizes = packages.map(p => p.size).sort((a, b) => b - a); //sort in descending order

    const memo = new Map<string, boolean>();
    function dfs(i: number, remaining: number): boolean {
        if (remaining === 0) return true;
        if (remaining < 0) return false;
        if (i >= sizes.length) return false;

        const key = `${i}|${remaining}`;
        if (memo.has(key)) return memo.get(key)!;

        if (dfs(i + 1, remaining - sizes[i])) { //choose 
            memo.set(key, true);
            return true;
        }
        if (dfs(i + 1, remaining)) { //skip
            memo.set(key, true);
            return true;
        }
        memo.set(key, false);
        return false;
    }
    return dfs(0, capacity);
}

/*  Find a subset of packages that maximizes total size <= capacity.
    Returns an array of selected packages (references from input), or empty array if none fits.

    Uses backtracking with pruning + memoization for improved performance. 
    TC exponenital in worst case but pruning via prefix sums & memoisation helps
*/
export function bestFitSubset(packages: Package[], capacity: number): Package[] {
  if (capacity <= 0 || packages.length === 0) return [];

  const indexed = packages.map((p, idx) => ({ p, idx })); // sort packages descending so large ones try first 
  indexed.sort((a, b) => b.p.size - a.p.size);

  let bestSum = 0;
  let bestSelection: number[] = [];
  
  const sizes = indexed.map(x => x.p.size); // prefix sums for optimistic pruning (remaining max possible)
  const prefixMax = Array(sizes.length + 1).fill(0);
  for (let i = sizes.length - 1; i >= 0; --i) {
    prefixMax[i] = prefixMax[i + 1] + sizes[i];
  }

  const memo = new Set<string>(); // memoization for (i, currentSum)

  function dfs(i: number, currentSum: number, selection: number[]) {
    if (currentSum === capacity) {  // prune if currentSum already equals capacity (optimal)
      bestSum = currentSum;
      bestSelection = selection.slice();
      return;
    }

    if (i >= sizes.length) { // if we reachend
      if (currentSum > bestSum) {
        bestSum = currentSum;
        bestSelection = selection.slice();
      }
      return;
    }

    // optimistic: currentSum + max remaining < bestSum => prune
    if (currentSum + prefixMax[i] <= bestSum) return;

    const key = `${i}|${currentSum}`;
    if (memo.has(key)) return;
    memo.add(key);

    const sizeI = sizes[i];
    // Try to include current if it doesn't overflow
    if (currentSum + sizeI <= capacity) {
      selection.push(indexed[i].idx);
      dfs(i + 1, currentSum + sizeI, selection);
      selection.pop();

      // if we reached exact capacity, short-circuit
      if (bestSum === capacity) return;
    }
    // Try by skipping current
    dfs(i + 1, currentSum, selection);
  }

  dfs(0, 0, []);
  // map bestSelection (indices relative to original packages)
  return bestSelection.map(idx => packages[idx]);
}
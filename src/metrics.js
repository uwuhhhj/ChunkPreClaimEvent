import { key, neighbors4, parseKey } from "./utils.js";

export function countClaimedNeighbors4(claimedSet, x, z) {
  let count = 0;
  for (const n of neighbors4(x, z)) {
    if (claimedSet.has(key(n.x, n.z))) count++;
  }
  return count;
}

export function countEndpoints4(claimedSet) {
  let count = 0;
  for (const k0 of claimedSet) {
    const { x, z } = parseKey(k0);
    const deg = countClaimedNeighbors4(claimedSet, x, z);
    if (deg === 1) count++;
  }
  return count;
}

export function perimeterEdges(claimedSet) {
  let p = 0;
  for (const k0 of claimedSet) {
    const { x, z } = parseKey(k0);
    for (const n of neighbors4(x, z)) {
      if (!claimedSet.has(key(n.x, n.z))) p++;
    }
  }
  return p;
}

export function approxDiameter4(claimedSet) {
  if (claimedSet.size === 0) return 0;

  const startKey = claimedSet.values().next().value;

  const bfs = (srcKey) => {
    const q = [srcKey];
    let qHead = 0;
    const dist = new Map([[srcKey, 0]]);
    let farKey = srcKey;
    while (qHead < q.length) {
      const cur = q[qHead++];
      const d = dist.get(cur);
      farKey = cur;
      const { x, z } = parseKey(cur);
      for (const n of neighbors4(x, z)) {
        const nk = key(n.x, n.z);
        if (!claimedSet.has(nk) || dist.has(nk)) continue;
        dist.set(nk, d + 1);
        q.push(nk);
      }
    }
    let maxD = 0;
    for (const [k1, d] of dist) {
      if (d >= maxD) {
        maxD = d;
        farKey = k1;
      }
    }
    return { farKey, maxD };
  };

  const a = bfs(startKey);
  const b = bfs(a.farKey);
  return b.maxD;
}

export function computeBounds(claimedSet) {
  if (claimedSet.size === 0) return null;
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const k0 of claimedSet) {
    const { x, z } = parseKey(k0);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const w = maxX - minX + 1;
  const h = maxZ - minZ + 1;
  const L = Math.max(w, h);
  return { minX, maxX, minZ, maxZ, w, h, L };
}

export function updateBoundsWithCell(bounds, x, z) {
  if (!bounds) {
    return { minX: x, maxX: x, minZ: z, maxZ: z, w: 1, h: 1, L: 1 };
  }
  const minX = Math.min(bounds.minX, x);
  const maxX = Math.max(bounds.maxX, x);
  const minZ = Math.min(bounds.minZ, z);
  const maxZ = Math.max(bounds.maxZ, z);
  const w = maxX - minX + 1;
  const h = maxZ - minZ + 1;
  const L = Math.max(w, h);
  return { minX, maxX, minZ, maxZ, w, h, L };
}

export function maxFilledSquareSide(claimedSet, bounds) {
  if (!bounds || claimedSet.size === 0) return 0;
  const w = bounds.w;
  if (w <= 0) return 0;

  const dp = new Int32Array(w + 1);
  let maxS = 0;
  for (let z = bounds.minZ; z <= bounds.maxZ; z++) {
    let prevDiag = 0;
    for (let xi = 1; xi <= w; xi++) {
      const x = bounds.minX + (xi - 1);
      const tmp = dp[xi];
      if (claimedSet.has(key(x, z))) {
        const v = 1 + Math.min(dp[xi], dp[xi - 1], prevDiag);
        dp[xi] = v;
        if (v > maxS) maxS = v;
      } else {
        dp[xi] = 0;
      }
      prevDiag = tmp;
    }
  }
  return maxS;
}


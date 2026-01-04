import { key, neighbors4, parseKey } from "./utils.js";
import {
  computeBounds,
  countClaimedNeighbors4,
  countEndpoints4,
  maxFilledSquareSide,
  perimeterEdges,
  updateBoundsWithCell,
} from "./metrics.js";

function armLengthFromEndpoint4(claimedSet, startKey) {
  const visited = new Set();
  let curKey = startKey;
  let prevKey = null;
  let len = 0;
  while (true) {
    if (visited.has(curKey)) break;
    visited.add(curKey);

    const { x, z } = parseKey(curKey);
    const neigh = neighbors4(x, z)
      .map((n) => key(n.x, n.z))
      .filter((k1) => claimedSet.has(k1) && k1 !== prevKey);

    const deg = countClaimedNeighbors4(claimedSet, x, z);
    if (deg !== 2 && curKey !== startKey) break;
    if (neigh.length !== 1) break;

    prevKey = curKey;
    curKey = neigh[0];
    len++;
  }
  return len;
}

function hasHoles4(claimedSet) {
  if (claimedSet.size === 0) return false;

  const bounds = computeBounds(claimedSet);
  if (!bounds) return false;

  let { minX, maxX, minZ, maxZ } = bounds;
  minX -= 1;
  maxX += 1;
  minZ -= 1;
  maxZ += 1;

  const inBounds = (x, z) => x >= minX && x <= maxX && z >= minZ && z <= maxZ;
  const visited = new Set();
  const q = [];

  const tryPush = (x, z) => {
    if (!inBounds(x, z)) return;
    const k0 = key(x, z);
    if (claimedSet.has(k0) || visited.has(k0)) return;
    visited.add(k0);
    q.push({ x, z });
  };

  for (let x = minX; x <= maxX; x++) {
    tryPush(x, minZ);
    tryPush(x, maxZ);
  }
  for (let z = minZ; z <= maxZ; z++) {
    tryPush(minX, z);
    tryPush(maxX, z);
  }

  for (let qHead = 0; qHead < q.length; qHead++) {
    const cur = q[qHead];
    for (const n of neighbors4(cur.x, cur.z)) {
      tryPush(n.x, n.z);
    }
  }

  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      const k0 = key(x, z);
      if (claimedSet.has(k0)) continue;
      if (!visited.has(k0)) return true;
    }
  }
  return false;
}

export function defaultCanClaim(state, cell) {
  if (state.claimed.has(key(cell.x, cell.z))) return false;
  if (state.claimed.size === 0) return true;

  const nAdj = countClaimedNeighbors4(state.claimed, cell.x, cell.z);
  if (nAdj === 0) return false;

  const rules = state.rules;
  const area0 = state.metrics.area || state.claimed.size;
  const bounds0 = state.metrics.bounds || computeBounds(state.claimed);

  if (rules.requireTwoAdj && nAdj < 2) return false;

  if (rules.limitArm && nAdj === 1) {
    const kNew = key(cell.x, cell.z);
    const nextSet = new Set(state.claimed);
    nextSet.add(kNew);
    const armLen = armLengthFromEndpoint4(nextSet, kNew);
    if (armLen > rules.maxArmLen) return false;
  }

  if (rules.limitPA) {
    const perim0 = state.metrics.perim || perimeterEdges(state.claimed);
    const dP = 4 - 2 * nAdj;
    const ratio = (perim0 + dP) / (area0 + 1);
    if (ratio > rules.maxPA) return false;
  }

  if (rules.limitEndpoints) {
    const ends0 = state.metrics.endpoints || countEndpoints4(state.claimed);
    let ends = ends0;
    if (nAdj === 1) ends += 1;

    for (const n of neighbors4(cell.x, cell.z)) {
      const nk = key(n.x, n.z);
      if (!state.claimed.has(nk)) continue;
      const degBefore = countClaimedNeighbors4(state.claimed, n.x, n.z);
      const degAfter = degBefore + 1;
      if (degBefore === 1 && degAfter === 2) ends -= 1;
      if (degBefore === 0 && degAfter === 1) ends += 1;
    }

    if (ends > rules.maxEndpoints) return false;
  }

  if (rules.forbidHoles) {
    const nextSet = new Set(state.claimed);
    nextSet.add(key(cell.x, cell.z));
    if (hasHoles4(nextSet)) return false;
  }

  if (rules.limitOuterFill) {
    const b1 = updateBoundsWithCell(bounds0, cell.x, cell.z);
    const L = b1.L || 1;
    const fill = (area0 + 1) / (L * L);
    if (fill < rules.minOuterFill) return false;
  }

  if (rules.limitInnerShare) {
    const nextSet = new Set(state.claimed);
    nextSet.add(key(cell.x, cell.z));
    const b1 = updateBoundsWithCell(bounds0, cell.x, cell.z);
    const Lin = maxFilledSquareSide(nextSet, b1);
    const share = (Lin * Lin) / (area0 + 1);
    if (share < rules.minInnerShare) return false;
  }

  return true;
}


(() => {
  const app = (window.ChunkPreClaimEvent = window.ChunkPreClaimEvent || {});
  app.rules = app.rules || {};

  const { key, neighbors4, parseKey } = app.utils;
  const {
    computeBounds,
    countClaimedNeighbors4,
    countEndpoints4,
    maxFilledSquareSide,
    perimeterEdges,
    updateBoundsWithCell,
  } = app.metrics;

  const armLengthFromEndpoint4 = (claimedSet, startKey) => {
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
  };

  const isConnected4 = (claimedSet) => {
    if (claimedSet.size <= 1) return true;

    const startKey = claimedSet.values().next().value;
    const visited = new Set([startKey]);
    const q = [startKey];

    for (let qHead = 0; qHead < q.length; qHead++) {
      const curKey = q[qHead];
      const { x, z } = parseKey(curKey);
      for (const n of neighbors4(x, z)) {
        const nk = key(n.x, n.z);
        if (!claimedSet.has(nk) || visited.has(nk)) continue;
        visited.add(nk);
        q.push(nk);
      }
    }

    return visited.size === claimedSet.size;
  };

  const hasHoles4 = (claimedSet) => {
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
  };

  const ok = () => ({ ok: true });
  const reject = (module, reason) => ({ ok: false, module, reason });

  app.rules.isConnected4 = isConnected4;
  app.rules.hasHoles4 = hasHoles4;

  app.rules.defaultCanUnclaim = (state, cell) => {
    const k0 = key(cell.x, cell.z);
    if (!state.claimed.has(k0)) return reject("模块U0", "该格子不是已圈地");
    if (state.claimed.size <= 1) return ok();

    const nextSet = new Set(state.claimed);
    nextSet.delete(k0);

    if (!isConnected4(nextSet)) return reject("模块U1", "撤销后会导致断裂（不连通）");
    if (hasHoles4(nextSet)) return reject("模块U2", "撤销后会出现空心（洞）");
    return ok();
  };

  app.rules.defaultCanClaim = (state, cell) => {
    if (state.claimed.has(key(cell.x, cell.z))) return reject("模块Z", "该格子已是已圈地");
    if (state.claimed.size === 0) return ok();

    const nAdj = countClaimedNeighbors4(state.claimed, cell.x, cell.z);
    if (nAdj === 0) return reject("模块A", "必须与已有领地 4 邻接");

    const rules = state.rules;
    const area0 = state.metrics.area || state.claimed.size;
    const bounds0 = state.metrics.bounds || computeBounds(state.claimed);

    if (rules.requireTwoAdj && nAdj < 2) {
      return reject("模块B", "扩张需 ≥2 邻接（4 邻接）");
    }

    if (rules.limitArm && nAdj === 1) {
      const kNew = key(cell.x, cell.z);
      const nextSet = new Set(state.claimed);
      nextSet.add(kNew);
      const armLen = armLengthFromEndpoint4(nextSet, kNew);
      if (armLen > rules.maxArmLen) {
        return reject("模块C", `细长臂过长（armLen=${armLen} > L=${rules.maxArmLen}）`);
      }
    }

    if (rules.limitPA) {
      const perim0 = state.metrics.perim || perimeterEdges(state.claimed);
      const dP = 4 - 2 * nAdj;
      const ratio = (perim0 + dP) / (area0 + 1);
      if (ratio > rules.maxPA) {
        return reject("模块D", `P/A 超标（${ratio.toFixed(3)} > ${rules.maxPA}）`);
      }
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

      if (ends > rules.maxEndpoints) {
        return reject("模块E", `端点数超标（${ends} > ${rules.maxEndpoints}）`);
      }
    }

    if (rules.forbidHoles) {
      const nextSet = new Set(state.claimed);
      nextSet.add(key(cell.x, cell.z));
      if (hasHoles4(nextSet)) return reject("模块F", "出现空心圈地（洞）");
    }

    if (rules.limitOuterFill) {
      const b1 = updateBoundsWithCell(bounds0, cell.x, cell.z);
      const L = b1.L || 1;
      const fill = (area0 + 1) / (L * L);
      if (fill < rules.minOuterFill) {
        return reject("模块G", `外接正方形填充率过低（${fill.toFixed(3)} < ${rules.minOuterFill}）`);
      }
    }

    if (rules.limitInnerShare) {
      const nextSet = new Set(state.claimed);
      nextSet.add(key(cell.x, cell.z));
      const b1 = updateBoundsWithCell(bounds0, cell.x, cell.z);
      const Lin = maxFilledSquareSide(nextSet, b1);
      const share = (Lin * Lin) / (area0 + 1);
      if (share < rules.minInnerShare) {
        return reject("模块H", `最大内接实心方占比过低（${share.toFixed(3)} < ${rules.minInnerShare}）`);
      }
    }

    return ok();
  };
})();

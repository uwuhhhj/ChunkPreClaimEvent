(() => {
  const app = (window.ChunkPreClaimEvent = window.ChunkPreClaimEvent || {});
  app.rules = app.rules || {};

  const { key, neighbors4, parseKey } = app.utils;
  const {
    approxDiameter4,
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

  const holeCells4 = (claimedSet) => {
    const holes = new Set();
    if (claimedSet.size === 0) return holes;

    const bounds = computeBounds(claimedSet);
    if (!bounds) return holes;

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
        if (!visited.has(k0)) holes.add(k0);
      }
    }

    return holes;
  };

  const ok = () => ({ ok: true });
  const reject = (module, reason) => ({ ok: false, module, reason });

  const countRing8AndRing24 = (claimedSet, center) => {
    let ring1Claimed = 0;
    let ring1Available = 0;
    let ring12Claimed = 0;
    let ring12Available = 0;

    const countForRadius = (radius) => {
      let claimed = 0;
      let available = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dz === 0) continue;
          const x = center.x + dx;
          const z = center.z + dz;
          const k0 = key(x, z);
          if (claimedSet.has(k0)) {
            claimed++;
            continue;
          }
          const nAdj = countClaimedNeighbors4(claimedSet, x, z);
          if (nAdj > 0) available++;
        }
      }
      return { claimed, available };
    };

    const r1 = countForRadius(1);
    ring1Claimed = r1.claimed;
    ring1Available = r1.available;

    const r2 = countForRadius(2);
    ring12Claimed = r2.claimed;
    ring12Available = r2.available;

    return { ring1Claimed, ring1Available, ring12Claimed, ring12Available };
  };

  app.rules.isConnected4 = isConnected4;
  app.rules.hasHoles4 = hasHoles4;
  app.rules.holeCells4 = holeCells4;

  app.rules.defaultCanUnclaim = (state, cell) => {
    const k0 = key(cell.x, cell.z);
    if (!state.claimed.has(k0)) return reject("U0｜撤销：非已圈地", "该格子不是已圈地");
    if (state.claimed.size <= 1) return ok();

    const nextSet = new Set(state.claimed);
    nextSet.delete(k0);

    if (!isConnected4(nextSet)) return reject("U1｜撤销：保持连通", "撤销后会导致断裂（不连通）");
    const curHoles = holeCells4(state.claimed);
    const nextHoles = holeCells4(nextSet);
    if (curHoles.size === 0) {
      if (nextHoles.size > 0) return reject("U2｜撤销：不造洞/不扩洞", "撤销后会出现空心（洞）");
    } else {
      for (const hk of nextHoles) {
        if (!curHoles.has(hk)) {
          return reject("U2｜撤销：不造洞/不扩洞", `撤销后空心区域变大（${curHoles.size} -> ${nextHoles.size}）`);
        }
      }
    }
    return ok();
  };

  app.rules.defaultCanClaim = (state, cell) => {
    if (state.claimed.has(key(cell.x, cell.z))) return reject("Z｜重复圈地", "该格子已是已圈地");
    if (state.claimed.size === 0) return ok();

    const nAdj = countClaimedNeighbors4(state.claimed, cell.x, cell.z);
    if (nAdj === 0) return reject("A｜四邻接扩张", "必须与已有领地四邻接（上下左右相邻）");

    const rules = state.rules;
    const area0 = state.metrics.area || state.claimed.size;
    const bounds0 = state.metrics.bounds || computeBounds(state.claimed);

    if (rules.requireTwoAdj && nAdj < 2) {
      return reject("B｜双邻接门槛", "扩张需至少 2 个已圈地格子的四邻接");
    }

    if (rules.limitArm && nAdj === 1) {
      const kNew = key(cell.x, cell.z);
      const nextSet = new Set(state.claimed);
      nextSet.add(kNew);
      const armLen = armLengthFromEndpoint4(nextSet, kNew);
      if (armLen > rules.maxArmLen) {
        return reject("C｜长臂抑制", `细长臂过长（armLen=${armLen} > L=${rules.maxArmLen}）`);
      }
    }

    if (rules.limitSupport) {
      const { ring1Claimed, ring1Available, ring12Claimed, ring12Available } = countRing8AndRing24(state.claimed, cell);
      const m = Number(rules.supportM);
      const n = Number(rules.supportN);
      const pass1 = Number.isFinite(m) ? ring1Claimed > m : false;
      const pass12 = Number.isFinite(n) ? ring12Claimed > n : false;
      if (!pass1 || !pass12) {
        return reject(
          "J｜邻域支撑(8/24)",
          `1圈(8格) 已圈地=${ring1Claimed} 可圈地=${ring1Available}（需 > m=${rules.supportM}）且 1+2圈(24格) 已圈地=${ring12Claimed} 可圈地=${ring12Available}（需 > n=${rules.supportN}）`,
        );
      }
    }

    if (rules.limitPA) {
      const perim0 = state.metrics.perim || perimeterEdges(state.claimed);
      const dP = 4 - 2 * nAdj;
      const ratio = (perim0 + dP) / (area0 + 1);
      if (ratio > rules.maxPA) {
        return reject("D｜形状紧凑度(P/A)", `P/A 超标（${ratio.toFixed(3)} > ${rules.maxPA}）`);
      }
    }

    if (rules.limitDiam) {
      const nextSet = new Set(state.claimed);
      nextSet.add(key(cell.x, cell.z));
      const diam = approxDiameter4(nextSet);
      if (diam > rules.maxDiam) {
        return reject("I｜直径上限(D)", `直径 D 超标（${diam} > ${rules.maxDiam}）`);
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
        return reject("E｜端点数上限", `端点数超标（${ends} > ${rules.maxEndpoints}）`);
      }
    }

    if (rules.forbidHoles) {
      const nextSet = new Set(state.claimed);
      nextSet.add(key(cell.x, cell.z));

      const curHoles = holeCells4(state.claimed);
      const nextHoles = holeCells4(nextSet);

      if (curHoles.size === 0) {
        if (nextHoles.size > 0) return reject("F｜禁止空心(洞)", "出现空心圈地（洞）");
      } else {
        if (nextHoles.size > curHoles.size) {
          return reject("F｜禁止空心(洞)", `空心区域变大（${curHoles.size} -> ${nextHoles.size}）`);
        }
      }
    }

    if (rules.limitOuterFill) {
      const L0 = bounds0?.L || 1;
      const curFill = area0 / (L0 * L0);

      const b1 = updateBoundsWithCell(bounds0, cell.x, cell.z);
      const L1 = b1.L || 1;
      const nextFill = (area0 + 1) / (L1 * L1);

      if (curFill >= rules.minOuterFill) {
        if (nextFill < rules.minOuterFill) {
          return reject("G｜外接方填充率(A/L²)", `外接正方形填充率过低（${nextFill.toFixed(3)} < ${rules.minOuterFill}）`);
        }
      } else {
        if (nextFill < curFill) {
          return reject(
            "G｜外接方填充率(A/L²)",
            `外接正方形填充率变差（${curFill.toFixed(3)} -> ${nextFill.toFixed(3)}，阈值=${rules.minOuterFill}）`,
          );
        }
      }
    }

    if (rules.limitInnerShare) {
      const nextSet = new Set(state.claimed);
      nextSet.add(key(cell.x, cell.z));
      const b1 = updateBoundsWithCell(bounds0, cell.x, cell.z);
      const Lin = maxFilledSquareSide(nextSet, b1);
      const share = (Lin * Lin) / (area0 + 1);
      if (share < rules.minInnerShare) {
        return reject("H｜内接实心方占比(Lin²/A)", `最大内接实心方占比过低（${share.toFixed(3)} < ${rules.minInnerShare}）`);
      }
    }

    return ok();
  };
})();

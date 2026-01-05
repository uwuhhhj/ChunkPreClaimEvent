(() => {
  const app = (window.ChunkPreClaimEvent = window.ChunkPreClaimEvent || {});
  app.render = app.render || {};

  const { key, neighbors4, parseKey } = app.utils;
  const {
    approxDiameter4,
    computeBounds,
    countEndpoints4,
    maxFilledSquareSide,
    perimeterEdges,
  } = app.metrics;

  app.render.computeAvailableSet = (claimedSet) => {
    const avail = new Set();
    if (claimedSet.size === 0) return avail;

    for (const k0 of claimedSet) {
      const { x, z } = parseKey(k0);
      for (const n of neighbors4(x, z)) {
        const nk = key(n.x, n.z);
        if (!claimedSet.has(nk)) avail.add(nk);
      }
    }
    return avail;
  };

  app.render.render = (state, els, safeCanClaim) => {
    const rules = state.rules || {};
    const area = state.claimed.size;
    const perim = perimeterEdges(state.claimed);
    const diam = approxDiameter4(state.claimed);
    const endpoints = countEndpoints4(state.claimed);
    const bounds = computeBounds(state.claimed);
    const L = bounds?.L || 0;
    const outerFill = area && L ? area / (L * L) : 0;
    const Lin = bounds ? maxFilledSquareSide(state.claimed, bounds) : 0;
    const innerShare = area ? (Lin * Lin) / area : 0;
    const pa = area ? perim / area : 0;

    state.metrics.area = area;
    state.metrics.perim = perim;
    state.metrics.diam = diam;
    state.metrics.endpoints = endpoints;
    state.metrics.bounds = bounds;
    state.metrics.outerFill = outerFill;
    state.metrics.maxFilledSquare = Lin;
    state.metrics.innerShare = innerShare;

    if (els.stArea) els.stArea.textContent = String(area);
    if (els.stPerim) els.stPerim.textContent = String(perim);

    const paText = area ? pa.toFixed(3) : "-";
    const outerFillText = area ? `${outerFill.toFixed(3)} (L=${L || 0})` : "-";
    const innerShareText = area ? `${innerShare.toFixed(3)} (Lin=${Lin || 0})` : "-";
    const endsText = area ? String(endpoints) : "-";
    const diamText = area ? String(diam) : "-";

    if (els.metricPA) els.metricPA.textContent = paText;
    if (els.metricOuterFill) els.metricOuterFill.textContent = outerFillText;
    if (els.metricInnerShare) els.metricInnerShare.textContent = innerShareText;
    if (els.metricEnds) els.metricEnds.textContent = endsText;
    if (els.metricDiam) els.metricDiam.textContent = diamText;

    const setCalc = (el, lines, dim = false) => {
      if (!el) return;
      el.textContent = lines.filter(Boolean).join("\n");
      el.classList.toggle("dim", !!dim);
    };

    if (els.calcArm) {
      setCalc(
        els.calcArm,
        [
          "规则：armLen ≤ L（仅在“单邻接扩张”时判断）",
          `当前：L=${rules.maxArmLen ?? "-"}` + (rules.limitArm ? "" : "（未开启）"),
          "armLen：从新端点沿细臂回溯，直到遇到分叉/转折/闭环的步数",
        ],
        !rules.limitArm,
      );
    }

    if (els.calcPA) {
      if (!area) {
        setCalc(els.calcPA, ["当前 A=0，无法计算 P/A。"], true);
      } else {
        const maxPA = Number(rules.maxPA);
        const bad = rules.limitPA && Number.isFinite(maxPA) && pa > maxPA;
        setCalc(
          els.calcPA,
          [
            `计算：P/A = P ÷ A = ${perim} ÷ ${area} = ${pa.toFixed(3)}`,
            rules.limitPA
              ? `判定：${pa.toFixed(3)} ${bad ? ">" : "≤"} ${maxPA} → ${bad ? "超标（拒绝）" : "通过"}`
              : `未开启：仅展示数值（上限=${maxPA}）`,
          ],
          !rules.limitPA,
        );
      }
    }

    if (els.calcDiam) {
      if (!area) {
        setCalc(els.calcDiam, ["当前 A=0，无法计算直径 D。"], true);
      } else {
        const maxD = Number(rules.maxDiam);
        const bad = rules.limitDiam && Number.isFinite(maxD) && diam > maxD;
        setCalc(
          els.calcDiam,
          [
            `计算：D（4 邻接步数近似）= ${diam}`,
            rules.limitDiam
              ? `判定：${diam} ${bad ? ">" : "≤"} ${maxD} → ${bad ? "超标（拒绝）" : "通过"}`
              : `未开启：仅展示数值（上限=${maxD}）`,
          ],
          !rules.limitDiam,
        );
      }
    }

    if (els.calcEnds) {
      if (!area) {
        setCalc(els.calcEnds, ["当前 A=0，无法计算端点数。"], true);
      } else {
        const maxE = Number(rules.maxEndpoints);
        const bad = rules.limitEndpoints && Number.isFinite(maxE) && endpoints > maxE;
        setCalc(
          els.calcEnds,
          [
            `计算：端点数 = 度为 1 的格子数量 = ${endpoints}`,
            rules.limitEndpoints
              ? `判定：${endpoints} ${bad ? ">" : "≤"} ${maxE} → ${bad ? "超标（拒绝）" : "通过"}`
              : `未开启：仅展示数值（上限=${maxE}）`,
          ],
          !rules.limitEndpoints,
        );
      }
    }

    if (els.calcOuterFill) {
      if (!area || !L) {
        setCalc(els.calcOuterFill, ["当前面积不足，无法计算 A/L²。"], true);
      } else {
        const minFill = Number(rules.minOuterFill);
        const bad = rules.limitOuterFill && Number.isFinite(minFill) && outerFill < minFill;
        setCalc(
          els.calcOuterFill,
          [
            `计算：A/L² = A ÷ (L×L) = ${area} ÷ (${L}×${L}) = ${outerFill.toFixed(3)}`,
            rules.limitOuterFill
              ? `判定：${outerFill.toFixed(3)} ${bad ? "<" : "≥"} ${minFill} → ${bad ? "不足（拒绝）" : "通过"}`
              : `未开启：仅展示数值（下限=${minFill}）`,
          ],
          !rules.limitOuterFill,
        );
      }
    }

    if (els.calcInnerShare) {
      if (!area) {
        setCalc(els.calcInnerShare, ["当前 A=0，无法计算 Lin²/A。"], true);
      } else {
        const minShare = Number(rules.minInnerShare);
        const bad = rules.limitInnerShare && Number.isFinite(minShare) && innerShare < minShare;
        setCalc(
          els.calcInnerShare,
          [
            `计算：Lin²/A = (Lin×Lin) ÷ A = (${Lin}×${Lin}) ÷ ${area} = ${innerShare.toFixed(3)}`,
            rules.limitInnerShare
              ? `判定：${innerShare.toFixed(3)} ${bad ? "<" : "≥"} ${minShare} → ${bad ? "不足（拒绝）" : "通过"}`
              : `未开启：仅展示数值（下限=${minShare}）`,
          ],
          !rules.limitInnerShare,
        );
      }
    }

    const placeRangeMark = (rangeEl, markEl, rawValue, bad) => {
      if (!rangeEl || !markEl) return;
      const min = Number(rangeEl.min);
      const max = Number(rangeEl.max);
      const value = Number(rawValue);
      if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(value) || max <= min) return;

      const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
      markEl.style.left = `${pct}%`;
      markEl.classList.toggle("bad", !!bad);
    };

    placeRangeMark(document.getElementById("paMaxRange"), els.metricPAMark, pa, area && pa > (rules?.maxPA ?? 0));
    placeRangeMark(
      document.getElementById("outerFillMinRange"),
      els.metricOuterFillMark,
      outerFill,
      area && outerFill < (rules?.minOuterFill ?? 0),
    );
    placeRangeMark(
      document.getElementById("innerShareMinRange"),
      els.metricInnerShareMark,
      innerShare,
      area && innerShare < (rules?.minInnerShare ?? 0),
    );
    placeRangeMark(
      document.getElementById("diamMaxRange"),
      els.metricDiamMark,
      diam,
      area && rules?.limitDiam && diam > (rules?.maxDiam ?? 0),
    );
    placeRangeMark(
      document.getElementById("endsMaxRange"),
      els.metricEndsMark,
      endpoints,
      area && rules?.limitEndpoints && endpoints > (rules?.maxEndpoints ?? 0),
    );

    const SIZE_STEPS = [10, 20, 30, 40];
    const clampToStep = (needed, maxN) => {
      const cap = Math.max(10, Number(maxN) || 40);
      for (const s of SIZE_STEPS) {
        if (s > cap) break;
        if (needed <= s) return s;
      }
      return cap;
    };

    const pad = 2;
    let needed = 10;
    if (bounds) {
      const spanX = bounds.maxX - bounds.minX + 1;
      const spanZ = bounds.maxZ - bounds.minZ + 1;
      needed = Math.max(10, spanX + pad * 2, spanZ + pad * 2);
    }
    const N = clampToStep(needed, 40);
    state.viewSize = N;

    let xMin = -Math.floor(N / 2);
    let zMax = Math.floor(N / 2);
    if (bounds) {
      // Anchor the viewport to the territory's top-left (minX, maxZ) instead of auto-centering,
      // so the view doesn't "drift" toward the center as the territory grows.
      xMin = bounds.minX - pad;
      zMax = bounds.maxZ + pad;
    }

    els.grid.style.gridTemplateColumns = `repeat(${N}, var(--cell))`;

    const available = app.render.computeAvailableSet(state.claimed);
    state.available = available;

    state.blocked.clear();

    const xMax = xMin + N - 1;
    const zMin = zMax - N + 1;

    for (let x = xMin; x <= xMax; x++) {
      for (let z = zMin; z <= zMax; z++) {
        const k0 = key(x, z);
        if (state.claimed.has(k0) || !available.has(k0)) continue;
        const ok = safeCanClaim({ x, z });
        if (!ok) state.blocked.add(k0);
      }
    }
    const frag = document.createDocumentFragment();
    for (let z = zMax; z >= zMin; z--) {
      for (let x = xMin; x <= xMax; x++) {
        const k0 = key(x, z);
        const div = document.createElement("div");
        div.className = "cell";
        div.dataset.x = String(x);
        div.dataset.z = String(z);

        if (state.claimed.has(k0)) div.classList.add("claimed");
        else if (state.blocked.has(k0)) div.classList.add("blocked");
        else if (available.has(k0)) div.classList.add("available");
        frag.appendChild(div);
      }
    }
    els.grid.replaceChildren(frag);
  };
})();

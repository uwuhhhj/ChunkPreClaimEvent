import { key, neighbors4, parseKey } from "./utils.js";
import {
  approxDiameter4,
  computeBounds,
  countEndpoints4,
  maxFilledSquareSide,
  perimeterEdges,
} from "./metrics.js";

export function computeAvailableSet(claimedSet) {
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
}

export function render(state, els, safeCanClaim) {
  const area = state.claimed.size;
  const perim = perimeterEdges(state.claimed);
  const diam = approxDiameter4(state.claimed);
  const endpoints = countEndpoints4(state.claimed);
  const bounds = computeBounds(state.claimed);
  const L = bounds?.L || 0;
  const outerFill = area && L ? area / (L * L) : 0;
  const Lin = bounds ? maxFilledSquareSide(state.claimed, bounds) : 0;
  const innerShare = area ? (Lin * Lin) / area : 0;

  state.metrics.area = area;
  state.metrics.perim = perim;
  state.metrics.endpoints = endpoints;
  state.metrics.bounds = bounds;
  state.metrics.outerFill = outerFill;
  state.metrics.maxFilledSquare = Lin;
  state.metrics.innerShare = innerShare;

  els.stArea.textContent = String(area);
  els.stPerim.textContent = String(perim);
  els.stPA.textContent = area ? (perim / area).toFixed(3) : "-";
  els.stDiam.textContent = String(diam);
  els.stOuterFill.textContent = area ? `${outerFill.toFixed(3)} (L=${L || 0})` : "-";
  els.stInnerShare.textContent = area ? `${innerShare.toFixed(3)} (Lin=${Lin || 0})` : "-";

  const N = state.viewSize;
  const half = Math.floor(N / 2);

  els.grid.style.gridTemplateColumns = `repeat(${N}, var(--cell))`;

  const available = computeAvailableSet(state.claimed);

  state.blocked.clear();
  const shouldCheck = (x, z) => {
    const k0 = key(x, z);
    if (state.claimed.has(k0)) return false;
    if (state.options.autoAvailOnly) return available.has(k0);
    return true;
  };

  for (let x = -half; x <= half; x++) {
    for (let z = -half; z <= half; z++) {
      if (!shouldCheck(x, z)) continue;
      const ok = safeCanClaim({ x, z });
      if (!ok) state.blocked.add(key(x, z));
    }
  }

  const frag = document.createDocumentFragment();
  for (let z = half; z >= -half; z--) {
    for (let x = -half; x <= half; x++) {
      const k0 = key(x, z);
      const div = document.createElement("div");
      div.className = "cell";
      div.dataset.x = String(x);
      div.dataset.z = String(z);

      if (state.claimed.has(k0)) div.classList.add("claimed");
      else if (state.blocked.has(k0)) div.classList.add("blocked");
      else if (available.has(k0) || !state.options.autoAvailOnly) div.classList.add("available");

      if (state.options.showCoord) {
        div.textContent = `${x},${z}`;
      }
      frag.appendChild(div);
    }
  }
  els.grid.replaceChildren(frag);
}


(() => {
  const app = (window.ChunkPreClaimEvent = window.ChunkPreClaimEvent || {});
  const { key } = app.utils;

  const state = app.state.createInitialState();

  const els = {
    grid: document.getElementById("grid"),
    gridScroll: document.getElementById("gridScroll"),
    splitter: document.getElementById("splitter"),
    stArea: document.getElementById("stArea"),
    stPerim: document.getElementById("stPerim"),
    metricPA: document.getElementById("metricPA"),
    metricPAMark: document.getElementById("metricPAMark"),
    metricOuterFill: document.getElementById("metricOuterFill"),
    metricOuterFillMark: document.getElementById("metricOuterFillMark"),
    metricInnerShare: document.getElementById("metricInnerShare"),
    metricInnerShareMark: document.getElementById("metricInnerShareMark"),
    metricEnds: document.getElementById("metricEnds"),
    metricEndsMark: document.getElementById("metricEndsMark"),
    metricDiam: document.getElementById("metricDiam"),
    metricDiamMark: document.getElementById("metricDiamMark"),
    calcArm: document.getElementById("calcArm"),
    calcPA: document.getElementById("calcPA"),
    calcDiam: document.getElementById("calcDiam"),
    calcEnds: document.getElementById("calcEnds"),
    calcOuterFill: document.getElementById("calcOuterFill"),
    calcInnerShare: document.getElementById("calcInnerShare"),
    calcSupport: document.getElementById("calcSupport"),
    hoverCoord: document.getElementById("hoverCoord"),
    hoverStatus: document.getElementById("hoverStatus"),
    hoverReason: document.getElementById("hoverReason"),
    msg: document.getElementById("msg"),
    copyMsgBtn: document.getElementById("copyMsgBtn"),
    clearMsgBtn: document.getElementById("clearMsgBtn"),
  };

  const setMsg = (s) => {
    els.msg.textContent = s;
  };

  const canClaimFn = app.rules.defaultCanClaim;

  const SIDEBAR_KEY = "ChunkPreClaimEvent.sidebarW";
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const getSidebarLimits = () => {
    const appEl = document.querySelector(".app");
    if (!appEl) return { min: 240, max: 1200 };

    const cs = getComputedStyle(appEl);
    const gap = Number.parseFloat(cs.columnGap || cs.gap) || 12;
    const splitW = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--splitW")) || 10;
    const minLeft = 360;

    const appW = appEl.clientWidth;
    const max = Math.max(240, appW - minLeft - splitW - gap * 2 - 1);
    return { min: 240, max };
  };

  const applySidebarWidth = (px) => {
    const { min, max } = getSidebarLimits();
    const v = clamp(Math.round(px), min, max);
    document.documentElement.style.setProperty("--sidebarW", `${v}px`);
    try {
      localStorage.setItem(SIDEBAR_KEY, String(v));
    } catch {}
    updateCellSize();
  };

  try {
    const raw = localStorage.getItem(SIDEBAR_KEY);
    const v = Number(raw);
    if (Number.isFinite(v)) {
      const { min, max } = getSidebarLimits();
      document.documentElement.style.setProperty("--sidebarW", `${clamp(v, min, max)}px`);
    }
  } catch {}

  const normalizeCanClaimResult = (raw) => {
    if (raw === true) return { ok: true };
    if (raw === false) return { ok: false };
    if (typeof raw === "string") return { ok: false, reason: raw };

    if (raw && typeof raw === "object") {
      if (typeof raw.ok === "boolean") {
        return {
          ok: raw.ok,
          reason: typeof raw.reason === "string" ? raw.reason : undefined,
          module: typeof raw.module === "string" ? raw.module : undefined,
        };
      }
      if (typeof raw.allowed === "boolean") {
        return {
          ok: raw.allowed,
          reason: typeof raw.reason === "string" ? raw.reason : undefined,
          module: typeof raw.module === "string" ? raw.module : undefined,
        };
      }
    }

    return { ok: !!raw };
  };

  let lastLogicRuntimeError = null;
  const evalCanClaim = (cell) => {
    try {
      const res = normalizeCanClaimResult(canClaimFn(state, cell));
      lastLogicRuntimeError = null;
      return res;
    } catch (err) {
      const msg = `逻辑运行错误：${err?.message || String(err)}`;
      if (msg !== lastLogicRuntimeError) setMsg(msg);
      lastLogicRuntimeError = msg;
      return { ok: false, module: "RuntimeError", reason: msg };
    }
  };

  const updateCellSize = () => {
    if (!els.gridScroll) return;
    const N = state.viewSize || 10;
    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const gapRaw = rootStyle.getPropertyValue("--gap").trim();
    const gap = Number.parseFloat(gapRaw) || 2;

    const gridStyle = getComputedStyle(els.gridScroll);
    const padX = (Number.parseFloat(gridStyle.paddingLeft) || 0) + (Number.parseFloat(gridStyle.paddingRight) || 0);
    const padY = (Number.parseFloat(gridStyle.paddingTop) || 0) + (Number.parseFloat(gridStyle.paddingBottom) || 0);
    const innerW = Math.max(0, els.gridScroll.clientWidth - padX);
    const innerH = Math.max(0, els.gridScroll.clientHeight - padY);
    const side = Math.max(0, Math.min(innerW, innerH));

    const cell = Math.floor((side - (N - 1) * gap) / N);
    const clamped = Math.max(10, Math.min(26, Number.isFinite(cell) ? cell : 18));
    root.style.setProperty("--cell", `${clamped}px`);
  };

  if (els.splitter) {
    let dragging = false;
    let startX = 0;
    let startW = 420;

    const readSidebarWidth = () => {
      const root = document.documentElement;
      const raw = getComputedStyle(root).getPropertyValue("--sidebarW").trim();
      const v = Number.parseFloat(raw);
      return Number.isFinite(v) ? v : 420;
    };

    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      applySidebarWidth(startW - dx);
    };
    const stop = () => {
      dragging = false;
      document.body.style.cursor = "";
    };

    els.splitter.addEventListener("pointerdown", (e) => {
      dragging = true;
      startX = e.clientX;
      startW = readSidebarWidth();
      document.body.style.cursor = "col-resize";
      els.splitter.setPointerCapture(e.pointerId);
    });
    els.splitter.addEventListener("pointermove", onMove);
    els.splitter.addEventListener("pointerup", stop);
    els.splitter.addEventListener("pointercancel", stop);
    // Some browsers can miss pointermove with capture; add a global fallback while dragging.
    window.addEventListener("pointermove", (e) => dragging && onMove(e));
    window.addEventListener("pointerup", stop);
    els.splitter.addEventListener("dblclick", () => applySidebarWidth(420));

    els.splitter.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") applySidebarWidth(readSidebarWidth() + 20);
      if (e.key === "ArrowRight") applySidebarWidth(readSidebarWidth() - 20);
      if (e.key === "Home") applySidebarWidth(520);
      if (e.key === "End") applySidebarWidth(320);
    });
  }

  const rerender = () => {
    app.render.render(state, els, evalCanClaim);
    updateCellSize();
    updateSupportCalc(state?.ui?.probeCell || null);
  };

  const formatDetails = (res) => {
    const details = res?.module
      ? `${res.module}${res.reason ? `：${res.reason}` : ""}`
      : res?.reason || "未提供拒绝理由";
    return details;
  };

  if (els.copyMsgBtn) {
    els.copyMsgBtn.addEventListener("click", async () => {
      const text = els.msg?.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        els.copyMsgBtn.textContent = "已复制";
        setTimeout(() => {
          els.copyMsgBtn.textContent = "复制消息";
        }, 900);
      } catch {
        setMsg("复制失败：浏览器未授予剪贴板权限。");
      }
    });
  }
  if (els.clearMsgBtn) {
    els.clearMsgBtn.addEventListener("click", () => {
      setMsg("");
    });
  }

  const stepDecimals = (step) => {
    const s = String(step);
    const idx = s.indexOf(".");
    if (idx < 0) return 0;
    return Math.min(6, s.length - idx - 1);
  };

  const clampNum = (v, min, max) => {
    if (Number.isFinite(min)) v = Math.max(min, v);
    if (Number.isFinite(max)) v = Math.min(max, v);
    return v;
  };

  const setInputNumberValue = (inputEl, v) => {
    if (!inputEl) return;
    const step = Number(inputEl.step);
    const min = Number(inputEl.min);
    const max = Number(inputEl.max);
    const step0 = Number.isFinite(step) && step > 0 ? step : 1;
    const dec = stepDecimals(step0);
    const next = clampNum(v, Number.isFinite(min) ? min : -Infinity, Number.isFinite(max) ? max : Infinity);
    inputEl.value = dec ? next.toFixed(dec) : String(Math.round(next));
  };

  const attachWheelAdjust = (inputEl) => {
    if (!inputEl) return;
    if (!inputEl.hasAttribute("data-wheel")) return;
    inputEl.addEventListener(
      "wheel",
      (e) => {
        if (!(e instanceof WheelEvent)) return;
        e.preventDefault();
        const stepAttr = Number(inputEl.step);
        const step0 = Number.isFinite(stepAttr) && stepAttr > 0 ? stepAttr : 1;
        const dir = e.deltaY < 0 ? 1 : -1;
        let mult = 1;
        if (e.shiftKey) mult *= 10;
        if (e.ctrlKey || e.metaKey) mult *= 0.1;
        const delta = dir * step0 * mult;

        if (inputEl instanceof HTMLSelectElement) {
          const nextIdx = clampNum(inputEl.selectedIndex + (dir > 0 ? 1 : -1), 0, inputEl.options.length - 1);
          inputEl.selectedIndex = nextIdx;
          inputEl.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        }

        const cur = Number(inputEl.value);
        const base = Number.isFinite(cur) ? cur : 0;
        const next = base + delta;
        setInputNumberValue(inputEl, next);
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      },
      { passive: false },
    );
  };

  const linkRangeAndNumber = (rangeEl, numberEl, onValue) => {
    if (rangeEl) {
      rangeEl.addEventListener("input", () => {
        if (numberEl) numberEl.value = rangeEl.value;
        onValue(rangeEl.value);
      });
      attachWheelAdjust(rangeEl);
    }
    if (numberEl) {
      numberEl.addEventListener("input", () => {
        if (rangeEl) rangeEl.value = numberEl.value;
        onValue(numberEl.value);
      });
      attachWheelAdjust(numberEl);
    }
  };

  const resetToInitial = () => {
    state.claimed.clear();
    state.blocked.clear();
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        state.claimed.add(key(x, z));
      }
    }
    rerender();
    setMsg("已恢复初始 3×3。");
  };

  const clearAll = () => {
    state.claimed.clear();
    state.blocked.clear();
    rerender();
    setMsg("已清空。");
  };

  els.grid.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!t.classList.contains("cell")) return;

    const x = Number(t.dataset.x);
    const z = Number(t.dataset.z);
    const k0 = key(x, z);

    if (state.claimed.has(k0)) {
      const unclaimRes = app.rules.defaultCanUnclaim(state, { x, z });
      if (!unclaimRes.ok) {
        const details = formatDetails(unclaimRes);
        setMsg(`逻辑拒绝：不能撤销 (${x},${z})\n原因：${details}`);
        rerender();
        return;
      }
      state.claimed.delete(k0);
      setMsg(`已撤销圈地：(${x},${z})`);
      rerender();
      return;
    }

    const claimRes = evalCanClaim({ x, z });
    if (!claimRes.ok) {
      if (claimRes.module === "RuntimeError") {
        rerender();
        return;
      }

      const details = formatDetails(claimRes);
      setMsg(`逻辑拒绝：不能圈 (${x},${z})\n原因：${details}`);
      rerender();
      return;
    }

    state.claimed.add(k0);
    setMsg(`已圈地：(${x},${z})`);
    rerender();
  });

  document.getElementById("resetBtn").addEventListener("click", resetToInitial);
  document.getElementById("clearBtn").addEventListener("click", clearAll);

  const num = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  document.getElementById("ruleTwoAdj").addEventListener("change", (e) => {
    state.rules.requireTwoAdj = e.target.checked;
    rerender();
  });
  document.getElementById("ruleArm").addEventListener("change", (e) => {
    state.rules.limitArm = e.target.checked;
    rerender();
  });
  linkRangeAndNumber(
    document.getElementById("armLenRange"),
    document.getElementById("armLen"),
    (v) => {
      state.rules.maxArmLen = Math.max(1, Math.floor(num(v, state.rules.maxArmLen)));
      rerender();
    },
  );
  document.getElementById("ruleSupport").addEventListener("change", (e) => {
    state.rules.limitSupport = e.target.checked;
    rerender();
  });
  linkRangeAndNumber(
    document.getElementById("supportMRange"),
    document.getElementById("supportM"),
    (v) => {
      state.rules.supportM = Math.min(8, Math.max(0, Math.floor(num(v, state.rules.supportM))));
      rerender();
    },
  );
  linkRangeAndNumber(
    document.getElementById("supportNRange"),
    document.getElementById("supportN"),
    (v) => {
      state.rules.supportN = Math.min(24, Math.max(0, Math.floor(num(v, state.rules.supportN))));
      rerender();
    },
  );
  document.getElementById("rulePA").addEventListener("change", (e) => {
    state.rules.limitPA = e.target.checked;
    rerender();
  });
  linkRangeAndNumber(
    document.getElementById("paMaxRange"),
    document.getElementById("paMax"),
    (v) => {
      state.rules.maxPA = Math.max(0.1, num(v, state.rules.maxPA));
      rerender();
    },
  );
  document.getElementById("ruleDiam").addEventListener("change", (e) => {
    state.rules.limitDiam = e.target.checked;
    rerender();
  });
  linkRangeAndNumber(
    document.getElementById("diamMaxRange"),
    document.getElementById("diamMax"),
    (v) => {
      state.rules.maxDiam = Math.max(0, Math.floor(num(v, state.rules.maxDiam)));
      rerender();
    },
  );
  document.getElementById("ruleEnds").addEventListener("change", (e) => {
    state.rules.limitEndpoints = e.target.checked;
    rerender();
  });
  linkRangeAndNumber(
    document.getElementById("endsMaxRange"),
    document.getElementById("endsMax"),
    (v) => {
      state.rules.maxEndpoints = Math.max(1, Math.floor(num(v, state.rules.maxEndpoints)));
      rerender();
    },
  );
  document.getElementById("ruleHoles").addEventListener("change", (e) => {
    state.rules.forbidHoles = e.target.checked;
    rerender();
  });
  document.getElementById("ruleOuterFill").addEventListener("change", (e) => {
    state.rules.limitOuterFill = e.target.checked;
    rerender();
  });
  linkRangeAndNumber(
    document.getElementById("outerFillMinRange"),
    document.getElementById("outerFillMin"),
    (v) => {
      state.rules.minOuterFill = Math.min(1, Math.max(0, num(v, state.rules.minOuterFill)));
      rerender();
    },
  );
  document.getElementById("ruleInnerShare").addEventListener("change", (e) => {
    state.rules.limitInnerShare = e.target.checked;
    rerender();
  });
  linkRangeAndNumber(
    document.getElementById("innerShareMinRange"),
    document.getElementById("innerShareMin"),
    (v) => {
      state.rules.minInnerShare = Math.min(1, Math.max(0, num(v, state.rules.minInnerShare)));
      rerender();
    },
  );

  const setHoverText = (coord, status, reason) => {
    if (els.hoverCoord) els.hoverCoord.textContent = coord;
    if (els.hoverStatus) els.hoverStatus.textContent = status;
    if (els.hoverReason) els.hoverReason.textContent = reason;
  };

  let hoverRAF = 0;
  let lastHoverKey = null;
  const scheduleHoverUpdate = (x, z) => {
    const k0 = `${x},${z}`;
    if (k0 === lastHoverKey) return;
    lastHoverKey = k0;
    if (hoverRAF) cancelAnimationFrame(hoverRAF);
    hoverRAF = requestAnimationFrame(() => {
      hoverRAF = 0;
      state.ui = state.ui || {};
      state.ui.probeCell = { x, z };
      const coord = `(${x},${z})`;
      const k1 = key(x, z);
      if (state.claimed.has(k1)) {
        updateSupportCalc({ x, z });
        const unclaimRes = app.rules.defaultCanUnclaim(state, { x, z });
        if (unclaimRes.ok) {
          setHoverText(coord, "已圈地（点击撤销）", "-");
        } else {
          setHoverText(coord, "已圈地（撤销会被拒绝）", formatDetails(unclaimRes));
        }
        return;
      }

      const claimRes = evalCanClaim({ x, z });
      if (claimRes.ok) {
        updateSupportCalc({ x, z });
        setHoverText(coord, "可圈地（点击扩张）", "-");
        return;
      }

      if (state.available && state.available.has(k1)) {
        updateSupportCalc({ x, z });
        setHoverText(coord, "被拒绝（红色）", formatDetails(claimRes));
        return;
      }

      updateSupportCalc({ x, z });
      setHoverText(coord, "不可圈地", formatDetails(claimRes));
    });
  };

  els.grid.addEventListener("pointermove", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!t.classList.contains("cell")) return;
    const x = Number(t.dataset.x);
    const z = Number(t.dataset.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    scheduleHoverUpdate(x, z);
  });
  els.grid.addEventListener("pointerleave", () => {
    lastHoverKey = null;
    setHoverText("-", "-", "-");
    updateSupportCalc(null);
  });

  window.addEventListener("resize", () => {
    updateCellSize();
  });

  resetToInitial();

  function updateSupportCalc(cell) {
    if (!els.calcSupport) return;

    const rules = state.rules || {};
    const enabled = !!rules.limitSupport;

    const countAround = (cx, cz, radius) => {
      let claimed = 0;
      let available = 0;

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dz === 0) continue;
          const x = cx + dx;
          const z = cz + dz;
          const k0 = key(x, z);
          if (state.claimed.has(k0)) {
            claimed++;
            continue;
          }
          const nAdj = app.metrics.countClaimedNeighbors4(state.claimed, x, z);
          if (nAdj > 0) available++;
        }
      }

      return { claimed, available, total: claimed + available };
    };

    const lines = [];
    if (!cell) {
      lines.push("提示：悬停一个“可圈地（蓝色）”格子查看计算明细。");
      els.calcSupport.textContent = lines.join("\n");
      els.calcSupport.classList.toggle("dim", !enabled);
      return;
    }

    const { x, z } = cell;
    lines.push(`中心：(${x},${z})（以悬停/点击的目标格为准）`);

    const r1 = countAround(x, z, 1);
    const r12 = countAround(x, z, 2);
    const m = Number(rules.supportM);
    const n = Number(rules.supportN);
    const pass1 = Number.isFinite(m) ? r1.claimed > m : false;
    const pass12 = Number.isFinite(n) ? r12.claimed > n : false;
    const pass = pass1 && pass12;

    lines.push(`1圈(8格)：已圈地=${r1.claimed}｜可圈地=${r1.available}｜需 已圈地 > m（m=${rules.supportM ?? "-"}）`);
    lines.push(
      `1+2圈(24格)：已圈地=${r12.claimed}｜可圈地=${r12.available}｜需 已圈地 > n（n=${rules.supportN ?? "-"}）`,
    );
    lines.push(enabled ? `结论：${pass ? "通过（允许）" : "不通过（拒绝）"}（需同时满足）` : "未开启：仅展示统计（不参与判定）");

    els.calcSupport.textContent = lines.join("\n");
    els.calcSupport.classList.toggle("dim", !enabled);
  }
})();

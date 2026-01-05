(() => {
  const app = (window.ChunkPreClaimEvent = window.ChunkPreClaimEvent || {});
  const { key } = app.utils;

  const state = app.state.createInitialState();

  const els = {
    grid: document.getElementById("grid"),
    stArea: document.getElementById("stArea"),
    stPerim: document.getElementById("stPerim"),
    stPA: document.getElementById("stPA"),
    stDiam: document.getElementById("stDiam"),
    stOuterFill: document.getElementById("stOuterFill"),
    stInnerShare: document.getElementById("stInnerShare"),
    msg: document.getElementById("msg"),
    code: document.getElementById("code"),
  };

  const setMsg = (s) => {
    els.msg.textContent = s;
  };

  let canClaimFn = app.rules.defaultCanClaim;

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

  const safeCanClaim = (cell) => evalCanClaim(cell).ok;

  const resetToInitial = () => {
    state.claimed.clear();
    state.blocked.clear();
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        state.claimed.add(key(x, z));
      }
    }
    app.render.render(state, els, safeCanClaim);
    setMsg("已恢复初始 3×3。");
  };

  const clearAll = () => {
    state.claimed.clear();
    state.blocked.clear();
    app.render.render(state, els, safeCanClaim);
    setMsg("已清空。");
  };

  const applyLogicFromEditor = () => {
    const userCode = els.code.value;
    try {
      canClaimFn = app.editor.compileCanClaimFromEditor(userCode);
      setMsg("已应用逻辑。");
      app.render.render(state, els, safeCanClaim);
    } catch (err) {
      setMsg(`逻辑编译失败：${err?.message || String(err)}`);
    }
  };

  const resetLogic = () => {
    canClaimFn = app.rules.defaultCanClaim;
    els.code.value = app.editor.DEFAULT_CODE;
    app.render.render(state, els, safeCanClaim);
    setMsg("已重置为默认逻辑。");
  };

  els.code.value = app.editor.DEFAULT_CODE;

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
        const details = unclaimRes.module
          ? `${unclaimRes.module}${unclaimRes.reason ? `：${unclaimRes.reason}` : ""}`
          : unclaimRes.reason || "未提供拒绝理由";
        setMsg(`逻辑拒绝：不能撤销 (${x},${z})\n原因：${details}`);
        app.render.render(state, els, safeCanClaim);
        return;
      }
      state.claimed.delete(k0);
      setMsg(`已撤销圈地：(${x},${z})`);
      app.render.render(state, els, safeCanClaim);
      return;
    }

    if (state.options.autoAvailOnly) {
      const available = app.render.computeAvailableSet(state.claimed);
      if (!available.has(k0)) {
        setMsg(`(${x},${z}) 不是邻接可圈地格子（请从蓝色格子扩张）。`);
        return;
      }
    }

    const claimRes = evalCanClaim({ x, z });
    if (!claimRes.ok) {
      if (claimRes.module === "RuntimeError") {
        app.render.render(state, els, safeCanClaim);
        return;
      }

      const details = claimRes.module
        ? `${claimRes.module}${claimRes.reason ? `：${claimRes.reason}` : ""}`
        : claimRes.reason || "未提供拒绝理由";
      setMsg(`逻辑拒绝：不能圈 (${x},${z})\n原因：${details}`);
      app.render.render(state, els, safeCanClaim);
      return;
    }

    state.claimed.add(k0);
    setMsg(`已圈地：(${x},${z})`);
    app.render.render(state, els, safeCanClaim);
  });

  document.getElementById("resetBtn").addEventListener("click", resetToInitial);
  document.getElementById("clearBtn").addEventListener("click", clearAll);
  document.getElementById("applyBtn").addEventListener("click", applyLogicFromEditor);
  document.getElementById("resetLogicBtn").addEventListener("click", resetLogic);

  document.getElementById("showCoord").addEventListener("change", (e) => {
    state.options.showCoord = e.target.checked;
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("autoAvail").addEventListener("change", (e) => {
    state.options.autoAvailOnly = e.target.checked;
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("sizeSel").addEventListener("change", (e) => {
    state.viewSize = Number(e.target.value);
    app.render.render(state, els, safeCanClaim);
  });

  const num = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  document.getElementById("ruleTwoAdj").addEventListener("change", (e) => {
    state.rules.requireTwoAdj = e.target.checked;
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("ruleArm").addEventListener("change", (e) => {
    state.rules.limitArm = e.target.checked;
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("armLen").addEventListener("input", (e) => {
    state.rules.maxArmLen = Math.max(1, Math.floor(num(e.target.value, state.rules.maxArmLen)));
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("rulePA").addEventListener("change", (e) => {
    state.rules.limitPA = e.target.checked;
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("paMax").addEventListener("input", (e) => {
    state.rules.maxPA = Math.max(0.1, num(e.target.value, state.rules.maxPA));
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("ruleEnds").addEventListener("change", (e) => {
    state.rules.limitEndpoints = e.target.checked;
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("endsMax").addEventListener("input", (e) => {
    state.rules.maxEndpoints = Math.max(1, Math.floor(num(e.target.value, state.rules.maxEndpoints)));
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("ruleHoles").addEventListener("change", (e) => {
    state.rules.forbidHoles = e.target.checked;
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("ruleOuterFill").addEventListener("change", (e) => {
    state.rules.limitOuterFill = e.target.checked;
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("outerFillMin").addEventListener("input", (e) => {
    state.rules.minOuterFill = Math.min(1, Math.max(0, num(e.target.value, state.rules.minOuterFill)));
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("ruleInnerShare").addEventListener("change", (e) => {
    state.rules.limitInnerShare = e.target.checked;
    app.render.render(state, els, safeCanClaim);
  });
  document.getElementById("innerShareMin").addEventListener("input", (e) => {
    state.rules.minInnerShare = Math.min(1, Math.max(0, num(e.target.value, state.rules.minInnerShare)));
    app.render.render(state, els, safeCanClaim);
  });

  document.getElementById("popBtn").addEventListener("click", () => {
    app.editor.openPopupEditor(els.code, setMsg);
  });

  window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.type !== "PUSH_CODE") return;
    els.code.value = ev.data.code || "";
    setMsg("已从弹窗接收代码（点击“应用逻辑”生效）。");
  });

  resetToInitial();
})();

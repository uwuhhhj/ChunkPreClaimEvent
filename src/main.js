import { DEFAULT_CODE, compileCanClaimFromEditor, openPopupEditor } from "./editor.js";
import { defaultCanClaim } from "./rules.js";
import { createInitialState } from "./state.js";
import { computeAvailableSet, render } from "./render.js";
import { key } from "./utils.js";

const state = createInitialState();

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

function setMsg(s) {
  els.msg.textContent = s;
}

let canClaimFn = defaultCanClaim;

function safeCanClaim(cell) {
  try {
    return !!canClaimFn(state, cell);
  } catch (err) {
    setMsg(`逻辑运行错误：${err?.message || String(err)}`);
    return false;
  }
}

function resetToInitial() {
  state.claimed.clear();
  state.blocked.clear();
  for (let x = -1; x <= 1; x++) {
    for (let z = -1; z <= 1; z++) {
      state.claimed.add(key(x, z));
    }
  }
  render(state, els, safeCanClaim);
  setMsg("已恢复初始 3×3。");
}

function clearAll() {
  state.claimed.clear();
  state.blocked.clear();
  render(state, els, safeCanClaim);
  setMsg("已清空。");
}

function applyLogicFromEditor() {
  const userCode = els.code.value;
  try {
    const fn = compileCanClaimFromEditor(userCode);
    canClaimFn = fn;
    setMsg("已应用逻辑。");
    render(state, els, safeCanClaim);
  } catch (err) {
    setMsg(`逻辑编译失败：${err?.message || String(err)}`);
  }
}

function resetLogic() {
  canClaimFn = defaultCanClaim;
  els.code.value = DEFAULT_CODE;
  render(state, els, safeCanClaim);
  setMsg("已重置为默认逻辑。");
}

els.code.value = DEFAULT_CODE;

// 交互：点击圈地
els.grid.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  if (!t.classList.contains("cell")) return;

  const x = Number(t.dataset.x);
  const z = Number(t.dataset.z);
  const k0 = key(x, z);

  if (state.claimed.has(k0)) {
    setMsg(`(${x},${z}) 已经是已圈地。`);
    return;
  }

  if (state.options.autoAvailOnly) {
    const available = computeAvailableSet(state.claimed);
    if (!available.has(k0)) {
      setMsg(`(${x},${z}) 不是邻接可圈地格子（请从蓝色格子扩张）。`);
      return;
    }
  }

  const ok = safeCanClaim({ x, z });
  if (!ok) {
    setMsg(`逻辑拒绝：不能圈 (${x},${z})`);
    render(state, els, safeCanClaim);
    return;
  }

  state.claimed.add(k0);
  setMsg(`已圈地：(${x},${z})`);
  render(state, els, safeCanClaim);
});

// 按钮
document.getElementById("resetBtn").addEventListener("click", resetToInitial);
document.getElementById("clearBtn").addEventListener("click", clearAll);
document.getElementById("applyBtn").addEventListener("click", applyLogicFromEditor);
document.getElementById("resetLogicBtn").addEventListener("click", resetLogic);

// options
document.getElementById("showCoord").addEventListener("change", (e) => {
  state.options.showCoord = e.target.checked;
  render(state, els, safeCanClaim);
});
document.getElementById("autoAvail").addEventListener("change", (e) => {
  state.options.autoAvailOnly = e.target.checked;
  render(state, els, safeCanClaim);
});
document.getElementById("sizeSel").addEventListener("change", (e) => {
  state.viewSize = Number(e.target.value);
  render(state, els, safeCanClaim);
});

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// rules
document.getElementById("ruleTwoAdj").addEventListener("change", (e) => {
  state.rules.requireTwoAdj = e.target.checked;
  render(state, els, safeCanClaim);
});
document.getElementById("ruleArm").addEventListener("change", (e) => {
  state.rules.limitArm = e.target.checked;
  render(state, els, safeCanClaim);
});
document.getElementById("armLen").addEventListener("input", (e) => {
  state.rules.maxArmLen = Math.max(1, Math.floor(num(e.target.value, state.rules.maxArmLen)));
  render(state, els, safeCanClaim);
});
document.getElementById("rulePA").addEventListener("change", (e) => {
  state.rules.limitPA = e.target.checked;
  render(state, els, safeCanClaim);
});
document.getElementById("paMax").addEventListener("input", (e) => {
  state.rules.maxPA = Math.max(0.1, num(e.target.value, state.rules.maxPA));
  render(state, els, safeCanClaim);
});
document.getElementById("ruleEnds").addEventListener("change", (e) => {
  state.rules.limitEndpoints = e.target.checked;
  render(state, els, safeCanClaim);
});
document.getElementById("endsMax").addEventListener("input", (e) => {
  state.rules.maxEndpoints = Math.max(1, Math.floor(num(e.target.value, state.rules.maxEndpoints)));
  render(state, els, safeCanClaim);
});
document.getElementById("ruleHoles").addEventListener("change", (e) => {
  state.rules.forbidHoles = e.target.checked;
  render(state, els, safeCanClaim);
});
document.getElementById("ruleOuterFill").addEventListener("change", (e) => {
  state.rules.limitOuterFill = e.target.checked;
  render(state, els, safeCanClaim);
});
document.getElementById("outerFillMin").addEventListener("input", (e) => {
  state.rules.minOuterFill = Math.min(1, Math.max(0, num(e.target.value, state.rules.minOuterFill)));
  render(state, els, safeCanClaim);
});
document.getElementById("ruleInnerShare").addEventListener("change", (e) => {
  state.rules.limitInnerShare = e.target.checked;
  render(state, els, safeCanClaim);
});
document.getElementById("innerShareMin").addEventListener("input", (e) => {
  state.rules.minInnerShare = Math.min(1, Math.max(0, num(e.target.value, state.rules.minInnerShare)));
  render(state, els, safeCanClaim);
});

// 弹窗编辑器
let popWin = null;
document.getElementById("popBtn").addEventListener("click", () => {
  const win = openPopupEditor(els.code, setMsg);
  if (win) popWin = win;
});

window.addEventListener("message", (ev) => {
  if (!ev.data || ev.data.type !== "PUSH_CODE") return;
  els.code.value = ev.data.code || "";
  setMsg("已从弹窗接收代码（点击“应用逻辑”生效）。");
});

// 启动
resetToInitial();


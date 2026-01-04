import { neighbors4 } from "./utils.js";

export const DEFAULT_CODE = `// 你只需要实现 canClaim(state, cell) 并返回 true/false。
// state.claimed: Set，元素是 "x,z" 字符串
// cell: {x, z}
//
// 示例：默认逻辑（必须与已有领地 4 邻接）
function canClaim(state, cell){
  const k = cell.x + "," + cell.z;
  if (state.claimed.has(k)) return false;
  if (state.claimed.size === 0) return true;

  for (const n of neighbors4(cell.x, cell.z)){
    if (state.claimed.has(n.x + "," + n.z)) return true;
  }
  return false;
}

// 你也可以添加辅助函数（例如：九宫格密度、端点延伸限制等）`;

export function compileCanClaimFromEditor(userCode) {
  const factory = new Function(
    "neighbors4",
    `
      "use strict";
      ${userCode}
      if (typeof canClaim !== "function") {
        throw new Error("未找到 canClaim(state, cell) 函数");
      }
      return canClaim;
    `,
  );
  return factory(neighbors4);
}

export function openPopupEditor(codeEl, setMsg) {
  const win = window.open("", "LogicEditor", "width=700,height=700");
  if (!win) {
    setMsg("弹出窗口被浏览器拦截。");
    return null;
  }

  const html = `
<!doctype html><html><head><meta charset="utf-8">
<title>圈地逻辑编辑器</title>
<style>
  body{margin:0;background:#0f1115;color:#e6e6e6;font-family:system-ui,-apple-system,Segoe UI,Roboto,Noto Sans,PingFang SC,Microsoft YaHei,Arial;}
  .hdr{padding:10px 12px;border-bottom:1px solid #2a3140;display:flex;gap:8px;align-items:center;justify-content:space-between;background:#161a22;}
  button{background:#111521;color:#e6e6e6;border:1px solid #2a3140;border-radius:8px;padding:7px 10px;cursor:pointer;font-size:12px;}
  .wrap{padding:12px;height:calc(100vh - 54px);box-sizing:border-box;display:flex;flex-direction:column;gap:8px;}
  textarea{flex:1;resize:none;background:#0b0d12;color:#e5e7eb;border:1px solid #2a3140;border-radius:10px;padding:10px;box-sizing:border-box;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.45;}
  .msg{font-size:12px;color:#a8b0c0;background:#111521;border:1px solid #2a3140;border-radius:10px;padding:8px 10px;white-space:pre-wrap;min-height:40px;}
</style>
</head><body>
  <div class="hdr">
    <div>JS 逻辑编辑器（弹窗）</div>
    <div style="display:flex;gap:8px;">
      <button id="send">发送到主页面</button>
      <button id="close">关闭</button>
    </div>
  </div>
  <div class="wrap">
    <textarea id="code"></textarea>
    <div class="msg" id="msg">点击“发送到主页面”后，再在主页面点“应用逻辑”。</div>
  </div>
<script>
  const code = document.getElementById('code');
  const msg = document.getElementById('msg');
  window.addEventListener('message', (ev) => {
    if (!ev.data || ev.data.type !== 'INIT_CODE') return;
    code.value = ev.data.code || '';
  });
  document.getElementById('send').addEventListener('click', () => {
    window.opener && window.opener.postMessage({type:'PUSH_CODE', code: code.value}, '*');
    msg.textContent = '已发送。';
  });
  document.getElementById('close').addEventListener('click', () => window.close());
<\/script>
</body></html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.postMessage({ type: "INIT_CODE", code: codeEl.value }, "*");

  setMsg("已打开弹窗编辑器。");
  return win;
}

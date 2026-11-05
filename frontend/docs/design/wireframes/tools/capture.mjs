// Chụp từng màn hình của ui-demo thành PNG có đánh số vùng (wireframe #10).
// Không dùng thư viện ngoài: điều khiển Chrome headless qua DevTools Protocol (WebSocket có sẵn trong Node 24).
// Cách dùng (từ thư mục frontend/docs/design/wireframes/tools):
//   node regions.cjs                       # sinh config.json
//   node capture.mjs config.json ..        # chụp lại toàn bộ ảnh vào wireframes/
//   node capture.mjs config.json .. CW-06  # chỉ chụp ảnh có tên chứa "CW-06"
// Cần Google Chrome (đổi đường dẫn bằng biến môi trường CHROME_PATH) và mạng để tải phông Be Vietnam Pro.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const [, , configPath, outDir, filter] = process.argv;
const config = JSON.parse(readFileSync(configPath, "utf8"));
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9333;
const WIDTH = 1440;
const BASE_HEIGHT = 900;
const profileDir = join(process.env.TEMP || ".", "wf-chrome-profile");
rmSync(profileDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  "--hide-scrollbars",
  "--disable-gpu",
  "--no-first-run",
  "about:blank",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPageWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Không kết nối được Chrome");
}

const ws = new WebSocket(await getPageWsUrl());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 1;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: BASE_HEIGHT, deviceScaleFactor: 1, mobile: false });
const demoUrl = pathToFileURL(resolve(dirname(configPath), config.demo)).href;
await send("Page.navigate", { url: demoUrl + "#ov-01" });
await sleep(1500);
await evaluate("document.fonts.ready.then(() => true)");

// Ẩn phần chỉ dùng cho demo; thêm kiểu cho lớp chú thích.
await evaluate(`(() => {
  const s = document.createElement('style');
  s.textContent = \`
    :root{--demo-h:0px !important}
    .demo-bar,.demo-states{display:none !important}
    .screen.is-active{animation:none !important}
    #__ann{position:absolute;left:0;top:0;width:0;height:0;z-index:9999;pointer-events:none}
    #__ann .box{position:absolute;border:2px dashed #D6006F;border-radius:10px;box-sizing:border-box}
    #__ann .num{position:absolute;min-width:26px;height:26px;padding:0 6px;border-radius:13px;background:#D6006F;color:#fff;
      font:700 14px/26px 'Be Vietnam Pro',system-ui,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff,0 2px 6px rgba(0,0,0,.25)}
  \`;
  document.head.appendChild(s);
  return true;
})()`);

const drawRegions = (regions) => `(() => {
  document.getElementById('__ann')?.remove();
  const layer = document.createElement('div'); layer.id = '__ann'; document.body.appendChild(layer);
  const missing = [];
  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  for (const r of ${JSON.stringify(regions)}) {
    const el = Array.from(document.querySelectorAll(r.sel)).filter(visible)[r.i || 0];
    if (!el) { missing.push(r.n + ': ' + r.sel); continue; }
    const b = el.getBoundingClientRect();
    const x = b.left + scrollX, y = b.top + scrollY, pad = 4;
    const box = document.createElement('div'); box.className = 'box';
    Object.assign(box.style, { left: (x - pad) + 'px', top: (y - pad) + 'px', width: (b.width + pad * 2) + 'px', height: (b.height + pad * 2) + 'px' });
    const num = document.createElement('div'); num.className = 'num'; num.textContent = r.n;
    Object.assign(num.style, { left: Math.max(2, x - 14) + 'px', top: Math.max(2, y - 14) + 'px' });
    layer.append(box, num);
  }
  return missing;
})()`;

const report = [];
for (const shot of config.shots) {
  if (filter && !shot.file.includes(filter)) continue;
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: BASE_HEIGHT, deviceScaleFactor: 1, mobile: false });
  await evaluate(`(() => {
    document.querySelectorAll('.overlay.is-open').forEach(o => o.classList.remove('is-open'));
    document.getElementById('__ann')?.remove();
    if (location.hash === ${JSON.stringify("#" + shot.hash)}) location.hash = '#ov-01';
    return true;
  })()`);
  await sleep(150);
  await evaluate(`(() => { location.hash = ${JSON.stringify("#" + shot.hash)}; return true; })()`);
  await sleep(350);
  if (shot.role) await evaluate(`(() => { document.body.dataset.staffRole = ${JSON.stringify(shot.role)}; return true; })()`);
  if (shot.click) await evaluate(`(() => { document.querySelector(${JSON.stringify(shot.click)})?.click(); return true; })()`);
  if (shot.modal) await evaluate(`(() => { document.getElementById(${JSON.stringify(shot.modal)}).classList.add('is-open'); return true; })()`);
  await sleep(250);

  let height = BASE_HEIGHT;
  if (!shot.modal && !shot.viewportOnly) {
    height = await evaluate("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)");
    height = Math.max(BASE_HEIGHT, Math.ceil(height));
    await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height, deviceScaleFactor: 1, mobile: false });
    await sleep(200);
  }
  const missing = await evaluate(drawRegions(shot.regions || []));
  await sleep(100);
  let clip;
  if (shot.modal) {
    const b = await evaluate(`(() => { const m = document.querySelector('#${shot.modal} .modal, #${shot.modal} .drawer'); const r = m.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
    const m = 28;
    const x = Math.max(0, b.x - m), y = Math.max(0, b.y - m);
    clip = { x, y, width: Math.min(WIDTH - x, b.w + m * 2), height: Math.min(BASE_HEIGHT - y, b.h + m * 2), scale: 1 };
  }
  const { data } = await send("Page.captureScreenshot", clip ? { format: "png", clip } : { format: "png" });
  const file = join(outDir, shot.file);
  writeFileSync(file, Buffer.from(data, "base64"));
  report.push({ file: shot.file, height, missing });
  console.log(`${shot.file}  ${WIDTH}x${height}${missing.length ? "  THIẾU: " + missing.join(" | ") : ""}`);
}

ws.close();
chrome.kill();
const bad = report.filter((r) => r.missing.length);
console.log(`\n${report.length} ảnh, ${bad.length} ảnh thiếu vùng.`);
process.exit(bad.length ? 1 : 0);

// Frontend: uploads a photo, calls the backend for a diagnosis, renders results,
// and shows a fashion-illustration style card (no photo compositing).

const UNDERTONE_JP = { warm: "イエベ（黄み寄り）", cool: "ブルベ（青み寄り）", neutral: "ニュートラル" };
const CONF_JP = { high: "確信度 高", medium: "確信度 中", low: "確信度 低" };

const state = { img: null, natW: 0, natH: 0, diagnosis: null };
const $ = (id) => document.getElementById(id);

function setStatus(msg, { error = false, loading = false } = {}) {
  const el = $("status");
  el.innerHTML = "";
  el.classList.toggle("error", error);
  if (loading) {
    const sp = document.createElement("span");
    sp.className = "spinner";
    el.appendChild(sp);
  }
  if (msg) el.appendChild(document.createTextNode(msg));
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------
const fileInput = $("file-input");
const dropzone = $("dropzone");

fileInput.addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) loadImageFile(f);
});

["dragenter", "dragover"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("dragover"); })
);
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("dragover"); })
);
dropzone.addEventListener("drop", (e) => {
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) loadImageFile(f);
});

function loadImageFile(file) {
  if (!file.type.startsWith("image/")) {
    setStatus("画像ファイルを選んでください。", { error: true });
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.img = img;
    state.natW = img.naturalWidth;
    state.natH = img.naturalHeight;
    drawPreview();
    $("preview-wrap").hidden = false;
    setStatus("");
    URL.revokeObjectURL(url);
  };
  img.onerror = () => { setStatus("画像を読み込めませんでした。", { error: true }); URL.revokeObjectURL(url); };
  img.src = url;
}

function drawPreview() {
  const canvas = $("preview-canvas");
  const maxW = 520;
  const scale = Math.min(1, maxW / state.natW);
  canvas.width = state.natW * scale;
  canvas.height = state.natH * scale;
  canvas.getContext("2d").drawImage(state.img, 0, 0, canvas.width, canvas.height);
}

$("reset-btn").addEventListener("click", () => {
  state.img = null;
  state.diagnosis = null;
  fileInput.value = "";
  $("preview-wrap").hidden = true;
  ["step-result", "step-reco", "step-tryon"].forEach((id) => ($(id).hidden = true));
  setStatus("");
});

function toDownscaledJpeg(maxEdge = 1024, quality = 0.9) {
  const scale = Math.min(1, maxEdge / Math.max(state.natW, state.natH));
  const c = document.createElement("canvas");
  c.width = Math.round(state.natW * scale);
  c.height = Math.round(state.natH * scale);
  c.getContext("2d").drawImage(state.img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

// ---------------------------------------------------------------------------
// Analyze via backend
// ---------------------------------------------------------------------------
$("analyze-btn").addEventListener("click", analyze);

async function analyze() {
  if (!state.img) return;
  const btn = $("analyze-btn");
  btn.disabled = true;
  setStatus("AIが写真を解析しています…（10〜20秒ほどかかることがあります）", { loading: true });
  try {
    const dataUrl = toDownscaledJpeg();
    const imageBase64 = dataUrl.split(",", 2)[1];
    const resp = await fetch("/api/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mediaType: "image/jpeg" }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || `サーバーエラー (HTTP ${resp.status})`);

    state.diagnosis = data;
    renderResults(data);
    renderReco(data);
    initIllustration(data);
    if (data.faceDetected === false) {
      setStatus("顔をはっきり検出できませんでした。結果は参考程度にご覧ください。", { error: true });
    } else {
      setStatus("診断が完了しました。");
    }
  } catch (e) {
    console.error(e);
    setStatus(`診断に失敗しました: ${e.message}`, { error: true });
  } finally {
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Render diagnosis
// ---------------------------------------------------------------------------
function confTag(level) {
  const span = document.createElement("span");
  span.className = `confidence-tag confidence-${level || "medium"}`;
  span.textContent = CONF_JP[level] || CONF_JP.medium;
  return span;
}

function renderResults(d) {
  $("step-result").hidden = false;

  const pc = d.personalColor;
  $("season-name").textContent = pc.seasonLabel || pc.season;
  const meta = $("season-meta");
  meta.textContent = UNDERTONE_JP[pc.undertone] || "";
  meta.appendChild(confTag(pc.confidence));
  $("season-words").textContent = pc.reasoning || "";

  const pal = $("season-palette");
  pal.innerHTML = "";
  (pc.palette || []).forEach((hex) => {
    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.background = hex;
    sw.title = hex;
    pal.appendChild(sw);
  });

  const ft = d.faceType;
  const ftName = $("facetype-name");
  ftName.textContent = ft.type || "—";
  ftName.appendChild(confTag(ft.confidence));
  $("facetype-axis").textContent = [ft.childAdult, ft.curveStraight].filter(Boolean).join(" / ");
  $("facetype-words").textContent = ft.reasoning || "";
}

// ---------------------------------------------------------------------------
// Recommendations + search
// ---------------------------------------------------------------------------
function searchLinks(q) {
  const enc = encodeURIComponent(q);
  return {
    rakuten: `https://search.rakuten.co.jp/search/mall/${enc}/`,
    amazon: `https://www.amazon.co.jp/s?k=${enc}`,
    google: `https://www.google.com/search?tbm=isch&q=${enc}`,
  };
}

function shopButton(label, href) {
  const a = document.createElement("a");
  a.className = "btn btn-shop";
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = label;
  a.href = href;
  return a;
}

function renderReco(d) {
  $("step-reco").hidden = false;
  const reco = d.recommendation || {};
  $("reco-summary").textContent = reco.summary || "";

  const wrap = $("reco-items");
  wrap.innerHTML = "";
  (reco.items || []).forEach((item) => {
    const box = document.createElement("div");
    box.className = "reco-item";

    const head = document.createElement("div");
    head.className = "reco-item-head";
    const cat = document.createElement("div");
    cat.className = "reco-item-cat";
    cat.textContent = item.category || "アイテム";
    head.appendChild(cat);
    box.appendChild(head);

    const advice = document.createElement("div");
    advice.className = "reco-item-advice";
    advice.textContent = item.advice || "";
    box.appendChild(advice);

    const btns = document.createElement("div");
    btns.className = "search-btns";
    const links = searchLinks(item.searchKeyword || item.category || "");
    btns.appendChild(shopButton("楽天", links.rakuten));
    btns.appendChild(shopButton("Amazon", links.amazon));
    btns.appendChild(shopButton("Google画像", links.google));
    box.appendChild(btns);

    wrap.appendChild(box);
  });

  const avoid = $("reco-avoid");
  if (reco.avoid) { avoid.hidden = false; avoid.textContent = `避けたいもの： ${reco.avoid}`; }
  else avoid.hidden = true;

  const seed = (reco.items && reco.items[0] && reco.items[0].searchKeyword) || (d.personalColor.seasonLabel || "");
  $("search-query").value = seed;
  applyTopSearch(seed);
}

function applyTopSearch(q) {
  const links = searchLinks(q);
  $("btn-rakuten").href = links.rakuten;
  $("btn-amazon").href = links.amazon;
  $("btn-google").href = links.google;
}

$("search-query").addEventListener("input", (e) => applyTopSearch(e.target.value));

// ---------------------------------------------------------------------------
// Style Illustration (fashion croquis with personal-color outfit)
// ---------------------------------------------------------------------------
const illus = {
  canvas: null, ctx: null,
  garment: { type: "tshirt", scale: 1, opacity: 1, color: "#FF9E7A" },
  palette: [],
  bound: false,
};

function initIllustration(d) {
  $("step-tryon").hidden = false;
  const canvas = $("tryon-canvas");
  illus.canvas = canvas;
  illus.ctx = canvas.getContext("2d");
  canvas.width = 300;
  canvas.height = 480;

  illus.palette = (d.personalColor && d.personalColor.palette && d.personalColor.palette.length)
    ? d.personalColor.palette
    : ["#FF9E7A", "#FFC15E", "#9BD770", "#7FD8D8", "#B7A7D9"];
  illus.garment.color = illus.palette[0];
  illus.garment.scale = 1;
  illus.garment.opacity = 1;

  renderGarmentPalette();
  drawIllustration();
  bindIllusControls();
}

function hexWithAlpha(hex, alpha) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  if (Number.isNaN(n)) return `rgba(200,200,200,${alpha})`;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawIllustration() {
  const { ctx, canvas, garment, palette } = illus;
  const cw = canvas.width, ch = canvas.height;
  const cx = cw / 2;

  ctx.clearRect(0, 0, cw, ch);

  // Background
  ctx.fillStyle = "#FAFAF8";
  ctx.fillRect(0, 0, cw, ch);
  const bgGrad = ctx.createRadialGradient(cx, ch * 0.45, 0, cx, ch * 0.45, ch * 0.7);
  bgGrad.addColorStop(0, hexWithAlpha(palette[1] || palette[0], 0.20));
  bgGrad.addColorStop(1, hexWithAlpha(palette[0], 0.04));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, cw, ch);

  // Decorative palette dots
  [
    { xi: 0.08, yi: 0.07, r: 13, pi: 0 },
    { xi: 0.90, yi: 0.11, r: 9,  pi: 1 },
    { xi: 0.12, yi: 0.90, r: 7,  pi: 2 },
    { xi: 0.87, yi: 0.85, r: 12, pi: 3 },
    { xi: 0.50, yi: 0.97, r: 5,  pi: 4 },
  ].forEach(({ xi, yi, r, pi }) => {
    ctx.beginPath();
    ctx.arc(cw * xi, ch * yi, r, 0, Math.PI * 2);
    ctx.fillStyle = hexWithAlpha(palette[pi % palette.length], 0.40);
    ctx.fill();
  });

  const figY = ch * 0.04;
  const figH = ch * 0.90;

  drawFashionFigure(ctx, cx, figY, figH);

  ctx.save();
  ctx.globalAlpha = garment.opacity;
  drawGarmentOnFigure(ctx, garment.type, cx, figY, figH, garment.color, garment.scale);
  ctx.restore();
}

function drawFashionFigure(ctx, cx, startY, totalH) {
  const headH = totalH / 9;
  const headW = headH * 0.65;

  const neckTop = startY + headH * 0.92;
  const shoulderY = neckTop + headH * 0.28;
  const sHalf = headW * 1.75;
  const waistY = startY + headH * 3.8;
  const wHalf = sHalf * 0.66;
  const hipY = startY + headH * 4.85;
  const hHalf = sHalf * 1.06;
  const ankleY = startY + totalH;
  const legGap = hHalf * 0.10;
  const legW = hHalf * 0.23;

  const skin = "#E8D5C4";

  // Body
  ctx.beginPath();
  ctx.moveTo(cx - sHalf, shoulderY);
  ctx.bezierCurveTo(cx - sHalf, shoulderY + headH * 0.2, cx - wHalf, waistY - headH * 0.3, cx - wHalf, waistY);
  ctx.bezierCurveTo(cx - wHalf, waistY + headH * 0.25, cx - hHalf, hipY - headH * 0.1, cx - hHalf, hipY);
  ctx.lineTo(cx - legGap - legW, ankleY);
  ctx.lineTo(cx - legGap, ankleY);
  ctx.lineTo(cx - legGap, hipY + headH * 0.35);
  ctx.lineTo(cx + legGap, hipY + headH * 0.35);
  ctx.lineTo(cx + legGap, ankleY);
  ctx.lineTo(cx + legGap + legW, ankleY);
  ctx.lineTo(cx + hHalf, hipY);
  ctx.bezierCurveTo(cx + hHalf, hipY - headH * 0.1, cx + wHalf, waistY + headH * 0.25, cx + wHalf, waistY);
  ctx.bezierCurveTo(cx + wHalf, waistY - headH * 0.3, cx + sHalf, shoulderY + headH * 0.2, cx + sHalf, shoulderY);
  ctx.lineTo(cx + headW * 0.22, neckTop + headH * 0.36);
  ctx.lineTo(cx - headW * 0.22, neckTop + headH * 0.36);
  ctx.closePath();

  const bodyGrad = ctx.createLinearGradient(cx - sHalf, shoulderY, cx + sHalf * 0.6, ankleY);
  bodyGrad.addColorStop(0, skin);
  bodyGrad.addColorStop(1, shade(skin, -0.10));
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = shade(skin, -0.18);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Arms
  const armH = (waistY + headH * 0.8 - shoulderY) / 2;
  const armCY = shoulderY + armH;
  const armW = headW * 0.20;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.ellipse(cx + side * (sHalf + armW * 0.35), armCY, armW, armH, 0, 0, Math.PI * 2);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.strokeStyle = shade(skin, -0.18);
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  // Neck
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.rect(cx - headW * 0.17, neckTop, headW * 0.34, headH * 0.38);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(cx, startY + headH * 0.50, headW * 0.50, headH * 0.52, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.strokeStyle = shade(skin, -0.18);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Hair (top)
  ctx.beginPath();
  ctx.ellipse(cx, startY + headH * 0.33, headW * 0.52, headH * 0.40, 0, Math.PI, 0);
  ctx.fillStyle = "#4A3020";
  ctx.fill();
  // Hair (sides)
  [[-0.42, 0.3], [0.42, -0.3]].forEach(([dx, rot]) => {
    ctx.beginPath();
    ctx.ellipse(cx + headW * dx, startY + headH * 0.62, headW * 0.13, headH * 0.27, rot, 0, Math.PI * 2);
    ctx.fillStyle = "#4A3020";
    ctx.fill();
  });

  // Eyes
  [[-0.18], [0.18]].forEach(([dx]) => {
    ctx.beginPath();
    ctx.ellipse(cx + headW * dx, startY + headH * 0.55, headW * 0.07, headH * 0.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#2A1A0A";
    ctx.fill();
    // Highlight
    ctx.beginPath();
    ctx.arc(cx + headW * dx + headW * 0.03, startY + headH * 0.52, headW * 0.02, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();
  });

  // Mouth
  ctx.beginPath();
  ctx.arc(cx, startY + headH * 0.70, headW * 0.13, 0.15, Math.PI - 0.15);
  ctx.strokeStyle = "#8A5A4A";
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function drawGarmentOnFigure(ctx, type, cx, figY, figH, color, scale) {
  const headH = figH / 9;
  const headW = headH * 0.65;
  const neckTop = figY + headH * 0.92;
  const shoulderY = neckTop + headH * 0.28;
  const fullShoulderW = headW * 1.75 * 2;
  drawGarmentShape(ctx, type, cx, shoulderY, fullShoulderW * scale, color);
}

function drawGarmentShape(ctx, type, cx, topY, w, color) {
  const cfg = {
    tshirt: { h: 1.15, sleeve: 0.28, sleeveLen: 0.30, flare: 0,    open: false },
    knit:   { h: 1.30, sleeve: 0.20, sleeveLen: 0.62, flare: 0.02, open: false },
    dress:  { h: 1.95, sleeve: 0.26, sleeveLen: 0.28, flare: 0.35, open: false },
    coat:   { h: 1.75, sleeve: 0.18, sleeveLen: 0.70, flare: 0.10, open: true  },
  }[type] || { h: 1.15, sleeve: 0.28, sleeveLen: 0.30, flare: 0, open: false };

  const h = w * cfg.h;
  const collar = w * 0.20;
  const left = cx - w / 2;
  const right = cx + w / 2;
  const sleeveW = w * cfg.sleeve;
  const sleeveDrop = h * cfg.sleeveLen;
  const hemW = w * (0.40 + cfg.flare);
  const bottomY = topY + h;

  ctx.beginPath();
  ctx.moveTo(cx - collar, topY);
  ctx.lineTo(left, topY + h * 0.04);
  ctx.lineTo(left - sleeveW, topY + h * 0.04 + sleeveDrop * 0.5);
  ctx.lineTo(left - sleeveW * 0.55, topY + h * 0.04 + sleeveDrop);
  ctx.lineTo(left + w * 0.10, topY + h * 0.30);
  ctx.lineTo(cx - hemW, bottomY);
  ctx.lineTo(cx + hemW, bottomY);
  ctx.lineTo(right - w * 0.10, topY + h * 0.30);
  ctx.lineTo(right + sleeveW * 0.55, topY + h * 0.04 + sleeveDrop);
  ctx.lineTo(right + sleeveW, topY + h * 0.04 + sleeveDrop * 0.5);
  ctx.lineTo(right, topY + h * 0.04);
  ctx.lineTo(cx + collar, topY);
  ctx.quadraticCurveTo(cx, topY + h * 0.11, cx - collar, topY);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = Math.max(1, w * 0.012);
  ctx.strokeStyle = shade(color, -0.25);
  ctx.stroke();

  ctx.save();
  ctx.clip();
  const grad = ctx.createLinearGradient(left, topY, right, bottomY);
  grad.addColorStop(0, "rgba(255,255,255,0.12)");
  grad.addColorStop(1, "rgba(0,0,0,0.14)");
  ctx.fillStyle = grad;
  ctx.fillRect(left - sleeveW, topY, w + sleeveW * 2, h);
  ctx.restore();

  if (cfg.open) {
    ctx.beginPath();
    ctx.moveTo(cx, topY + h * 0.10);
    ctx.lineTo(cx, bottomY);
    ctx.lineWidth = Math.max(1, w * 0.02);
    ctx.strokeStyle = shade(color, -0.35);
    ctx.stroke();
  }
}

function shade(hex, amt) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  if (Number.isNaN(n)) return "#999999";
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const cl = (v) => Math.max(0, Math.min(255, v));
  r = cl(r + r * amt); g = cl(g + g * amt); b = cl(b + b * amt);
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function renderGarmentPalette() {
  const wrap = $("garment-palette");
  if (!wrap) return;
  wrap.innerHTML = "";
  illus.palette.forEach((hex) => {
    const el = document.createElement("div");
    el.className = "swatch" + (hex === illus.garment.color ? " selected" : "");
    el.style.background = hex;
    el.addEventListener("click", () => { illus.garment.color = hex; renderGarmentPalette(); drawIllustration(); });
    wrap.appendChild(el);
  });
}

function bindIllusControls() {
  if (illus.bound) return;
  illus.bound = true;
  $("garment-select").addEventListener("change", (e) => { illus.garment.type = e.target.value; drawIllustration(); });
  $("garment-scale").addEventListener("input", (e) => { illus.garment.scale = parseFloat(e.target.value); drawIllustration(); });
  $("garment-opacity").addEventListener("input", (e) => { illus.garment.opacity = parseFloat(e.target.value); drawIllustration(); });
  $("export-btn").addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "style-illustration.png";
    link.href = illus.canvas.toDataURL("image/png");
    link.click();
  });
}

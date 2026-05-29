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
    state.img = img; state.natW = img.naturalWidth; state.natH = img.naturalHeight;
    drawPreview(); $("preview-wrap").hidden = false; setStatus(""); URL.revokeObjectURL(url);
  };
  img.onerror = () => { setStatus("画像を読み込めませんでした。", { error: true }); URL.revokeObjectURL(url); };
  img.src = url;
}

function drawPreview() {
  const canvas = $("preview-canvas");
  const maxW = 520;
  const scale = Math.min(1, maxW / state.natW);
  canvas.width = state.natW * scale; canvas.height = state.natH * scale;
  canvas.getContext("2d").drawImage(state.img, 0, 0, canvas.width, canvas.height);
}

$("reset-btn").addEventListener("click", () => {
  state.img = null; state.diagnosis = null; fileInput.value = "";
  $("preview-wrap").hidden = true;
  ["step-result", "step-reco", "step-tryon"].forEach((id) => ($(id).hidden = true));
  setStatus("");
});

function toDownscaledJpeg(maxEdge = 1024, quality = 0.9) {
  const scale = Math.min(1, maxEdge / Math.max(state.natW, state.natH));
  const c = document.createElement("canvas");
  c.width = Math.round(state.natW * scale); c.height = Math.round(state.natH * scale);
  c.getContext("2d").drawImage(state.img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

// ---------------------------------------------------------------------------
// Analyze
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
    renderResults(data); renderReco(data); initIllustration(data);
    setStatus(data.faceDetected === false
      ? "顔をはっきり検出できませんでした。結果は参考程度にご覧ください。"
      : "診断が完了しました。",
      { error: data.faceDetected === false });
  } catch (e) {
    console.error(e);
    setStatus(`診断に失敗しました: ${e.message}`, { error: true });
  } finally { btn.disabled = false; }
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
    sw.className = "swatch"; sw.style.background = hex; sw.title = hex;
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
// Recommendations
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
  a.className = "btn btn-shop"; a.target = "_blank"; a.rel = "noopener";
  a.textContent = label; a.href = href;
  return a;
}

function renderReco(d) {
  $("step-reco").hidden = false;
  const reco = d.recommendation || {};
  $("reco-summary").textContent = reco.summary || "";
  const wrap = $("reco-items");
  wrap.innerHTML = "";
  (reco.items || []).forEach((item) => {
    const box = document.createElement("div"); box.className = "reco-item";
    const head = document.createElement("div"); head.className = "reco-item-head";
    const cat = document.createElement("div"); cat.className = "reco-item-cat";
    cat.textContent = item.category || "アイテム";
    head.appendChild(cat); box.appendChild(head);
    const advice = document.createElement("div"); advice.className = "reco-item-advice";
    advice.textContent = item.advice || "";
    box.appendChild(advice);
    const btns = document.createElement("div"); btns.className = "search-btns";
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
  $("btn-rakuten").href = links.rakuten; $("btn-amazon").href = links.amazon; $("btn-google").href = links.google;
}

$("search-query").addEventListener("input", (e) => applyTopSearch(e.target.value));

// ---------------------------------------------------------------------------
// Style Illustration
// ---------------------------------------------------------------------------
const illus = {
  canvas: null, ctx: null,
  garment: { type: "tshirt", scale: 1, opacity: 1, color: "#FF9E7A" },
  palette: [], bound: false,
};

function initIllustration(d) {
  $("step-tryon").hidden = false;
  const canvas = $("tryon-canvas");
  illus.canvas = canvas; illus.ctx = canvas.getContext("2d");
  canvas.width = 300; canvas.height = 480;
  illus.palette = (d.personalColor && d.personalColor.palette && d.personalColor.palette.length)
    ? d.personalColor.palette
    : ["#FF9E7A", "#FFC15E", "#9BD770", "#7FD8D8", "#B7A7D9"];
  illus.garment.color = illus.palette[0];
  illus.garment.scale = 1; illus.garment.opacity = 1;
  renderGarmentPalette(); drawIllustration(); bindIllusControls();
}

function hexWithAlpha(hex, alpha) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  if (Number.isNaN(n)) return `rgba(200,200,200,${alpha})`;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// Drawing: background + orchestration
// ---------------------------------------------------------------------------
function drawIllustration() {
  const { ctx, canvas, garment, palette } = illus;
  const cw = canvas.width, ch = canvas.height, cx = cw / 2;
  ctx.clearRect(0, 0, cw, ch);

  // Background
  ctx.fillStyle = "#FAF8F5";
  ctx.fillRect(0, 0, cw, ch);
  const bgGrad = ctx.createRadialGradient(cx, ch * 0.44, 0, cx, ch * 0.44, ch * 0.72);
  bgGrad.addColorStop(0, hexWithAlpha(palette[1] || palette[0], 0.22));
  bgGrad.addColorStop(1, hexWithAlpha(palette[0], 0.04));
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, cw, ch);

  // Floor line
  const floorY = ch * 0.896;
  const floorGrad = ctx.createLinearGradient(cx - cw * 0.28, 0, cx + cw * 0.28, 0);
  floorGrad.addColorStop(0, "rgba(0,0,0,0)");
  floorGrad.addColorStop(0.5, hexWithAlpha(palette[0], 0.35));
  floorGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.28, floorY); ctx.lineTo(cx + cw * 0.28, floorY);
  ctx.strokeStyle = floorGrad; ctx.lineWidth = 0.8; ctx.stroke();
  // Shadow under figure
  const shadowGrad = ctx.createRadialGradient(cx, floorY, 0, cx, floorY, cw * 0.18);
  shadowGrad.addColorStop(0, "rgba(0,0,0,0.08)");
  shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadowGrad;
  ctx.ellipse(cx, floorY, cw * 0.18, ch * 0.012, 0, 0, Math.PI * 2);
  ctx.fill();

  // Decorative dots
  [[0.07,0.07,13,0],[0.91,0.10,9,1],[0.10,0.91,7,2],[0.88,0.86,11,3],[0.50,0.97,5,4]].forEach(([xi,yi,r,pi]) => {
    ctx.beginPath();
    ctx.arc(cw*xi, ch*yi, r, 0, Math.PI*2);
    ctx.fillStyle = hexWithAlpha(palette[pi % palette.length], 0.42);
    ctx.fill();
  });

  const figY = ch * 0.025, figH = ch * 0.87;
  const m = figMetrics(cx, figY, figH);

  // 1. Body skin
  drawFigureBody(ctx, m);
  // 2. Outfit (with opacity)
  ctx.save(); ctx.globalAlpha = garment.opacity;
  drawOutfit(ctx, m, garment);
  ctx.restore();
  // 3. Shoes (fully opaque, always on top)
  drawShoes(ctx, m);
  // 4. Hair + face (always on top of everything)
  drawHair(ctx, m);
  drawFace(ctx, m);
}

// Pre-computed figure measurements (all derived from headH)
function figMetrics(cx, startY, totalH) {
  const headH = totalH / 9.8;
  const headW = headH * 0.60;
  const headCy = startY + headH * 0.50;
  const neckTop = startY + headH * 0.93;
  const shoulderY = neckTop + headH * 0.27;
  const sHalf = headW * 1.68;
  const waistY = startY + headH * 3.85;
  const wHalf = sHalf * 0.63;
  const hipY = startY + headH * 4.90;
  const hHalf = sHalf * 1.04;
  const ankleY = startY + headH * 8.85;
  const footY = startY + totalH;
  const legGap = hHalf * 0.09;
  const legW = hHalf * 0.22;
  return { cx, startY, totalH, headH, headW, headCy, neckTop, shoulderY, sHalf, waistY, wHalf, hipY, hHalf, ankleY, footY, legGap, legW };
}

// ---------------------------------------------------------------------------
// Drawing: body
// ---------------------------------------------------------------------------
function drawFigureBody(ctx, m) {
  const { cx, headH, headW, headCy, neckTop, shoulderY, sHalf, waistY, wHalf, hipY, hHalf, ankleY, legGap, legW } = m;
  const skin = "#EDD3B8", skinDk = shade(skin, -0.09);

  // Body silhouette
  ctx.beginPath();
  ctx.moveTo(cx - sHalf, shoulderY);
  ctx.bezierCurveTo(cx - sHalf, shoulderY + headH * 0.18, cx - wHalf, waistY - headH * 0.32, cx - wHalf, waistY);
  ctx.bezierCurveTo(cx - wHalf, waistY + headH * 0.22, cx - hHalf, hipY - headH * 0.10, cx - hHalf, hipY);
  ctx.lineTo(cx - legGap - legW, ankleY);
  ctx.lineTo(cx - legGap, ankleY);
  ctx.lineTo(cx - legGap, hipY + headH * 0.32);
  ctx.lineTo(cx + legGap, hipY + headH * 0.32);
  ctx.lineTo(cx + legGap, ankleY);
  ctx.lineTo(cx + legGap + legW, ankleY);
  ctx.lineTo(cx + hHalf, hipY);
  ctx.bezierCurveTo(cx + hHalf, hipY - headH * 0.10, cx + wHalf, waistY + headH * 0.22, cx + wHalf, waistY);
  ctx.bezierCurveTo(cx + wHalf, waistY - headH * 0.32, cx + sHalf, shoulderY + headH * 0.18, cx + sHalf, shoulderY);
  ctx.lineTo(cx + headW * 0.20, neckTop + headH * 0.34);
  ctx.lineTo(cx - headW * 0.20, neckTop + headH * 0.34);
  ctx.closePath();
  const bodyGrad = ctx.createLinearGradient(cx - sHalf, shoulderY, cx + sHalf * 0.4, ankleY);
  bodyGrad.addColorStop(0, skin); bodyGrad.addColorStop(1, skinDk);
  ctx.fillStyle = bodyGrad; ctx.fill();
  ctx.strokeStyle = shade(skin, -0.14); ctx.lineWidth = 0.7; ctx.stroke();

  // Arms (slim ellipses alongside torso)
  const armCY = shoulderY + (waistY + headH * 0.7 - shoulderY) / 2;
  const armHalf = (waistY + headH * 0.7 - shoulderY) / 2;
  const armW = headW * 0.17;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.ellipse(cx + side * (sHalf + armW * 0.28), armCY, armW, armHalf, 0, 0, Math.PI * 2);
    ctx.fillStyle = skin; ctx.fill();
    ctx.strokeStyle = shade(skin, -0.14); ctx.lineWidth = 0.6; ctx.stroke();
  });

  // Neck
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.rect(cx - headW * 0.16, neckTop, headW * 0.32, headH * 0.34);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(cx, headCy, headW * 0.50, headH * 0.52, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin; ctx.fill();
  ctx.strokeStyle = shade(skin, -0.14); ctx.lineWidth = 0.7; ctx.stroke();
}

// ---------------------------------------------------------------------------
// Drawing: hair (bob with bangs)
// ---------------------------------------------------------------------------
function drawHair(ctx, m) {
  const { cx, headCy, headH, headW } = m;
  const hairColor = "#3A2410", hairHL = "#6A4428";
  const chinY = headCy + headH * 0.44;

  // Main bob shape
  ctx.beginPath();
  ctx.moveTo(cx + headW * 0.50, chinY);
  ctx.bezierCurveTo(cx + headW * 0.63, headCy + headH * 0.12, cx + headW * 0.58, headCy - headH * 0.38, cx, headCy - headH * 0.54);
  ctx.bezierCurveTo(cx - headW * 0.58, headCy - headH * 0.38, cx - headW * 0.63, headCy + headH * 0.12, cx - headW * 0.50, chinY);
  ctx.bezierCurveTo(cx - headW * 0.32, chinY + headH * 0.06, cx + headW * 0.32, chinY + headH * 0.06, cx + headW * 0.50, chinY);
  ctx.closePath();
  const hairGrad = ctx.createLinearGradient(cx - headW * 0.5, headCy - headH * 0.5, cx + headW * 0.25, headCy + headH * 0.45);
  hairGrad.addColorStop(0, hairHL); hairGrad.addColorStop(0.55, hairColor); hairGrad.addColorStop(1, shade(hairColor, -0.18));
  ctx.fillStyle = hairGrad; ctx.fill();

  // Bangs (covers top of forehead)
  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.50, headCy - headH * 0.18);
  ctx.bezierCurveTo(cx - headW * 0.32, headCy - headH * 0.55, cx + headW * 0.32, headCy - headH * 0.55, cx + headW * 0.50, headCy - headH * 0.18);
  ctx.bezierCurveTo(cx + headW * 0.22, headCy - headH * 0.13, cx - headW * 0.22, headCy - headH * 0.13, cx - headW * 0.50, headCy - headH * 0.18);
  ctx.closePath(); ctx.fillStyle = hairColor; ctx.fill();

  // Hair sheen
  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.06, headCy - headH * 0.50);
  ctx.bezierCurveTo(cx - headW * 0.02, headCy - headH * 0.20, cx + headW * 0.16, headCy - headH * 0.05, cx + headW * 0.22, headCy + headH * 0.12);
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.stroke();
}

// ---------------------------------------------------------------------------
// Drawing: face
// ---------------------------------------------------------------------------
function drawFace(ctx, m) {
  const { cx, headCy, headH, headW } = m;

  // Eyebrows
  [[-1, 1], [1, -1]].forEach(([side]) => {
    const bx = cx + side * headW * 0.21;
    ctx.beginPath();
    ctx.moveTo(bx - headW * 0.10, headCy - headH * 0.22);
    ctx.bezierCurveTo(bx - headW * 0.02, headCy - headH * 0.28, bx + headW * 0.02, headCy - headH * 0.26, bx + headW * 0.10, headCy - headH * 0.21);
    ctx.strokeStyle = "#3A2410"; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.stroke();
  });

  // Eyes (almond shaped)
  [[-0.21], [0.21]].forEach(([dx]) => {
    const ex = cx + headW * dx, ey = headCy - headH * 0.08;
    const ew = headW * 0.125, eh = headH * 0.065;
    // Iris
    ctx.beginPath();
    ctx.moveTo(ex - ew, ey);
    ctx.bezierCurveTo(ex - ew * 0.3, ey - eh * 1.25, ex + ew * 0.3, ey - eh * 1.25, ex + ew, ey);
    ctx.bezierCurveTo(ex + ew * 0.3, ey + eh * 0.80, ex - ew * 0.3, ey + eh * 0.80, ex - ew, ey);
    ctx.closePath(); ctx.fillStyle = "#2A1808"; ctx.fill();
    // Iris colour
    ctx.beginPath();
    ctx.moveTo(ex - ew * 0.52, ey);
    ctx.bezierCurveTo(ex - ew * 0.20, ey - eh * 0.95, ex + ew * 0.20, ey - eh * 0.95, ex + ew * 0.52, ey);
    ctx.bezierCurveTo(ex + ew * 0.20, ey + eh * 0.62, ex - ew * 0.20, ey + eh * 0.62, ex - ew * 0.52, ey);
    ctx.closePath(); ctx.fillStyle = "#5C3A25"; ctx.fill();
    // Highlight
    ctx.beginPath(); ctx.arc(ex + ew * 0.12, ey - eh * 0.44, headW * 0.026, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.fill();
    // Lash line
    ctx.beginPath();
    ctx.moveTo(ex - ew, ey);
    ctx.bezierCurveTo(ex - ew * 0.3, ey - eh * 1.48, ex + ew * 0.3, ey - eh * 1.48, ex + ew, ey);
    ctx.strokeStyle = "#1A0A00"; ctx.lineWidth = 1.3; ctx.stroke();
  });

  // Blush
  [[-0.33], [0.33]].forEach(([dx]) => {
    const bx = cx + headW * dx, by = headCy + headH * 0.04;
    const bg = ctx.createRadialGradient(bx, by, 0, bx, by, headW * 0.17);
    bg.addColorStop(0, "rgba(240,140,130,0.22)"); bg.addColorStop(1, "rgba(240,140,130,0)");
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(bx, by, headW * 0.17, headH * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  });

  // Nose (subtle)
  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.04, headCy + headH * 0.09);
  ctx.bezierCurveTo(cx - headW * 0.08, headCy + headH * 0.16, cx + headW * 0.08, headCy + headH * 0.16, cx + headW * 0.04, headCy + headH * 0.09);
  ctx.strokeStyle = "rgba(180,130,100,0.45)"; ctx.lineWidth = 1.0; ctx.stroke();

  // Lips
  const ly = headCy + headH * 0.27, lw = headW * 0.19;
  // Upper lip
  ctx.beginPath();
  ctx.moveTo(cx - lw, ly);
  ctx.bezierCurveTo(cx - lw * 0.55, ly - headH * 0.055, cx - lw * 0.08, ly - headH * 0.065, cx, ly - headH * 0.01);
  ctx.bezierCurveTo(cx + lw * 0.08, ly - headH * 0.065, cx + lw * 0.55, ly - headH * 0.055, cx + lw, ly);
  ctx.strokeStyle = "#B86868"; ctx.lineWidth = 0.9; ctx.stroke();
  // Lower lip (fill)
  ctx.beginPath();
  ctx.moveTo(cx - lw, ly);
  ctx.bezierCurveTo(cx - lw * 0.55, ly + headH * 0.062, cx + lw * 0.55, ly + headH * 0.062, cx + lw, ly);
  ctx.fillStyle = "rgba(195,105,105,0.48)"; ctx.fill();
  ctx.strokeStyle = "#B86868"; ctx.lineWidth = 0.8; ctx.stroke();
}

// ---------------------------------------------------------------------------
// Drawing: outfit (top + pants)
// ---------------------------------------------------------------------------
function drawOutfit(ctx, m, garment) {
  const { cx, shoulderY, sHalf, hipY, hHalf, legGap, legW, ankleY } = m;
  const topW = sHalf * 2;
  drawGarmentShape(ctx, garment.type, cx, shoulderY, topW * garment.scale, garment.color);

  if (garment.type !== "dress") {
    // Slim trousers in a warm greige that pairs with any top
    const pantsColor = "#BDB3A2";
    const topW2 = legW * 1.08, botW = legW * 0.78;
    const pantsTopY = hipY + (ankleY - hipY) * 0.04;
    [cx - legGap - legW * 0.5, cx + legGap + legW * 0.5].forEach((lcx) => {
      ctx.beginPath();
      ctx.moveTo(lcx - topW2 * 0.5, pantsTopY);
      ctx.lineTo(lcx + topW2 * 0.5, pantsTopY);
      ctx.lineTo(lcx + botW * 0.5, ankleY);
      ctx.lineTo(lcx - botW * 0.5, ankleY);
      ctx.closePath();
      ctx.fillStyle = pantsColor; ctx.fill();
      ctx.strokeStyle = shade(pantsColor, -0.11); ctx.lineWidth = 0.6; ctx.stroke();
    });
    // Center crease hint
    ctx.beginPath();
    ctx.moveTo(cx, hipY + (ankleY - hipY) * 0.06);
    ctx.lineTo(cx, hipY + (ankleY - hipY) * 0.38);
    ctx.strokeStyle = shade(pantsColor, -0.07); ctx.lineWidth = 0.5; ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Drawing: shoes
// ---------------------------------------------------------------------------
function drawShoes(ctx, m) {
  const { cx, legGap, legW, ankleY, footY } = m;
  const sh = footY - ankleY;
  const sc = "#252018", scHL = shade(sc, 0.32);

  [
    { side: -1, ox: -(legGap + legW * 0.5 + legW * 0.28) },
    { side:  1, ox:  (legGap + legW * 0.5 + legW * 0.28) },
  ].forEach(({ side, ox }) => {
    const sx = cx + ox;
    ctx.beginPath();
    ctx.ellipse(sx, ankleY + sh * 0.55, legW * 1.05, sh * 0.46, side * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = sc; ctx.fill();
    // Toe box highlight
    ctx.beginPath();
    ctx.ellipse(sx - side * legW * 0.30, ankleY + sh * 0.38, legW * 0.32, sh * 0.14, side * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = scHL; ctx.fill();
  });
}

// ---------------------------------------------------------------------------
// Drawing: garment shape (unchanged)
// ---------------------------------------------------------------------------
function drawGarmentShape(ctx, type, cx, topY, w, color) {
  const cfg = {
    tshirt: { h: 1.15, sleeve: 0.28, sleeveLen: 0.30, flare: 0,    open: false },
    knit:   { h: 1.32, sleeve: 0.20, sleeveLen: 0.62, flare: 0.02, open: false },
    dress:  { h: 2.00, sleeve: 0.26, sleeveLen: 0.28, flare: 0.38, open: false },
    coat:   { h: 1.78, sleeve: 0.18, sleeveLen: 0.70, flare: 0.12, open: true  },
  }[type] || { h: 1.15, sleeve: 0.28, sleeveLen: 0.30, flare: 0, open: false };

  const h = w * cfg.h;
  const collar = w * 0.20;
  const left = cx - w / 2, right = cx + w / 2;
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

  ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = Math.max(1, w * 0.012);
  ctx.strokeStyle = shade(color, -0.22); ctx.stroke();

  ctx.save(); ctx.clip();
  const grad = ctx.createLinearGradient(left, topY, right, bottomY);
  grad.addColorStop(0, "rgba(255,255,255,0.13)"); grad.addColorStop(1, "rgba(0,0,0,0.13)");
  ctx.fillStyle = grad; ctx.fillRect(left - sleeveW, topY, w + sleeveW * 2, h);
  ctx.restore();

  if (cfg.open) {
    ctx.beginPath();
    ctx.moveTo(cx, topY + h * 0.10); ctx.lineTo(cx, bottomY);
    ctx.lineWidth = Math.max(1, w * 0.02);
    ctx.strokeStyle = shade(color, -0.32); ctx.stroke();
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

// ---------------------------------------------------------------------------
// Illustration controls
// ---------------------------------------------------------------------------
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

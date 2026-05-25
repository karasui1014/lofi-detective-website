// Frontend: uploads a photo, asks the backend (which calls Claude) for a
// diagnosis, renders it, and offers a client-side try-on overlay.

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

// Downscale to a JPEG data URL (max long edge) to limit upload size / token cost.
function toDownscaledJpeg(maxEdge = 1024, quality = 0.9) {
  const scale = Math.min(1, maxEdge / Math.max(state.natW, state.natH));
  const c = document.createElement("canvas");
  c.width = Math.round(state.natW * scale);
  c.height = Math.round(state.natH * scale);
  c.getContext("2d").drawImage(state.img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

// ---------------------------------------------------------------------------
// Analyze via backend (Claude)
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
    initTryon(data);
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

  // Free search box seeded from the first item's keyword
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
// Try-on (client-side overlay)
// ---------------------------------------------------------------------------
const tryon = {
  canvas: null, ctx: null, scaleFactor: 1,
  garment: { type: "tshirt", x: 0, y: 0, scale: 1, opacity: 1, color: "#FF9E7A", baseW: 0 },
  uploaded: null,
  dragging: false, dragDX: 0, dragDY: 0,
  palette: [],
};

function initTryon(d) {
  if (!state.img) return;
  $("step-tryon").hidden = false;
  const canvas = $("tryon-canvas");
  tryon.canvas = canvas;
  tryon.ctx = canvas.getContext("2d");
  const maxW = 460;
  tryon.scaleFactor = Math.min(1, maxW / state.natW);
  canvas.width = state.natW * tryon.scaleFactor;
  canvas.height = state.natH * tryon.scaleFactor;

  tryon.palette = (d.personalColor && d.personalColor.palette && d.personalColor.palette.length)
    ? d.personalColor.palette
    : ["#FF9E7A", "#FFC15E", "#9BD770", "#7FD8D8", "#B7A7D9"];

  const g = tryon.garment;
  g.x = canvas.width / 2;
  g.y = canvas.height * 0.55;
  g.baseW = canvas.width * 0.62;
  g.color = tryon.palette[0];
  tryon.uploaded = null;

  renderGarmentPalette();
  drawTryon();
  bindTryonControls();
}

function renderGarmentPalette() {
  const wrap = $("garment-palette");
  if (!wrap) return;
  wrap.innerHTML = "";
  tryon.palette.forEach((hex) => {
    const d = document.createElement("div");
    d.className = "swatch" + (hex === tryon.garment.color ? " selected" : "");
    d.style.background = hex;
    d.addEventListener("click", () => { tryon.garment.color = hex; renderGarmentPalette(); drawTryon(); });
    wrap.appendChild(d);
  });
}

function drawTryon() {
  const { ctx, canvas } = tryon;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.img, 0, 0, canvas.width, canvas.height);
  drawGarment();
}

function drawGarment() {
  const { ctx } = tryon;
  const g = tryon.garment;
  ctx.save();
  ctx.globalAlpha = g.opacity;
  const w = g.baseW * g.scale;
  if (tryon.uploaded) {
    const ih = (tryon.uploaded.naturalHeight / tryon.uploaded.naturalWidth) * w;
    ctx.drawImage(tryon.uploaded, g.x - w / 2, g.y, w, ih);
  } else {
    drawGarmentShape(ctx, g.type, g.x, g.y, w, g.color);
  }
  ctx.restore();
}

function drawGarmentShape(ctx, type, cx, topY, w, color) {
  const cfg = {
    tshirt: { h: 1.15, sleeve: 0.28, sleeveLen: 0.30, flare: 0, open: false },
    knit: { h: 1.30, sleeve: 0.20, sleeveLen: 0.62, flare: 0.02, open: false },
    dress: { h: 1.95, sleeve: 0.26, sleeveLen: 0.28, flare: 0.35, open: false },
    coat: { h: 1.75, sleeve: 0.18, sleeveLen: 0.70, flare: 0.10, open: true },
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
  grad.addColorStop(0, "rgba(255,255,255,0.10)");
  grad.addColorStop(1, "rgba(0,0,0,0.12)");
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

function garmentBBox() {
  const g = tryon.garment;
  const w = g.baseW * g.scale;
  let h;
  if (tryon.uploaded) h = (tryon.uploaded.naturalHeight / tryon.uploaded.naturalWidth) * w;
  else h = w * ({ tshirt: 1.15, knit: 1.30, dress: 1.95, coat: 1.75 }[g.type] || 1.15);
  return { x: g.x - w / 2, y: g.y, w, h };
}

let controlsBound = false;
function bindTryonControls() {
  if (controlsBound) return;
  controlsBound = true;
  const canvas = tryon.canvas;

  $("garment-select").addEventListener("change", (e) => { tryon.garment.type = e.target.value; tryon.uploaded = null; drawTryon(); });
  $("garment-scale").addEventListener("input", (e) => { tryon.garment.scale = parseFloat(e.target.value); drawTryon(); });
  $("garment-opacity").addEventListener("input", (e) => { tryon.garment.opacity = parseFloat(e.target.value); drawTryon(); });

  $("garment-file").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => { tryon.uploaded = im; drawTryon(); URL.revokeObjectURL(url); };
    im.src = url;
  });

  $("export-btn").addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "tryon.png";
    link.href = tryon.canvas.toDataURL("image/png");
    link.click();
  });

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: px * (canvas.width / rect.width), y: py * (canvas.height / rect.height) };
  };
  const onDown = (e) => {
    const p = getPos(e);
    const b = garmentBBox();
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
      tryon.dragging = true;
      tryon.dragDX = p.x - tryon.garment.x;
      tryon.dragDY = p.y - tryon.garment.y;
      canvas.classList.add("grabbing");
    }
  };
  const onMove = (e) => {
    if (!tryon.dragging) return;
    e.preventDefault();
    const p = getPos(e);
    tryon.garment.x = p.x - tryon.dragDX;
    tryon.garment.y = p.y - tryon.dragDY;
    drawTryon();
  };
  const onUp = () => { tryon.dragging = false; canvas.classList.remove("grabbing"); };

  canvas.addEventListener("mousedown", onDown);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  canvas.addEventListener("touchstart", onDown, { passive: false });
  canvas.addEventListener("touchmove", onMove, { passive: false });
  canvas.addEventListener("touchend", onUp);
}

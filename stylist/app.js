import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs";

// ---------------------------------------------------------------------------
// Static data: seasons (personal color) and face types
// ---------------------------------------------------------------------------
const SEASONS = {
  spring: {
    label: "スプリング（イエベ春）",
    words: "明るく澄んだ暖色が得意。コーラル、ピーチ、ライトイエロー、若草グリーンなど、フレッシュで血色感のある色。",
    palette: ["#FF9E7A", "#FFC15E", "#F7E967", "#9BD770", "#7FD8D8", "#FF8FA3", "#FFB37A", "#FFF0B3"],
    query: "コーラル 明るい",
  },
  summer: {
    label: "サマー（ブルベ夏）",
    words: "やわらかく涼やかな寒色が得意。ラベンダー、ローズピンク、スカイブルー、グレイッシュな淡色が上品に映える。",
    palette: ["#B7A7D9", "#E59ABE", "#9EC5E8", "#A7D8D8", "#C8B6E2", "#F0B7C9", "#BFD3E6", "#E8DDEF"],
    query: "ラベンダー くすみピンク",
  },
  autumn: {
    label: "オータム（イエベ秋）",
    words: "深く落ち着いた暖色が得意。テラコッタ、マスタード、カーキ、ブラウンなど、こっくりしたアースカラー。",
    palette: ["#C8743C", "#D9A441", "#8A7A3C", "#6E7F4E", "#A65A3A", "#C99A6B", "#7A5230", "#E0C18A"],
    query: "テラコッタ ベージュ",
  },
  winter: {
    label: "ウィンター（ブルベ冬）",
    words: "鮮やかでコントラストの強い寒色が得意。ロイヤルブルー、ピュアホワイト、黒、マゼンタなど、シャープでクリアな色。",
    palette: ["#1F4E9B", "#111114", "#FFFFFF", "#C2185B", "#118AB2", "#7B2D8E", "#E0245E", "#0B6E4F"],
    query: "モノトーン ビビッド",
  },
};

const FACE_TYPES = {
  "キュート": { p: [0.85, 0.85], words: "丸み・ふんわり素材、短め丈、小さめ柄、淡色が似合う愛らしいタイプ。フリルや丸襟も◎。", query: "ガーリー 丸襟 ふんわり" },
  "アクティブキュート": { p: [0.85, 0.45], words: "子供寄りで華やか。元気でメリハリのある柄・色、カジュアルとガーリーのミックスが映える。", query: "カジュアル ポップ Tシャツ" },
  "フレッシュ": { p: [0.62, 0.20], words: "子供寄り×直線で爽やか。シンプル・カジュアル、ボーダーやシャツ、清潔感のある装いが得意。", query: "カジュアル シャツ シンプル" },
  "クールカジュアル": { p: [0.42, 0.20], words: "中間〜大人×直線。ほどよくシャープ。デニム、ジャケット、こなれたカジュアルがハマる。", query: "きれいめカジュアル ジャケット" },
  "クール": { p: [0.15, 0.20], words: "大人×直線でシャープ。直線的なシルエット、無地、モードやマニッシュが似合う。", query: "モード マニッシュ 無地" },
  "エレガント": { p: [0.15, 0.55], words: "大人×中間で華やか。曲線と直線のバランス型。きれいめで品のある華やかスタイルが得意。", query: "きれいめ 上品 ワンピース" },
  "ソフトエレガント": { p: [0.42, 0.70], words: "大人寄り×曲線でやわらか。とろみ素材、ニュアンスカラー、上品で柔らかな装いが映える。", query: "とろみ きれいめ 上品" },
  "フェミニン": { p: [0.20, 0.88], words: "大人×曲線で女性的。曲線シルエット、レース・花柄、ワンピースなど甘さのある装いが得意。", query: "フェミニン レース ワンピース" },
};

const ITEMS = ["トップス", "ニット", "ワンピース", "アウター", "スカート", "コーデ"];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  img: null,
  natW: 0,
  natH: 0,
  landmarks: null,
  measured: null,
  season: "spring",
  faceType: "フレッシュ",
  activeItem: "コーデ",
  garmentColor: null,
};

let faceLandmarker = null;

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const setStatus = (msg, isError = false) => {
  const el = $("status");
  el.textContent = msg || "";
  el.classList.toggle("error", !!isError);
};

// ---------------------------------------------------------------------------
// Upload handling
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
    setStatus("画像ファイルを選んでください。", true);
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
  img.onerror = () => { setStatus("画像を読み込めませんでした。", true); URL.revokeObjectURL(url); };
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
  fileInput.value = "";
  $("preview-wrap").hidden = true;
  ["step-result", "step-reco", "step-tryon"].forEach((id) => ($(id).hidden = true));
  setStatus("");
});

// ---------------------------------------------------------------------------
// Model loading (lazy)
// ---------------------------------------------------------------------------
async function ensureModel() {
  if (faceLandmarker) return faceLandmarker;
  setStatus("顔解析モデルを読み込み中…（初回のみ少し時間がかかります）");
  const resolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
  );
  const opts = {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    },
    runningMode: "IMAGE",
    numFaces: 1,
  };
  try {
    faceLandmarker = await FaceLandmarker.createFromOptions(resolver, { ...opts, baseOptions: { ...opts.baseOptions, delegate: "GPU" } });
  } catch (e) {
    faceLandmarker = await FaceLandmarker.createFromOptions(resolver, { ...opts, baseOptions: { ...opts.baseOptions, delegate: "CPU" } });
  }
  return faceLandmarker;
}

// ---------------------------------------------------------------------------
// Analyze
// ---------------------------------------------------------------------------
$("analyze-btn").addEventListener("click", analyze);

async function analyze() {
  if (!state.img) return;
  try {
    const model = await ensureModel();
    setStatus("顔を解析しています…");
    const res = model.detect(state.img);
    if (!res.faceLandmarks || res.faceLandmarks.length === 0) {
      setStatus("顔を検出できませんでした。正面・明るめ・輪郭が見える写真でお試しください。手動診断で進めることもできます。", true);
      state.landmarks = null;
    } else {
      state.landmarks = res.faceLandmarks[0];
      const m = measureFace(state.landmarks);
      state.measured = m;
      state.season = decideSeason(m);
      state.faceType = decideFaceType(m);
      setStatus("診断が完了しました。");
    }
    renderResults();
    initTryon();
  } catch (e) {
    console.error(e);
    setStatus("解析中にエラーが発生しました。ネットワーク（モデル読み込み）をご確認ください。手動診断は利用できます。", true);
    renderResults();
    initTryon();
  }
}

// ---------------------------------------------------------------------------
// Color sampling
// ---------------------------------------------------------------------------
function getNaturalPixels() {
  const c = document.createElement("canvas");
  c.width = state.natW;
  c.height = state.natH;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(state.img, 0, 0);
  return ctx.getImageData(0, 0, state.natW, state.natH);
}

function sampleColor(px, cx, cy, r) {
  let rs = 0, gs = 0, bs = 0, n = 0;
  const x0 = Math.max(0, Math.round(cx - r));
  const x1 = Math.min(px.width - 1, Math.round(cx + r));
  const y0 = Math.max(0, Math.round(cy - r));
  const y1 = Math.min(px.height - 1, Math.round(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * px.width + x) * 4;
      if (px.data[i + 3] < 200) continue;
      rs += px.data[i]; gs += px.data[i + 1]; bs += px.data[i + 2]; n++;
    }
  }
  if (n === 0) return null;
  return { r: rs / n, g: gs / n, b: bs / n };
}

function avgColors(list) {
  const valid = list.filter(Boolean);
  if (valid.length === 0) return null;
  const s = valid.reduce((a, c) => ({ r: a.r + c.r, g: a.g + c.g, b: a.b + c.b }), { r: 0, g: 0, b: 0 });
  return { r: s.r / valid.length, g: s.g / valid.length, b: s.b / valid.length };
}

function rgb2hsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

const toHex = ({ r, g, b }) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

// ---------------------------------------------------------------------------
// Landmark indices (MediaPipe FaceMesh)
// ---------------------------------------------------------------------------
const LM = {
  top: 10, chin: 152, cheekL: 234, cheekR: 454,
  skin: [50, 280, 151, 9, 108, 337],
  lips: [17, 84, 314],
  irisR: 468, irisL: 473,
  eyeRout: 33, eyeRin: 133, eyeLout: 263, eyeLin: 362,
  jawL: 172, jawR: 397,
  noseBase: 2, browMid: 9,
};

function pt(landmarks, i) {
  const p = landmarks[i];
  return { x: p.x * state.natW, y: p.y * state.natH };
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ---------------------------------------------------------------------------
// Measure face: produces colors + geometric ratios
// ---------------------------------------------------------------------------
function measureFace(lm) {
  const px = getNaturalPixels();
  const faceW = dist(pt(lm, LM.cheekL), pt(lm, LM.cheekR));
  const faceH = dist(pt(lm, LM.top), pt(lm, LM.chin));
  const sampleR = Math.max(2, faceW * 0.02);

  const skin = avgColors(LM.skin.map((i) => { const p = pt(lm, i); return sampleColor(px, p.x, p.y, sampleR); }));
  const lip = avgColors(LM.lips.map((i) => { const p = pt(lm, i); return sampleColor(px, p.x, p.y, sampleR * 0.7); }));
  const iris = avgColors([LM.irisR, LM.irisL].map((i) => { const p = pt(lm, i); return sampleColor(px, p.x, p.y, sampleR * 0.5); }));

  // Hair: band above forehead top
  const top = pt(lm, LM.top);
  const hair = avgColors([-0.06, -0.09, -0.12].map((dy) =>
    sampleColor(px, top.x, top.y + faceH * dy, sampleR * 1.5)
  ));

  // Geometry
  const ratio = faceH / faceW;
  const eyeW = (dist(pt(lm, LM.eyeRout), pt(lm, LM.eyeRin)) + dist(pt(lm, LM.eyeLout), pt(lm, LM.eyeLin))) / 2;
  const eyeRatio = eyeW / faceW;
  const jawW = dist(pt(lm, LM.jawL), pt(lm, LM.jawR));
  const jawRatio = jawW / faceW;
  const lowerFace = dist(pt(lm, LM.noseBase), pt(lm, LM.chin)) / faceH;

  return { skin, lip, iris, hair, ratio, eyeRatio, jawRatio, lowerFace, faceW, faceH };
}

// ---------------------------------------------------------------------------
// Personal color decision
// ---------------------------------------------------------------------------
function decideSeason(m) {
  const skin = m.skin || { r: 230, g: 200, b: 185 };
  const skinHsl = rgb2hsl(skin);
  const hairHsl = m.hair ? rgb2hsl(m.hair) : { l: 0.25, s: 0.3 };
  const irisHsl = m.iris ? rgb2hsl(m.iris) : { l: 0.3 };
  const lipHsl = m.lip ? rgb2hsl(m.lip) : skinHsl;

  // Warmth: skin undertone (R-B) + lip hue
  let warmth = (skin.r - skin.b) / 255; // >0 warm
  if (m.lip) {
    const lh = lipHsl.h;
    if (lh < 50 || lh > 330) warmth += 0.08; // coral / warm
    else if (lh >= 280 && lh <= 330) warmth -= 0.08; // rose / cool
  }

  // Depth: darker hair/skin/eye => deeper
  const depth = 0.45 * (1 - hairHsl.l) + 0.35 * (1 - skinHsl.l) + 0.20 * (1 - irisHsl.l);
  const warm = warmth > 0.02;
  const deep = depth > 0.52;

  let season;
  if (warm && !deep) season = "spring";
  else if (warm && deep) season = "autumn";
  else if (!warm && !deep) season = "summer";
  else season = "winter";

  m._warmth = warmth;
  m._depth = depth;
  return season;
}

// ---------------------------------------------------------------------------
// Face type decision
// ---------------------------------------------------------------------------
function decideFaceType(m) {
  // childScore: round + big eyes + short lower face => childish
  const childFromRatio = clamp01((1.45 - m.ratio) / 0.35 + 0.5);
  const childFromEyes = clamp01((m.eyeRatio - 0.17) / 0.07 + 0.5);
  const childFromLower = clamp01((0.50 - m.lowerFace) / 0.12 + 0.5);
  const child = clamp01(0.45 * childFromRatio + 0.35 * childFromEyes + 0.20 * childFromLower);

  // curveScore: narrow tapered jaw + rounder face => curvy
  const curveFromJaw = clamp01((0.80 - m.jawRatio) / 0.18 + 0.5);
  const curveFromRound = clamp01((1.45 - m.ratio) / 0.40 + 0.4);
  const curve = clamp01(0.6 * curveFromJaw + 0.4 * curveFromRound);

  m._child = child;
  m._curve = curve;

  // nearest prototype
  let best = null, bestD = Infinity;
  for (const [name, info] of Object.entries(FACE_TYPES)) {
    const d = Math.hypot(child - info.p[0], curve - info.p[1]);
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------------------
// Render results
// ---------------------------------------------------------------------------
function renderResults() {
  $("step-result").hidden = false;
  $("step-reco").hidden = false;
  $("step-tryon").hidden = false;

  $("season-select").value = state.season;
  buildFaceTypeSelect();
  $("facetype-select").value = state.faceType;

  renderSeason();
  renderFaceType();
  renderMeasured();
  renderReco();
}

function buildFaceTypeSelect() {
  const sel = $("facetype-select");
  if (sel.options.length) return;
  Object.keys(FACE_TYPES).forEach((name) => {
    const o = document.createElement("option");
    o.value = name; o.textContent = name;
    sel.appendChild(o);
  });
}

function renderSeason() {
  const s = SEASONS[state.season];
  $("season-name").textContent = s.label;
  $("season-words").textContent = s.words;
  const pal = $("season-palette");
  pal.innerHTML = "";
  s.palette.forEach((hex) => {
    const d = document.createElement("div");
    d.className = "swatch";
    d.style.background = hex;
    d.title = hex;
    pal.appendChild(d);
  });
}

function renderFaceType() {
  const t = FACE_TYPES[state.faceType];
  $("facetype-name").textContent = state.faceType;
  $("facetype-words").textContent = t.words;
  if (state.measured) {
    const c = Math.round(state.measured._child * 100);
    const v = Math.round(state.measured._curve * 100);
    $("facetype-axis").textContent = `子供度 ${c}% / 曲線度 ${v}%`;
  } else {
    $("facetype-axis").textContent = "（手動選択）";
  }
}

function renderMeasured() {
  const body = $("measured-body");
  if (!state.measured) { body.textContent = "顔を検出していないため測定値はありません（手動診断中）。"; return; }
  const m = state.measured;
  const colorRow = (label, c) =>
    c ? `<tr><td>${label}</td><td>${toHex(c)}<span class="mini-swatch" style="background:${toHex(c)}"></span></td></tr>`
      : `<tr><td>${label}</td><td>—</td></tr>`;
  body.innerHTML = `<table>
    ${colorRow("肌", m.skin)}
    ${colorRow("髪", m.hair)}
    ${colorRow("瞳", m.iris)}
    ${colorRow("唇", m.lip)}
    <tr><td>暖寒（&gt;0で暖色）</td><td>${m._warmth.toFixed(3)}</td></tr>
    <tr><td>明暗（大きいほど深い）</td><td>${m._depth.toFixed(3)}</td></tr>
    <tr><td>顔の縦横比</td><td>${m.ratio.toFixed(3)}</td></tr>
    <tr><td>目の大きさ比</td><td>${m.eyeRatio.toFixed(3)}</td></tr>
    <tr><td>あご幅比</td><td>${m.jawRatio.toFixed(3)}</td></tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// Recommendations + search
// ---------------------------------------------------------------------------
function renderReco() {
  const s = SEASONS[state.season];
  const t = FACE_TYPES[state.faceType];
  $("reco-text").textContent =
    `「${state.faceType}」タイプ × 「${s.label}」。${t.words} カラーは${s.words}`;
  renderChips();
  updateSearch();
}

function renderChips() {
  const wrap = $("item-chips");
  wrap.innerHTML = "";
  ITEMS.forEach((item) => {
    const c = document.createElement("button");
    c.className = "chip" + (item === state.activeItem ? " active" : "");
    c.textContent = item;
    c.addEventListener("click", () => { state.activeItem = item; renderChips(); updateSearch(); });
    wrap.appendChild(c);
  });
}

function buildQuery() {
  const s = SEASONS[state.season];
  const t = FACE_TYPES[state.faceType];
  return `${s.query} ${t.query} ${state.activeItem}`.replace(/\s+/g, " ").trim();
}

function updateSearch() {
  const q = buildQuery();
  $("search-query").value = q;
  applySearchLinks(q);
}

function applySearchLinks(q) {
  const enc = encodeURIComponent(q);
  $("btn-rakuten").href = `https://search.rakuten.co.jp/search/mall/${enc}/`;
  $("btn-amazon").href = `https://www.amazon.co.jp/s?k=${enc}`;
  $("btn-google").href = `https://www.google.com/search?tbm=isch&q=${enc}`;
}

$("search-query").addEventListener("input", (e) => applySearchLinks(e.target.value));
$("season-select").addEventListener("change", (e) => {
  state.season = e.target.value;
  renderSeason(); renderReco(); renderGarmentPalette();
});
$("facetype-select").addEventListener("change", (e) => {
  state.faceType = e.target.value;
  renderFaceType(); renderReco();
});

// ---------------------------------------------------------------------------
// Try-on (overlay)
// ---------------------------------------------------------------------------
const tryon = {
  canvas: null, ctx: null, scaleFactor: 1,
  garment: { type: "tshirt", x: 0, y: 0, scale: 1, opacity: 1, color: "#FF9E7A" },
  uploaded: null,
  dragging: false, dragDX: 0, dragDY: 0,
  front: true,
};

function initTryon() {
  if (!state.img) return;
  const canvas = $("tryon-canvas");
  tryon.canvas = canvas;
  tryon.ctx = canvas.getContext("2d");
  const maxW = 460;
  tryon.scaleFactor = Math.min(1, maxW / state.natW);
  canvas.width = state.natW * tryon.scaleFactor;
  canvas.height = state.natH * tryon.scaleFactor;

  // initial garment placement: below chin if we have landmarks, else center
  const g = tryon.garment;
  if (state.landmarks) {
    const chin = pt(state.landmarks, LM.chin);
    const faceW = state.measured.faceW;
    g.x = chin.x * tryon.scaleFactor;
    g.y = (chin.y + faceW * 0.25) * tryon.scaleFactor;
    g.baseW = faceW * 1.9 * tryon.scaleFactor;
  } else {
    g.x = canvas.width / 2;
    g.y = canvas.height * 0.5;
    g.baseW = canvas.width * 0.6;
  }
  g.color = SEASONS[state.season].palette[0];
  state.garmentColor = g.color;

  renderGarmentPalette();
  drawTryon();
  bindTryonControls();
}

function renderGarmentPalette() {
  const wrap = $("garment-palette");
  if (!wrap) return;
  wrap.innerHTML = "";
  SEASONS[state.season].palette.forEach((hex) => {
    const d = document.createElement("div");
    d.className = "swatch" + (hex === tryon.garment.color ? " selected" : "");
    d.style.background = hex;
    d.addEventListener("click", () => {
      tryon.garment.color = hex;
      renderGarmentPalette();
      drawTryon();
    });
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
    const ih = tryon.uploaded.naturalHeight / tryon.uploaded.naturalWidth * w;
    ctx.drawImage(tryon.uploaded, g.x - w / 2, g.y, w, ih);
  } else {
    drawGarmentShape(ctx, g.type, g.x, g.y, w, g.color);
  }
  ctx.restore();
}

// Draw a stylized garment silhouette. Origin = shoulder center top.
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

  // subtle shading on one side
  ctx.save();
  ctx.clip();
  const grad = ctx.createLinearGradient(left, topY, right, bottomY);
  grad.addColorStop(0, "rgba(255,255,255,0.10)");
  grad.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = grad;
  ctx.fillRect(left - sleeveW, topY, w + sleeveW * 2, h);
  ctx.restore();

  // open-front line for coat
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
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clampByte(r + r * amt); g = clampByte(g + g * amt); b = clampByte(b + b * amt);
  return toHex({ r, g, b });
}
const clampByte = (v) => Math.max(0, Math.min(255, v));

function garmentBBox() {
  const g = tryon.garment;
  const w = g.baseW * g.scale;
  let h;
  if (tryon.uploaded) h = tryon.uploaded.naturalHeight / tryon.uploaded.naturalWidth * w;
  else {
    const cfgH = { tshirt: 1.15, knit: 1.30, dress: 1.95, coat: 1.75 }[g.type] || 1.15;
    h = w * cfgH;
  }
  return { x: g.x - w / 2, y: g.y, w, h };
}

let controlsBound = false;
function bindTryonControls() {
  if (controlsBound) return;
  controlsBound = true;
  const canvas = tryon.canvas;

  $("garment-select").addEventListener("change", (e) => {
    tryon.garment.type = e.target.value;
    tryon.uploaded = null;
    drawTryon();
  });
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

  $("garment-front").addEventListener("click", drawTryon);
  $("export-btn").addEventListener("click", exportImage);

  // Drag
  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: cx * (canvas.width / rect.width), y: cy * (canvas.height / rect.height) };
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

function exportImage() {
  const link = document.createElement("a");
  link.download = "tryon.png";
  link.href = tryon.canvas.toDataURL("image/png");
  link.click();
}

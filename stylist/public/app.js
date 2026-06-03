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
    renderResults(data); renderReco(data); initDomoAI(data);
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
// DomoAI handoff (Step 4)
// ---------------------------------------------------------------------------
const SEASON_EN = {
  spring: "warm bright spring palette: coral, peach, light yellow, fresh green, ivory, golden undertone",
  summer: "soft cool summer palette: lavender, dusty rose, sky blue, mauve, muted pastel tones, cool undertone",
  autumn: "deep warm autumn palette: terracotta, mustard yellow, olive, camel, rich brown, golden undertone",
  winter: "vivid cool winter palette: royal blue, pure white, magenta, jet black, high contrast, cool undertone",
};
const SEASON_JA = {
  spring: "イエベ春の明るく澄んだ暖色（コーラル、ピーチ、ライトイエロー、若草色）",
  summer: "ブルベ夏のやわらかく涼やかな寒色（ラベンダー、ローズ、スカイブルー、くすみ色）",
  autumn: "イエベ秋の深く落ち着いた暖色（テラコッタ、マスタード、カーキ、ブラウン）",
  winter: "ブルベ冬の鮮やかでコントラストの強い寒色（ロイヤルブルー、純白、黒、マゼンタ）",
};
const FACETYPE_EN = {
  "キュート": "cute youthful aesthetic, soft rounded features, sweet kawaii vibe",
  "アクティブキュート": "energetic playful sporty cute, bright fresh look",
  "フレッシュ": "fresh casual clean-cut natural look",
  "クールカジュアル": "cool casual aesthetic, slightly sharp clean lines",
  "クール": "cool sharp mannish chic, confident sophisticated",
  "エレガント": "elegant balanced sophisticated refined feminine",
  "ソフトエレガント": "soft elegant gentle refined feminine grace",
  "フェミニン": "feminine sweet womanly graceful romantic",
};
const FACETYPE_JA = {
  "キュート": "キュート系の甘くて可愛らしい雰囲気",
  "アクティブキュート": "アクティブで元気な可愛らしさ",
  "フレッシュ": "フレッシュで爽やかカジュアル",
  "クールカジュアル": "クールカジュアルできれいめ",
  "クール": "クールでシャープなマニッシュ",
  "エレガント": "エレガントで洗練された雰囲気",
  "ソフトエレガント": "ソフトエレガントで上品な雰囲気",
  "フェミニン": "フェミニンで甘く女性的",
};

const domo = { lang: "en", diagnosis: null };

function initDomoAI(d) {
  $("step-tryon").hidden = false;
  domo.diagnosis = d;
  updatePromptText();

  bindDomoControls();
}

function buildPrompt(d, lang) {
  const season = d.personalColor?.season || "spring";
  const ft = d.faceType?.type || "ソフトエレガント";
  const items = (d.recommendation?.items || [])
    .map((i) => i.searchKeyword || i.category)
    .filter(Boolean);

  if (lang === "ja") {
    const itemsJa = items.length ? items.join("、") : "似合うコーデ";
    return [
      `この人物が${itemsJa}を着ているファッション雑誌風の全身写真。`,
      `配色: ${SEASON_JA[season]}。`,
      `雰囲気: ${FACETYPE_JA[ft]}。`,
      `スタジオ照明、白背景、雑誌エディトリアル風、高解像度、リアル。`,
    ].join("\n");
  }

  const itemsEn = items.length ? items.join(", ") : "stylish coordinated outfit";
  return [
    `Full body fashion magazine photo of this person wearing ${itemsEn}.`,
    `Color palette: ${SEASON_EN[season]}.`,
    `Overall aesthetic: ${FACETYPE_EN[ft]}.`,
    `Studio lighting, clean white background, editorial style, high resolution, photorealistic.`,
  ].join("\n");
}

function updatePromptText() {
  if (!domo.diagnosis) return;
  $("domoai-prompt").value = buildPrompt(domo.diagnosis, domo.lang);
}

function downloadOriginalPhoto() {
  if (!state.img) return;
  const c = document.createElement("canvas");
  c.width = state.natW; c.height = state.natH;
  c.getContext("2d").drawImage(state.img, 0, 0);
  c.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "stylist-photo.jpg"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/jpeg", 0.95);
}

async function copyPrompt() {
  const txt = $("domoai-prompt").value;
  const status = $("copy-status");
  try {
    await navigator.clipboard.writeText(txt);
    status.textContent = "コピーしました ✓";
  } catch {
    $("domoai-prompt").select();
    document.execCommand("copy");
    status.textContent = "コピーしました ✓";
  }
  status.style.opacity = "1";
  setTimeout(() => (status.style.opacity = "0"), 1800);
}

let domoBound = false;
function bindDomoControls() {
  if (domoBound) return;
  domoBound = true;
  $("download-photo-btn").addEventListener("click", downloadOriginalPhoto);
  $("copy-prompt-btn").addEventListener("click", copyPrompt);
  $("lang-en").addEventListener("click", () => { domo.lang = "en"; toggleLang(); updatePromptText(); });
  $("lang-ja").addEventListener("click", () => { domo.lang = "ja"; toggleLang(); updatePromptText(); });
}

function toggleLang() {
  $("lang-en").classList.toggle("active", domo.lang === "en");
  $("lang-ja").classList.toggle("active", domo.lang === "ja");
}

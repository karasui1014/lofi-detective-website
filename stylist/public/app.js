const UNDERTONE_JP = { warm: "イエベ（黄み寄り）", cool: "ブルベ（青み寄り）", neutral: "ニュートラル" };
const CONF_JP = { high: "確信度 高", medium: "確信度 中", low: "確信度 低" };

const state = { img: null, natW: 0, natH: 0, diagnosis: null };
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// User preferences (selected before analysis)
// ---------------------------------------------------------------------------
const userPrefs = { style: ["kireime"], age: "20s", scene: ["daily"] };

const STYLE_EN = {
  casual: "casual everyday style", kireime: "clean sophisticated style",
  feminine: "feminine romantic style", natural: "natural relaxed style",
  trend: "trendy fashion-forward style", street: "street fashion urban style",
};
const STYLE_JA = {
  casual: "カジュアルな日常スタイル", kireime: "きれいめで上品なスタイル",
  feminine: "フェミニンでロマンティックなスタイル", natural: "ナチュラルでリラックスしたスタイル",
  trend: "トレンド感のあるスタイル", street: "ストリートファッション系スタイル",
};
const SCENE_EN = {
  daily: "everyday casual", office: "office work setting", date: "date outfit",
  outing: "going out", party: "party event",
};
const SCENE_JA = {
  daily: "普段着・日常シーン", office: "オフィス・仕事シーン", date: "デートシーン",
  outing: "お出かけシーン", party: "パーティーシーン",
};
const AGE_EN = { "10s": "teenage", "20s": "20s", "30s": "30s", "40s": "40s and up" };
const AGE_JA = { "10s": "10代", "20s": "20代", "30s": "30代", "40s": "40代以上" };

document.querySelectorAll(".pref-tags").forEach((group) => {
  const isSingle = group.dataset.single === "true";
  const key = group.dataset.pref;
  group.addEventListener("click", (e) => {
    const tag = e.target.closest(".pref-tag");
    if (!tag) return;
    const val = tag.dataset.v;
    if (isSingle) {
      userPrefs[key] = val;
      group.querySelectorAll(".pref-tag").forEach((t) => t.classList.toggle("active", t === tag));
    } else {
      tag.classList.toggle("active");
      userPrefs[key] = [...group.querySelectorAll(".pref-tag.active")].map((t) => t.dataset.v);
    }
    shopFilter.age = userPrefs.age;
    if (domo.diagnosis) updatePromptText();
  });
});

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
  ["step-result", "step-tryon", "step-extract"].forEach((id) => { const el = $(id); if (el) el.hidden = true; });
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
    renderResults(data); initDomoAI(data); initExtractSection();
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
  const reasoning = ft.reasoning || "";
  $("facetype-words").textContent = reasoning.length > 200 ? reasoning.slice(0, 200) + "…" : reasoning;
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

// パーソナルカラーシーズンのECサイト向けタグ
const SEASON_LABEL = { spring: "イエベ春", summer: "ブルベ夏", autumn: "イエベ秋", winter: "ブルベ冬" };
// 以下のショップはパーソナルカラータグを商品に付けない傾向があるため、シーズン語を付加しない
const NO_SEASON_SHOPS = new Set(["uniqlo", "wear"]);

// 常に確実に動く大手プラットフォーム
const CORE_SHOPS = [
  { id: "zozo",    name: "ZOZOTOWN",
    url: (q) => `https://zozo.jp/search/?p_keyv=${encodeURIComponent(q + " レディース")}` },
  { id: "rakuten", name: "楽天ファッション",
    url: (q) => `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(q + " レディース")}/216879/` },
  { id: "gshop",   name: "Googleショッピング",
    url: (q) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q + " レディース")}` },
  { id: "amazon",  name: "Amazon",
    url: (q) => `https://www.amazon.co.jp/s?k=${encodeURIComponent(q + " レディース")}` },
  { id: "yahoo",   name: "Yahoo!ショッピング",
    url: (q) => `https://shopping.yahoo.co.jp/search?p=${encodeURIComponent(q + " レディース")}` },
  { id: "uniqlo",  name: "UNIQLO",
    url: (q) => `https://www.uniqlo.com/jp/ja/search?q=${encodeURIComponent(q)}` },
  { id: "mercari", name: "メルカリ",
    url: (q) => `https://jp.mercari.com/search?keyword=${encodeURIComponent(q + " レディース")}` },
  { id: "wear",    name: "WEAR",
    url: (q) => `https://wear.jp/search/coordinate/?q=${encodeURIComponent(q)}` },
];

// 年代×テイスト別ブランド候補（ZOZOTOWNで「ブランド名 キーワード」検索）
const BRAND_HINTS = [
  // 10代
  { name: "GU",           age: ["10s","20s"], style: ["casual","trend","feminine","natural"] },
  { name: "GRL",          age: ["10s","20s"], style: ["trend","feminine","casual","street"] },
  { name: "Kastane",      age: ["10s","20s"], style: ["casual","natural","feminine"] },
  { name: "earth music",  age: ["10s","20s","30s"], style: ["casual","natural","feminine"] },
  // 20代
  { name: "ungrid",       age: ["20s"],       style: ["trend","kireime","casual"] },
  { name: "Mila Owen",    age: ["20s","30s"], style: ["kireime","feminine","trend"] },
  { name: "JILL STUART",  age: ["20s","30s"], style: ["feminine","kireime"] },
  { name: "ROPE PICNIC",  age: ["20s","30s"], style: ["casual","kireime","natural"] },
  { name: "BEAMS",        age: ["20s","30s"], style: ["kireime","trend","casual","street"] },
  { name: "nano universe",age: ["20s","30s"], style: ["kireime","trend"] },
  { name: "SNIDEL",       age: ["20s","30s"], style: ["feminine","trend","kireime"] },
  { name: "Adam et Rope", age: ["20s","30s"], style: ["kireime","casual","natural"] },
  // 30代
  { name: "UNITED ARROWS",age: ["20s","30s","40s"], style: ["kireime","otona","casual"] },
  { name: "Plage",        age: ["30s","40s"], style: ["kireime","otona","natural"] },
  { name: "IENA",         age: ["30s","40s"], style: ["kireime","feminine","otona"] },
  { name: "TOMORROWLAND", age: ["30s","40s"], style: ["kireime","otona"] },
  { name: "Spick and Span",age: ["30s","40s"],style: ["kireime","casual","natural"] },
  // 40代
  { name: "Theory",       age: ["30s","40s"], style: ["otona","kireime"] },
  { name: "23区",         age: ["40s"],       style: ["otona","kireime"] },
  { name: "UNTITLED",     age: ["40s"],       style: ["otona","kireime"] },
  { name: "INDIVI",       age: ["40s"],       style: ["otona","kireime","feminine"] },
  { name: "ef-de",        age: ["40s"],       style: ["otona","feminine"] },
  { name: "組曲",         age: ["40s"],       style: ["otona","feminine","kireime"] },
];

const shopFilter = { age: "20s" };

// アイテムキーワードにパーソナルカラーシーズンを付加する（ECサイトの商品タイトルに多いため精度向上）
function enrichKeyword(rawQ, shopId) {
  if (NO_SEASON_SHOPS.has(shopId)) return rawQ;
  const season = state.diagnosis?.personalColor?.season;
  const label = season ? SEASON_LABEL[season] : "";
  return label ? `${label} ${rawQ}` : rawQ;
}

function selectShops(age) {
  // 年代に合うブランドを最大3つ選び、ZOZOでのブランド検索リンクを追加
  // テイストは画像から既に確定しているため絞り込まない
  const ageForBrand = age === "40s" ? ["40s"] : [age];
  const brandShops = BRAND_HINTS
    .filter((b) => b.age.some((a) => ageForBrand.includes(a)))
    .slice(0, 3)
    .map((b) => ({
      id: "brand",
      name: b.name,
      url: (q) => `https://zozo.jp/search/?p_keyv=${encodeURIComponent(b.name + " " + q + " レディース")}`,
    }));

  return [...CORE_SHOPS, ...brandShops];
}

function shopButton(label, href, recommended = false) {
  const a = document.createElement("a");
  a.className = "btn btn-shop" + (recommended ? " btn-shop-rec" : "");
  a.target = "_blank"; a.rel = "noopener";
  a.textContent = label; a.href = href;
  return a;
}

// UNIQLO / WEAR / Mercari など短いキーワードを好むショップ
const SHORT_KW_SHOPS = new Set(["uniqlo", "wear", "mercari"]);

// バウンディングボックスからサムネイルを切り抜く
function cropItemThumbnail(bb) {
  if (!bb || !extract.img) return null;
  const { x, y, w, h } = bb;
  if (!w || !h || w <= 0.02 || h <= 0.02) return null;
  const imgW = extract.natW;
  const imgH = extract.natH;
  const px = Math.max(0, Math.round(x * imgW));
  const py = Math.max(0, Math.round(y * imgH));
  const pw = Math.min(imgW - px, Math.round(w * imgW));
  const ph = Math.min(imgH - py, Math.round(h * imgH));
  if (pw < 20 || ph < 20) return null;
  const c = document.createElement("canvas");
  c.width = pw; c.height = ph;
  c.getContext("2d").drawImage(extract.img, px, py, pw, ph, 0, 0, pw, ph);
  return c.toDataURL("image/jpeg", 0.82);
}

// ---------------------------------------------------------------------------
// DomoAI handoff (Step 3)
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

const domo = { lang: "ja", diagnosis: null };

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

  const styleDescs = userPrefs.style.map((s) => lang === "ja" ? STYLE_JA[s] : STYLE_EN[s]).filter(Boolean);
  const sceneDescs = userPrefs.scene.map((s) => lang === "ja" ? SCENE_JA[s] : SCENE_EN[s]).filter(Boolean);
  const agePart = lang === "ja" ? AGE_JA[userPrefs.age] : AGE_EN[userPrefs.age];

  if (lang === "ja") {
    const itemsJa = items.length ? items.join("、") : "似合うコーデ";
    const stylePart = styleDescs.length ? `（${styleDescs.join("・")}）` : "";
    const sceneLine = sceneDescs.length ? `シーン: ${sceneDescs.join("・")}。` : "";
    return [
      `この人物が${itemsJa}${stylePart}を着ているファッション雑誌風の全身写真。`,
      `年代: ${agePart}向けスタイル。`,
      sceneLine,
      `配色: ${SEASON_JA[season]}。`,
      `雰囲気: ${FACETYPE_JA[ft]}。`,
      `スタジオ照明、白背景、雑誌エディトリアル風、高解像度、リアル。`,
    ].filter(Boolean).join("\n");
  }

  const itemsEn = items.length ? items.join(", ") : "stylish coordinated outfit";
  const stylePart = styleDescs.length ? `, ${styleDescs.join(", ")}` : "";
  const sceneLine = sceneDescs.length ? `Occasion: ${sceneDescs.join(", ")}.` : "";
  return [
    `Full body fashion magazine photo of this person wearing ${itemsEn}${stylePart}.`,
    `Target age group: ${agePart}.`,
    sceneLine,
    `Color palette: ${SEASON_EN[season]}.`,
    `Overall aesthetic: ${FACETYPE_EN[ft]}.`,
    `Studio lighting, clean white background, editorial style, high resolution, photorealistic.`,
  ].filter(Boolean).join("\n");
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

// ---------------------------------------------------------------------------
// Step 5: Reverse outfit search from generated image
// ---------------------------------------------------------------------------
const extract = { img: null, natW: 0, natH: 0, bound: false };

function setExtractStatus(msg, { error = false, loading = false } = {}) {
  const el = $("extract-status");
  el.innerHTML = "";
  el.classList.toggle("error", error);
  if (loading) {
    const sp = document.createElement("span");
    sp.className = "spinner";
    el.appendChild(sp);
  }
  if (msg) el.appendChild(document.createTextNode(msg));
}

function loadExtractFile(file) {
  if (!file.type.startsWith("image/")) {
    setExtractStatus("画像ファイルを選んでください。", { error: true });
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    extract.img = img; extract.natW = img.naturalWidth; extract.natH = img.naturalHeight;
    const canvas = $("extract-preview-canvas");
    const maxW = 520;
    const scale = Math.min(1, maxW / extract.natW);
    canvas.width = extract.natW * scale; canvas.height = extract.natH * scale;
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    $("extract-preview-wrap").hidden = false;
    setExtractStatus("");
    URL.revokeObjectURL(url);
  };
  img.onerror = () => { setExtractStatus("画像を読み込めませんでした。", { error: true }); URL.revokeObjectURL(url); };
  img.src = url;
}

function toExtractJpeg(maxEdge = 1024, quality = 0.9) {
  const scale = Math.min(1, maxEdge / Math.max(extract.natW, extract.natH));
  const c = document.createElement("canvas");
  c.width = Math.round(extract.natW * scale); c.height = Math.round(extract.natH * scale);
  c.getContext("2d").drawImage(extract.img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

async function analyzeExtract() {
  if (!extract.img) return;
  const btn = $("extract-analyze-btn");
  btn.disabled = true;
  setExtractStatus("画像から服を識別しています…", { loading: true });
  try {
    const dataUrl = toExtractJpeg();
    const imageBase64 = dataUrl.split(",", 2)[1];
    const resp = await fetch("/api/extract-outfit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mediaType: "image/jpeg" }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || `サーバーエラー (HTTP ${resp.status})`);
    renderExtractedItems(data.items || []);
    setExtractStatus(`${(data.items || []).length}件のアイテムを抽出しました。`);
  } catch (e) {
    console.error(e);
    setExtractStatus(`抽出に失敗しました: ${e.message}`, { error: true });
  } finally { btn.disabled = false; }
}

// Cached items so filter changes can re-render without re-calling the API.
let extractedItems = [];

function renderExtractedItems(items) {
  extractedItems = items || [];
  const wrap = $("extract-items");
  wrap.innerHTML = "";
  if (!extractedItems.length) {
    const p = document.createElement("p");
    p.className = "result-desc";
    p.textContent = "アイテムを抽出できませんでした。別の画像で試してください。";
    wrap.appendChild(p);
    $("shop-filters").hidden = true;
    return;
  }
  $("shop-filters").hidden = false;
  const shops = selectShops(shopFilter.age);

  extractedItems.forEach((item) => {
    const box = document.createElement("div"); box.className = "reco-item";

    // サムネイル（バウンディングボックスがあれば切り抜き表示）
    if (item.boundingBox) {
      const thumbData = cropItemThumbnail(item.boundingBox);
      if (thumbData) {
        const thumb = document.createElement("img");
        thumb.className = "item-thumb";
        thumb.src = thumbData;
        thumb.alt = item.category || "アイテム";
        box.appendChild(thumb);
      }
    }

    // コンテンツ部分
    const content = document.createElement("div"); content.className = "reco-item-content";

    const cat = document.createElement("div"); cat.className = "reco-item-cat";
    cat.textContent = item.category || "アイテム";
    content.appendChild(cat);

    const details = [item.color, item.material, item.silhouette].filter(Boolean).join(" / ");
    if (details) {
      const advice = document.createElement("div"); advice.className = "reco-item-advice";
      advice.textContent = details;
      content.appendChild(advice);
    }

    // コピーできるキーワードチップ
    const rawQ = item.searchKeyword || item.category || "";
    const kwBar = document.createElement("div"); kwBar.className = "item-keyword-bar";
    const kwText = document.createElement("span"); kwText.className = "kw-text";
    kwText.textContent = rawQ;
    const copyBtn = document.createElement("button"); copyBtn.className = "copy-kw-btn";
    copyBtn.textContent = "コピー";
    copyBtn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(rawQ); } catch { /* noop */ }
      copyBtn.textContent = "コピー済✓";
      setTimeout(() => (copyBtn.textContent = "コピー"), 1600);
    });
    kwBar.appendChild(kwText); kwBar.appendChild(copyBtn);
    content.appendChild(kwBar);

    // ショップボタン（おすすめは強調表示）
    const btns = document.createElement("div"); btns.className = "search-btns";
    shops.forEach((s) => {
      const baseQ = SHORT_KW_SHOPS.has(s.id)
        ? (item.searchKeywordShort || rawQ)
        : rawQ;
      const q = enrichKeyword(baseQ, s.id || "");
      const isRec = s.id === "gshop" || s.id === "zozo";
      btns.appendChild(shopButton(s.name, s.url(q), isRec));
    });
    content.appendChild(btns);

    box.appendChild(content);
    wrap.appendChild(box);
  });
}

function initExtractSection() {
  $("step-extract").hidden = false;
  // 年代フィルターをユーザー設定と同期
  shopFilter.age = userPrefs.age;
  const ageGroup = document.querySelector('.filter-btns[data-group="age"]');
  if (ageGroup) ageGroup.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.v === shopFilter.age));

  if (extract.bound) return;
  extract.bound = true;

  const fi = $("extract-file");
  const dz = $("extract-dropzone");
  fi.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) loadExtractFile(f);
  });
  ["dragenter", "dragover"].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("dragover"); })
  );
  dz.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadExtractFile(f);
  });
  $("extract-analyze-btn").addEventListener("click", analyzeExtract);
  $("extract-reset-btn").addEventListener("click", () => {
    extract.img = null;
    $("extract-file").value = "";
    $("extract-preview-wrap").hidden = true;
    $("extract-items").innerHTML = "";
    $("shop-filters").hidden = true;
    setExtractStatus("");
  });

  // 年代フィルターボタン
  const ageFilterGroup = document.querySelector('.filter-btns[data-group="age"]');
  if (ageFilterGroup) {
    ageFilterGroup.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-v]");
      if (!btn) return;
      shopFilter.age = btn.dataset.v;
      ageFilterGroup.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      if (extractedItems.length) renderExtractedItems(extractedItems);
    });
  }
}

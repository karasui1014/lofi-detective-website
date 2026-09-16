/* ============================================================
   Suno スタイルプロンプト辞典 + タブ切り替え
   ============================================================

   ■ この機能の立場
   ここに並ぶ英語表現は「Sunoでの表現を補助する参考情報」であって、
   「書けば必ずそう鳴る呪文」ではありません。画面にも必ずそう書きます。

   ■ 情報源を混ぜない
   sourceType で2種類を区別しています。表示上も最後まで分けます。
     "style-dictionary"          … スタイル辞典（01〜05）
     "v6-instrument-expression"  … Suno V6 が出力した楽器・奏法表現
   さらに originalPrompt / englishPrompt（元データ）と
   verifiedPrompt（AI音楽部で検証したもの）も別枠で並べます。
   片方をもう片方の言い換えとして扱わないでください。

   ■ 既存機能との関係
   タブは「表示の出し分け」だけを行い、DOMからは何も外しません。
   app.js は getElementById で各セクションを掴んでいるため、
   要素を消すと既存機能が壊れます。hidden を付け外しするだけにしてあります。
   ============================================================ */
"use strict";

/* ============================================================
   タブ
   ============================================================ */
const TECH_TABS = [
  { id: "genre", label: "ジャンル",   panels: ["recipe-panel", "step-lyrics", "step-genre", "step-mood"] },
  { id: "vocal", label: "ボーカル",   panels: ["step-vocal"] },
  { id: "inst",  label: "楽器",       panels: ["step-inst"] },
  { id: "arr",   label: "構成・演出", panels: ["step-tempo", "step-key", "step-meter", "step-prod", "step-sections", "consult-panel"] },
  { id: "dict",  label: "辞典",       panels: ["tech-lab"] }
];

let activeTab = "genre";

function showTab(id) {
  activeTab = id;
  TECH_TABS.forEach(t => {
    const on = t.id === id;
    t.panels.forEach(pid => {
      const el = document.getElementById(pid);
      if (el) el.hidden = !on;
    });
    const btn = document.querySelector(`.tab-btn[data-tab="${t.id}"]`);
    if (btn) {
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    }
  });
}

function buildTabs() {
  const bar = document.getElementById("tab-bar");
  if (!bar) return;
  bar.innerHTML = "";
  TECH_TABS.forEach(t => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tab-btn";
    b.dataset.tab = t.id;
    b.setAttribute("role", "tab");
    b.textContent = t.label;
    b.addEventListener("click", () => {
      showTab(t.id);
      bar.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    bar.appendChild(b);
  });
  showTab("genre");
}

/* ============================================================
   Premium判定
   ============================================================

   このツールは単体の静的サイトなので、自前の認証を持っていません。
   ただし Studio 本体（AI音楽部 Studio）と同じオリジンに置かれているため、
   Studio でライセンスキーを適用したときのセッションを読むことはできます。

   ⚠️ これは「表示の出し分け」であって、権限の検証ではありません。
   本当に隠さなければいけない本文は、ここではなく Worker 側から配るべきです。 */
function readStudioRole() {
  let token = null;
  try { token = localStorage.getItem("studio-next:session"); } catch { return "free"; }
  if (!token) return "free";
  try {
    const payload = token.split(".")[1];
    if (!payload) return "free";
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
    );
    if (json.exp && json.exp * 1000 < Date.now()) return "free";
    return json.role === "master" || json.role === "premium" ? json.role : "free";
  } catch {
    return "free";
  }
}

function isPremium() {
  const r = readStudioRole();
  return r === "premium" || r === "master";
}

/* ============================================================
   データの共通化
   ============================================================
   辞典（01〜05）と楽器・奏法は形が少し違うので、
   画面側はこのヘルパー越しにだけ触る。
   データを足すときに UI を直さなくて済むのはこのため。 */
const INSTRUMENT_CATEGORY = {
  id: "instrument-technique", no: "", ja: "楽器・奏法",
  en: "Instrument Techniques", desc: "Suno V6が出力した奏法表現"
};

function dictCategories() {
  return STYLE_DICT_CATEGORIES.concat([INSTRUMENT_CATEGORY]);
}

function allEntries() {
  return STYLE_DICT_ENTRIES.concat(TECHNIQUE_ENTRIES);
}

const isInstrumentEntry = (e) => e.sourceType === "v6-instrument-expression";

/** 画面・コピー・プロンプト追加で使う英語表現（元データ。書き換えない） */
const promptTextOf = (e) => e.originalPrompt || e.englishPrompt || "";

/** カードの見出し（日本語） */
const titleJaOf = (e) => e.techniqueJa || e.japaneseName || "";

/** カードの見出し（英語） */
const titleEnOf = (e) => e.technique || e.englishPrompt || "";

const techEl = (id) => document.getElementById(id);
const findInstrumentById = (id) => TECHNIQUE_INSTRUMENTS.find(i => i.id === id);
const entriesFor = (instrumentId) => TECHNIQUE_ENTRIES.filter(e => e.instrumentId === instrumentId);
const countFor = (instrumentId) => entriesFor(instrumentId).length;
const findEntryById = (id) => allEntries().find(e => e.id === id);

/** englishPrompt から登録済みエントリーを引く（関連プロンプトのリンク用） */
function findEntryByPrompt(name) {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return null;
  return allEntries().find(e => (e.englishPrompt || "").toLowerCase() === n) || null;
}

/* ============================================================
   検索
   ============================================================
   英語・日本語・ジャンル・楽器・奏法・効果・擬音・雰囲気のどれでも当たるようにする。
   「うにょ」で "うにょ〜" に当てたいので、含む/含まれるの両方向で見る。
   「切ないけど明るいJ-POP」のような文章でも、含まれるタグを拾って当たる。 */
function normalize(s) {
  return String(s || "").toLowerCase().replace(/[\s　、。,.！!？?〜~ー・]/g, "");
}

function scoreEntry(entry, rawQuery) {
  const q = normalize(rawQuery);
  if (!q) return 0;
  let score = 0;

  const hit = (field, weight) => {
    const f = normalize(field);
    if (!f) return;
    // 「うにょ」で "うにょ〜" に当てたいので両方向で見る。
    // ただし正規化後1文字の語（「キー」→「キ」など）を文章側から拾うと
    // 無関係な候補が大量に混ざるため、そちら向きは2文字以上に限る。
    if (f.includes(q) || (f.length >= 2 && q.includes(f))) score += weight;
  };

  (entry.tags || []).forEach(t => hit(t, 3));
  hit(titleJaOf(entry), 3);
  hit(titleEnOf(entry), 3);

  if (isInstrumentEntry(entry)) {
    const inst = findInstrumentById(entry.instrumentId);
    if (inst) { hit(inst.instrumentJa, 2); hit(inst.instrument, 2); }
    hit(entry.soundDescription, 1);
  }

  hit(entry.meaning, 1);
  hit(promptTextOf(entry), 1);
  (entry.recommendations || []).forEach(r => hit(r, 1));
  return score;
}

function searchEntries(rawQuery) {
  return allEntries()
    .map(e => ({ entry: e, score: scoreEntry(e, rawQuery) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.entry);
}

/* ============================================================
   プロンプトへの反映
   ============================================================

   単純な羅列にせず、カテゴリー順（01→05→楽器・奏法）に並べ替えてから
   既存の state.extras へ渡す。app.js 側で detail 部に合流するため、
   結果は
     128 BPM, bright major key, bittersweet longing, Rhodes chords,
     soft tape saturation, female vocals (breathy)
   のように意味のまとまりごとに並ぶ。

   ⚠️ 英語表現そのものは書き換えない。並べ替えと、楽器名の前置きだけを行う。 */
function phraseFor(entry) {
  if (!isInstrumentEntry(entry)) return promptTextOf(entry);
  const inst = findInstrumentById(entry.instrumentId);
  const name = inst ? inst.instrument.split(" / ")[0].toLowerCase() : "";
  return name ? `${name} with ${entry.originalPrompt}` : entry.originalPrompt;
}

function categoryOrder(entry) {
  const cats = dictCategories();
  const i = cats.findIndex(c => c.id === entry.category);
  return i < 0 ? cats.length : i;
}

/** techState.added の内容を state.extras へ反映する。
    相談モードなど他の経路で入った extras は消さない。 */
function syncExtras() {
  const mine = new Set(techState.added.map(a => a.text).filter(Boolean));
  const others = state.extras.filter(x => !mine.has(x));
  const sorted = techState.added
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(a => a.text)
    .filter(Boolean);           // BPM項目は本文を持たない（BPM欄へ入れている）
  state.extras.length = 0;
  others.concat(sorted).forEach(x => state.extras.push(x));
}

/* 「128 BPM」のようなテンポ項目は、文章として足すと
   ジャンルのおまかせ補完が出すBPMと二重に並んでしまう
   （例: "104 BPM, ..., 128 BPM"）。既存のBPM欄へ流し込んで1つに保つ。 */
const BPM_RE = /^(\d{2,3})\s*BPM$/i;

function applyBpm(value) {
  const input = document.getElementById("bpm-input");
  if (!input) return;
  input.value = value === null ? "" : value;
  // 既存のinputハンドラにそのまま処理させる（tempoWordの追従もそちらに任せる）
  input.dispatchEvent(new Event("input"));
}

function addToStylePrompt(entry) {
  if (techState.added.some(a => a.id === entry.id)) {
    toast("この表現はすでに追加されています");
    return;
  }

  const bpm = !isInstrumentEntry(entry) && BPM_RE.exec(promptTextOf(entry));
  if (bpm) {
    const prev = techState.added.find(a => a.kind === "bpm");
    if (prev) techState.added.splice(techState.added.indexOf(prev), 1);
    techState.added.push({ id: entry.id, text: "", order: categoryOrder(entry), kind: "bpm", label: promptTextOf(entry) });
    applyBpm(parseInt(bpm[1], 10));
    syncExtras();
  } else {
    techState.added.push({ id: entry.id, text: phraseFor(entry), order: categoryOrder(entry), kind: "text" });
    syncExtras();
  }

  markStale();
  render();
  renderAdded();
  toast("スタイルプロンプトに追加しました🎵");
}

function removeFromStylePrompt(id) {
  const i = techState.added.findIndex(a => a.id === id);
  if (i < 0) return;
  const [removed] = techState.added.splice(i, 1);
  if (removed.kind === "bpm") applyBpm(null);
  syncExtras();
  markStale();
  render();
  renderAdded();
}

function renderAdded() {
  const box = techEl("tech-added");
  if (!box) return;
  // リセット等で state 側から消えていたら、こちらも合わせる
  techState.added = techState.added.filter(a =>
    a.kind === "bpm" ? state.bpm !== null : state.extras.includes(a.text));
  if (!techState.added.length) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.innerHTML = `<p class="tech-added-title">スタイルプロンプトに追加済み（${techState.added.length}件）</p>`;
  const row = document.createElement("div");
  row.className = "tech-added-row";
  techState.added.slice().sort((a, b) => a.order - b.order).forEach(a => {
    const chip = document.createElement("span");
    chip.className = "tech-added-chip";
    chip.innerHTML = `<span>${escapeHtml(a.label || a.text)}</span>`;
    const x = document.createElement("button");
    x.type = "button";
    x.setAttribute("aria-label", "この表現を外す");
    x.textContent = "×";
    x.addEventListener("click", () => removeFromStylePrompt(a.id));
    chip.appendChild(x);
    row.appendChild(chip);
  });
  box.appendChild(row);
}

/* ============================================================
   状態
   ============================================================ */
const techState = {
  category: "rhythm-mood",     // 辞典カテゴリー
  instrumentCategory: "all",   // 楽器・奏法内での楽器カテゴリー絞り込み
  instrumentId: null,
  query: "",
  added: [],
  expanded: {}                 // 「詳しく見る」の開閉
};

/* ============================================================
   関連プロンプトのリンク化
   ============================================================
   「bright major key と好相性」の bright major key を押せるようにする。
   登録済みのものだけリンクになり、未登録のものは普通の文字のまま残る
   （あとでデータを足せば自動でリンクになる）。 */
let promptIndexCache = null;
function promptIndex() {
  if (promptIndexCache) return promptIndexCache;
  promptIndexCache = allEntries()
    .filter(e => e.englishPrompt)
    .map(e => ({ name: e.englishPrompt, id: e.id }))
    .sort((a, b) => b.name.length - a.name.length); // 長い名前から先に当てる
  return promptIndexCache;
}

function linkifyPrompts(text) {
  let html = escapeHtml(String(text || ""));
  promptIndex().forEach(({ name, id }) => {
    const safe = escapeHtml(name);
    if (!html.includes(safe)) return;
    // 既にリンク化した部分を二重に囲まないよう、プレースホルダを挟む
    html = html.split(safe).join(` ${id}${safe}`);
  });
  return html.replace(/ (.+?)(.+?)/g, (m, id, label) =>
    `<button type="button" class="tech-link" data-goto="${escapeHtml(id)}">${label}</button>`);
}

function gotoEntry(id) {
  const entry = findEntryById(id);
  if (!entry) return;
  techState.query = "";
  const search = techEl("tech-search");
  if (search) search.value = "";
  renderSearchResult("");
  techState.category = entry.category;
  if (isInstrumentEntry(entry)) {
    techState.instrumentId = entry.instrumentId;
    techState.instrumentCategory = "all";
  }
  techState.expanded[id] = true;
  renderCategoryChips();
  renderCategoryBody();
  setTimeout(() => {
    const card = document.querySelector(`.tech-card[data-id="${CSS.escape(id)}"]`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.add("flash");
      setTimeout(() => card.classList.remove("flash"), 1200);
    }
  }, 0);
}

/* 動的に作ったリンクはまとめて拾う */
document.addEventListener("click", (e) => {
  const btn = e.target.closest && e.target.closest(".tech-link");
  if (btn && btn.dataset.goto) gotoEntry(btn.dataset.goto);
});

/* ============================================================
   カード
   ============================================================ */
const STATUS_LABEL = {
  reference:  { text: "参考プロンプト",     cls: "unverified" },
  unverified: { text: "未検証",             cls: "unverified" },
  verified:   { text: "AI音楽部検証済み",   cls: "verified" }
};

function buildCard(entry) {
  const premium = isPremium();
  const st = STATUS_LABEL[entry.verificationStatus] || STATUS_LABEL.reference;
  const instrument = isInstrumentEntry(entry) ? findInstrumentById(entry.instrumentId) : null;
  const open = !!techState.expanded[entry.id];

  const card = document.createElement("article");
  card.className = "tech-card";
  card.dataset.id = entry.id;

  /* --- 見出し + バッジ --- */
  const head = document.createElement("div");
  head.className = "tech-card-head";
  head.innerHTML =
    `<div class="tech-card-names">
       <strong>${escapeHtml(titleJaOf(entry))}</strong>
       <span>${escapeHtml(titleEnOf(entry))}</span>
       ${instrument ? `<small>${escapeHtml(instrument.instrumentJa)}</small>` : ""}
     </div>
     <div class="tech-badges">
       <span class="tech-badge ${isInstrumentEntry(entry) ? "suno" : "dict"}">${isInstrumentEntry(entry) ? "Suno V6表現" : "スタイル辞典"}</span>
       <span class="tech-badge ${st.cls}">${escapeHtml(st.text)}</span>
     </div>`;
  card.appendChild(head);

  /* --- 意味・効果 --- */
  const desc = document.createElement("div");
  desc.className = "tech-card-desc";
  desc.innerHTML =
    (entry.meaning ? `<p>${escapeHtml(entry.meaning)}</p>` : "") +
    (entry.soundDescription ? `<p class="tech-sound">🔊 ${escapeHtml(entry.soundDescription)}</p>` : "");
  card.appendChild(desc);

  /* --- 英語プロンプト（元データ。書き換えない） --- */
  const orig = document.createElement("div");
  orig.className = "tech-orig";
  orig.innerHTML =
    `<p class="tech-orig-label">${isInstrumentEntry(entry) ? "Suno V6表現" : "英語プロンプト"}</p>
     <p class="tech-orig-text">${escapeHtml(promptTextOf(entry))}</p>` +
    (isInstrumentEntry(entry)
      ? `<p class="tech-orig-note">Suno V6がこの奏法・演奏表現を表すために使用した表現です。入力すれば必ず同じ奏法が再現されることを保証するものではありません。</p>`
      : "");
  card.appendChild(orig);

  /* --- 詳細（相性・注意・関連・タグ） --- */
  if (open) {
    const detail = document.createElement("div");
    detail.className = "tech-card-detail";
    let html = "";

    if ((entry.recommendations || []).length) {
      html += `<p class="tech-sub">相性の良い組み合わせ</p><ul class="tech-list">` +
        entry.recommendations.map(r => `<li>${linkifyPrompts(r)}</li>`).join("") + `</ul>`;
    }
    if ((entry.cautions || []).length) {
      html += `<p class="tech-sub warn">注意</p><ul class="tech-list warn">` +
        entry.cautions.map(c => `<li>${linkifyPrompts(c)}</li>`).join("") + `</ul>`;
    }

    // 本文に出てこなかった関連プロンプトも押せるように並べる
    const shown = (entry.recommendations || []).concat(entry.cautions || []).join(" ");
    const extraRelated = (entry.relatedPrompts || []).filter(n => !shown.includes(n));
    if (extraRelated.length) {
      html += `<p class="tech-sub">関連</p><p class="tech-related">` +
        extraRelated.map(n => linkifyPrompts(n)).join(" / ") + `</p>`;
    }

    if ((entry.tags || []).length) {
      html += `<p class="tech-sub">タグ</p><p class="tech-tags">` +
        entry.tags.map(t => `<span>${escapeHtml(t)}</span>`).join("") + `</p>`;
    }
    detail.innerHTML = html;
    card.appendChild(detail);
  }

  /* --- AI音楽部検証済み（Premium） --- */
  const ver = document.createElement("div");
  ver.className = "tech-verified";
  const verHead = `<p class="tech-ver-label">AI音楽部 検証済み<span class="tech-badge premium">Premium</span></p>`;
  if (!premium) {
    ver.innerHTML = verHead +
      `<p class="tech-locked">検証済みプロンプト・補助ワード・検証メモは Studio Premium 以上で表示されます。</p>`;
  } else if (entry.verificationStatus === "verified") {
    ver.innerHTML = verHead +
      `<p class="tech-ver-text">${escapeHtml(entry.verifiedPrompt || "")}</p>` +
      ((entry.recommendedModifiers || []).length
        ? `<p class="tech-ver-mods">補助ワード: ${entry.recommendedModifiers.map(m => escapeHtml(m)).join(" / ")}</p>` : "") +
      (entry.verificationNote ? `<p class="tech-ver-note">📝 ${escapeHtml(entry.verificationNote)}</p>` : "") +
      (entry.testedModel ? `<p class="tech-ver-meta">検証: ${escapeHtml(entry.testedModel)}${entry.testedDate ? " / " + escapeHtml(entry.testedDate) : ""}</p>` : "");
  } else {
    ver.innerHTML = verHead +
      `<p class="tech-locked">この表現はまだ検証していません。検証が済み次第ここに追記されます。</p>`;
  }
  card.appendChild(ver);

  /* --- ボタン --- */
  const btns = document.createElement("div");
  btns.className = "tech-card-btns";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn main tech-btn";
  addBtn.textContent = "＋ プロンプトに追加";
  addBtn.addEventListener("click", () => addToStylePrompt(entry));
  btns.appendChild(addBtn);

  if (isInstrumentEntry(entry)) {
    const c1 = document.createElement("button");
    c1.type = "button";
    c1.className = "btn sub tech-btn";
    c1.textContent = "📋 この奏法だけ";
    c1.addEventListener("click", () => copyText(entry.originalPrompt, "奏法の表現をコピーしました"));
    const c2 = document.createElement("button");
    c2.type = "button";
    c2.className = "btn sub tech-btn";
    c2.textContent = "📋 楽器名込み";
    c2.addEventListener("click", () => copyText(phraseFor(entry), "楽器名込みでコピーしました"));
    btns.append(c1, c2);
  } else {
    const c = document.createElement("button");
    c.type = "button";
    c.className = "btn sub tech-btn";
    c.textContent = "📋 コピー";
    c.addEventListener("click", () => copyText(promptTextOf(entry), "コピーしました"));
    btns.appendChild(c);
  }

  const more = document.createElement("button");
  more.type = "button";
  more.className = "btn sub tech-btn";
  more.textContent = open ? "▲ 閉じる" : "▼ 詳しく見る";
  more.addEventListener("click", () => {
    techState.expanded[entry.id] = !open;
    if (techState.query.trim()) renderSearchResult(techState.query);
    else renderCategoryBody();
  });
  btns.appendChild(more);

  card.appendChild(btns);
  return card;
}

/* ============================================================
   カテゴリー表示
   ============================================================ */
function renderCategoryChips() {
  const box = techEl("tech-category-chips");
  if (!box) return;
  box.innerHTML = "";
  dictCategories().forEach(c => {
    const n = c.id === "instrument-technique"
      ? TECHNIQUE_ENTRIES.length
      : STYLE_DICT_ENTRIES.filter(e => e.category === c.id).length;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip tech-cat-chip" + (techState.category === c.id ? " on" : "");
    b.dataset.id = c.id;
    b.innerHTML = `<span>${c.no ? c.no + " " : ""}${escapeHtml(c.ja)}</span><small>${escapeHtml(c.en)}・${n}</small>`;
    b.addEventListener("click", () => {
      techState.category = c.id;
      techState.instrumentId = null;
      renderCategoryChips();
      renderCategoryBody();
    });
    box.appendChild(b);
  });
}

function renderCategoryBody() {
  const box = techEl("tech-category-body");
  if (!box) return;
  box.innerHTML = "";

  const cat = dictCategories().find(c => c.id === techState.category);
  if (!cat) return;

  const lead = document.createElement("p");
  lead.className = "tech-cat-lead";
  lead.textContent = `${cat.no ? cat.no + " " : ""}${cat.en} — ${cat.desc}`;
  box.appendChild(lead);

  if (cat.id !== "instrument-technique") {
    const list = STYLE_DICT_ENTRIES.filter(e => e.category === cat.id);
    const grid = document.createElement("div");
    grid.className = "tech-card-grid";
    list.forEach(e => grid.appendChild(buildCard(e)));
    box.appendChild(grid);
    return;
  }

  /* --- 楽器・奏法 --- */
  const note = document.createElement("p");
  note.className = "tech-source-note";
  note.textContent = "Suno V6が奏法・演奏表現を表す際に使用した表現を含みます。";
  box.appendChild(note);

  const catRow = document.createElement("div");
  catRow.className = "chip-row";
  const cats = [{ id: "all", ja: "すべて" }].concat(TECHNIQUE_CATEGORIES);
  cats.forEach(c => {
    const n = c.id === "all"
      ? TECHNIQUE_INSTRUMENTS.length
      : TECHNIQUE_INSTRUMENTS.filter(i => i.category === c.id).length;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip tech-cat-chip" + (techState.instrumentCategory === c.id ? " on" : "");
    b.innerHTML = `<span>${escapeHtml(c.ja)}</span><small>${n}</small>`;
    b.addEventListener("click", () => {
      techState.instrumentCategory = c.id;
      techState.instrumentId = null;
      renderCategoryBody();
    });
    catRow.appendChild(b);
  });
  box.appendChild(catRow);

  const grid = document.createElement("div");
  grid.className = "tech-inst-grid";
  const list = techState.instrumentCategory === "all"
    ? TECHNIQUE_INSTRUMENTS
    : TECHNIQUE_INSTRUMENTS.filter(i => i.category === techState.instrumentCategory);
  list.forEach(inst => {
    const n = countFor(inst.id);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tech-inst-card" + (techState.instrumentId === inst.id ? " on" : "") + (n ? "" : " empty");
    b.innerHTML =
      `<strong>${escapeHtml(inst.instrumentJa)}</strong>` +
      `<small>${escapeHtml(inst.instrument)}</small>` +
      (n ? `<span class="tech-inst-count">${n}件</span>`
         : `<span class="tech-inst-count none">未登録</span>`);
    b.addEventListener("click", () => {
      techState.instrumentId = techState.instrumentId === inst.id ? null : inst.id;
      renderCategoryBody();
    });
    grid.appendChild(b);
  });
  box.appendChild(grid);

  if (!techState.instrumentId) return;

  const inst = findInstrumentById(techState.instrumentId);
  const entries = entriesFor(techState.instrumentId);

  const head = document.createElement("div");
  head.className = "tech-detail-head";
  head.innerHTML = `<h3>${escapeHtml(inst.instrumentJa)}<small>${escapeHtml(inst.instrument)}</small></h3>`;
  box.appendChild(head);

  if (!entries.length) {
    const p = document.createElement("p");
    p.className = "tech-empty";
    p.textContent = "この楽器の表現データはまだ登録されていません。元データが入り次第ここに並びます。";
    box.appendChild(p);
    return;
  }

  const eGrid = document.createElement("div");
  eGrid.className = "tech-card-grid";
  entries.forEach(e => eGrid.appendChild(buildCard(e)));
  box.appendChild(eGrid);
}

/* ============================================================
   「どんな曲にしたい？」
   ============================================================
   このツールは端末内だけで動く方針（外部送信なし）なので、
   推定は tags を使った日本語マッチで行う。
   「切ないけど明るいJ-POP」→ 切ない / 明るい / j-pop が当たる。 */
function renderSearchResult(query) {
  const box = techEl("tech-search-result");
  const body = techEl("tech-category-body");
  const chips = techEl("tech-category-chips");
  if (!box) return;
  box.innerHTML = "";

  const active = !!query.trim();
  box.hidden = !active;
  if (body) body.hidden = active;
  if (chips) chips.hidden = active;
  const catLabel = techEl("tech-category-label");
  if (catLabel) catLabel.hidden = active;
  if (!active) return;

  const hits = searchEntries(query);
  if (!hits.length) {
    box.innerHTML =
      `<p class="tech-empty">「${escapeHtml(query)}」に当たる表現は見つかりませんでした。` +
      `別の言い方（雰囲気・楽器名・擬音・英語）でも試してみてください。</p>`;
    return;
  }

  const p = document.createElement("p");
  p.className = "tech-result-label";
  p.textContent = `${hits.length}件の候補が見つかりました`;
  box.appendChild(p);

  const grid = document.createElement("div");
  grid.className = "tech-card-grid";
  hits.slice(0, 24).forEach(e => grid.appendChild(buildCard(e)));
  box.appendChild(grid);
}

/* ============================================================
   初期化
   ============================================================ */
function initTechniques() {
  buildTabs();

  const search = techEl("tech-search");
  if (search) {
    let timer = null;
    search.addEventListener("input", e => {
      techState.query = e.target.value;
      clearTimeout(timer);
      timer = setTimeout(() => renderSearchResult(techState.query), 150);
    });
  }

  const clear = techEl("tech-search-clear");
  if (clear) {
    clear.addEventListener("click", () => {
      techState.query = "";
      if (search) search.value = "";
      renderSearchResult("");
      if (search) search.focus();
    });
  }

  renderCategoryChips();
  renderCategoryBody();
  renderAdded();

  // リセットで state.extras が空になったとき、追加済み表示も追随させる
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) resetBtn.addEventListener("click", () => setTimeout(renderAdded, 0));

  // Premium表示は Studio のセッション次第で変わるため、戻ってきたら描き直す
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && activeTab === "dict") {
      if (techState.query.trim()) renderSearchResult(techState.query);
      else renderCategoryBody();
    }
  });
}

/* app.js の init が終わってから走らせる（state / toast / render を使うため） */
document.addEventListener("DOMContentLoaded", () => setTimeout(initTechniques, 0));

/* ============================================================
   楽器・奏法プロンプト研究所 + タブ切り替え
   ============================================================

   ■ この機能の立場
   ここに出る英語表現は「Suno V6がその奏法を表すために使った表現」であって、
   「書けば必ずそう鳴る呪文」ではありません。UI上でも必ずそう書きます。
   Suno V6表現（originalPrompt）と AI音楽部検証済み（verifiedPrompt）は
   最後まで別物として並べ、片方をもう片方の言い換えとして扱いません。

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
  { id: "inst",  label: "楽器・奏法", panels: ["step-inst", "tech-lab"] },
  { id: "arr",   label: "構成・演出", panels: ["step-tempo", "step-key", "step-meter", "step-prod", "step-sections", "consult-panel"] }
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
   本当に隠さなければいけない本文は、ここではなく Worker 側から配るべきです。
   （現状このファイルに置いている検証データは空なので、まだ何も露出していません） */
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
    if (payload && json.exp && json.exp * 1000 < Date.now()) return "free";
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
   研究所の状態
   ============================================================ */
const techState = {
  category: "all",
  instrumentId: null,
  query: "",
  added: []        // { key, text } 追加済みの表現
};

const techEl = (id) => document.getElementById(id);
const findInstrumentById = (id) => TECHNIQUE_INSTRUMENTS.find(i => i.id === id);
const entriesFor = (instrumentId) => TECHNIQUE_ENTRIES.filter(e => e.instrumentId === instrumentId);
const countFor = (instrumentId) => entriesFor(instrumentId).length;

/* ---------- 検索 ----------
   楽器名・日本語奏法名・英語奏法名・擬音タグ・説明文のどれでも当たるようにする。
   「うにょ」で "うにょ〜" に当てたいので、含む/含まれるの両方向で見る。 */
function normalize(s) {
  return String(s || "").toLowerCase().replace(/[\s　、。,.！!？?〜~ー・]/g, "");
}

function scoreEntry(entry, rawQuery) {
  const q = normalize(rawQuery);
  if (!q) return 0;
  const inst = findInstrumentById(entry.instrumentId);
  let score = 0;

  const hit = (field, weight) => {
    const f = normalize(field);
    if (!f) return;
    if (f.includes(q) || q.includes(f)) score += weight;
  };

  (entry.searchTags || []).forEach(t => hit(t, 3));
  hit(entry.techniqueJa, 3);
  hit(entry.technique, 3);
  if (inst) { hit(inst.instrumentJa, 2); hit(inst.instrument, 2); }
  hit(entry.soundDescriptionJa, 1);
  hit(entry.descriptionJa, 1);
  hit(entry.originalPrompt, 1);
  return score;
}

function searchEntries(rawQuery) {
  return TECHNIQUE_ENTRIES
    .map(e => ({ entry: e, score: scoreEntry(e, rawQuery) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.entry);
}

/* ============================================================
   プロンプトへの反映
   ============================================================

   単純な文字列連結にせず、「楽器名 with 表現」の形にしてから
   既存の state.extras へ渡す。app.js 側で detail 部に合流するため、
   結果は
     Emotional jazz ballad, warm brass section,
     trombone with breath-supported glissando between two neighboring pitches
   のように自然な位置へ入る。 */
function phraseFor(entry) {
  const inst = findInstrumentById(entry.instrumentId);
  const name = inst ? inst.instrument.split(" / ")[0].toLowerCase() : "";
  return name ? `${name} with ${entry.originalPrompt}` : entry.originalPrompt;
}

function entryKey(entry) {
  return `${entry.instrumentId}::${entry.technique}`;
}

function addToStylePrompt(entry) {
  const key = entryKey(entry);
  if (techState.added.some(a => a.key === key)) {
    toast("この表現はすでに追加されています");
    return;
  }
  const text = phraseFor(entry);
  techState.added.push({ key, text });
  if (!state.extras.includes(text)) state.extras.push(text);
  markStale();
  render();
  renderAdded();
  toast("スタイルプロンプトに追加しました🎺");
}

function removeFromStylePrompt(key) {
  const i = techState.added.findIndex(a => a.key === key);
  if (i < 0) return;
  const [removed] = techState.added.splice(i, 1);
  const j = state.extras.indexOf(removed.text);
  if (j >= 0) state.extras.splice(j, 1);
  markStale();
  render();
  renderAdded();
}

function renderAdded() {
  const box = techEl("tech-added");
  if (!box) return;
  // リセット等で state.extras 側から消えていたら、こちらも合わせる
  techState.added = techState.added.filter(a => state.extras.includes(a.text));
  if (!techState.added.length) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.innerHTML = `<p class="tech-added-title">スタイルプロンプトに追加済み（${techState.added.length}件）</p>`;
  const row = document.createElement("div");
  row.className = "tech-added-row";
  techState.added.forEach(a => {
    const chip = document.createElement("span");
    chip.className = "tech-added-chip";
    chip.innerHTML = `<span>${escapeHtml(a.text)}</span>`;
    const x = document.createElement("button");
    x.type = "button";
    x.setAttribute("aria-label", "この表現を外す");
    x.textContent = "×";
    x.addEventListener("click", () => removeFromStylePrompt(a.key));
    chip.appendChild(x);
    row.appendChild(chip);
  });
  box.appendChild(row);
}

/* ============================================================
   描画: 楽器一覧
   ============================================================ */
function renderCategoryChips() {
  const box = techEl("tech-category-chips");
  if (!box) return;
  box.innerHTML = "";
  const all = [{ id: "all", ja: "すべて", en: "All" }, ...TECHNIQUE_CATEGORIES];
  all.forEach(c => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip tech-cat-chip" + (techState.category === c.id ? " on" : "");
    b.dataset.id = c.id;
    const n = c.id === "all"
      ? TECHNIQUE_INSTRUMENTS.length
      : TECHNIQUE_INSTRUMENTS.filter(i => i.category === c.id).length;
    b.innerHTML = `<span>${c.ja}</span><small>${n}</small>`;
    b.addEventListener("click", () => {
      techState.category = c.id;
      techState.instrumentId = null;
      renderCategoryChips();
      renderInstrumentGrid();
      renderDetail();
    });
    box.appendChild(b);
  });
}

function renderInstrumentGrid() {
  const box = techEl("tech-instrument-grid");
  if (!box) return;
  box.innerHTML = "";
  const list = techState.category === "all"
    ? TECHNIQUE_INSTRUMENTS
    : TECHNIQUE_INSTRUMENTS.filter(i => i.category === techState.category);

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
      renderInstrumentGrid();
      renderDetail();
      const d = techEl("tech-detail");
      if (techState.instrumentId && d) d.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    box.appendChild(b);
  });
}

/* ============================================================
   描画: 奏法カード
   ============================================================ */
const STATUS_LABEL = {
  unverified: { text: "Suno V6表現・未検証", cls: "unverified" },
  verified:   { text: "AI音楽部検証済み",   cls: "verified" }
};

function buildCard(entry) {
  const inst = findInstrumentById(entry.instrumentId);
  const st = STATUS_LABEL[entry.verificationStatus] || STATUS_LABEL.unverified;
  const premium = isPremium();

  const card = document.createElement("article");
  card.className = "tech-card";

  /* --- 見出し + バッジ --- */
  const head = document.createElement("div");
  head.className = "tech-card-head";
  head.innerHTML =
    `<div class="tech-card-names">
       <strong>${escapeHtml(entry.techniqueJa)}</strong>
       <span>${escapeHtml(entry.technique)}</span>
       <small>${escapeHtml(inst ? inst.instrumentJa : "")}</small>
     </div>
     <div class="tech-badges">
       <span class="tech-badge suno">Suno V6表現</span>
       <span class="tech-badge ${st.cls}">${escapeHtml(st.text)}</span>
     </div>`;
  card.appendChild(head);

  /* --- 説明（UI表示用に足した日本語） --- */
  const desc = document.createElement("div");
  desc.className = "tech-card-desc";
  desc.innerHTML =
    (entry.descriptionJa ? `<p>${escapeHtml(entry.descriptionJa)}</p>` : "") +
    (entry.soundDescriptionJa ? `<p class="tech-sound">🔊 ${escapeHtml(entry.soundDescriptionJa)}</p>` : "");
  card.appendChild(desc);

  /* --- Suno V6表現（元データそのまま） --- */
  const orig = document.createElement("div");
  orig.className = "tech-orig";
  orig.innerHTML =
    `<p class="tech-orig-label">Suno V6表現</p>
     <p class="tech-orig-text">${escapeHtml(entry.originalPrompt)}</p>
     <p class="tech-orig-note">Suno V6がこの奏法・演奏表現を表すために使用した表現です。入力すれば必ず同じ奏法が再現されることを保証するものではありません。</p>`;
  card.appendChild(orig);

  /* --- AI音楽部検証済み（Premium） --- */
  const ver = document.createElement("div");
  ver.className = "tech-verified";
  if (!premium) {
    ver.innerHTML =
      `<p class="tech-ver-label">AI音楽部 検証済み<span class="tech-badge premium">Premium</span></p>
       <p class="tech-locked">検証済みプロンプト・補助ワード・検証メモは Studio Premium 以上で表示されます。</p>`;
  } else if (entry.verificationStatus === "verified") {
    ver.innerHTML =
      `<p class="tech-ver-label">AI音楽部 検証済み<span class="tech-badge premium">Premium</span></p>
       <p class="tech-ver-text">${escapeHtml(entry.verifiedPrompt || "")}</p>` +
      (entry.recommendedModifiers && entry.recommendedModifiers.length
        ? `<p class="tech-ver-mods">補助ワード: ${entry.recommendedModifiers.map(m => escapeHtml(m)).join(" / ")}</p>` : "") +
      (entry.verificationNote ? `<p class="tech-ver-note">📝 ${escapeHtml(entry.verificationNote)}</p>` : "") +
      (entry.testedModel ? `<p class="tech-ver-meta">検証: ${escapeHtml(entry.testedModel)}${entry.testedDate ? " / " + escapeHtml(entry.testedDate) : ""}</p>` : "");
  } else {
    ver.innerHTML =
      `<p class="tech-ver-label">AI音楽部 検証済み<span class="tech-badge premium">Premium</span></p>
       <p class="tech-locked">この表現はまだ検証していません。検証が済み次第ここに追記されます。</p>`;
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

  const copy1 = document.createElement("button");
  copy1.type = "button";
  copy1.className = "btn sub tech-btn";
  copy1.textContent = "📋 この奏法だけ";
  copy1.addEventListener("click", () => copyText(entry.originalPrompt, "奏法の表現をコピーしました"));

  const copy2 = document.createElement("button");
  copy2.type = "button";
  copy2.className = "btn sub tech-btn";
  copy2.textContent = "📋 楽器名込み";
  copy2.addEventListener("click", () => copyText(phraseFor(entry), "楽器名込みでコピーしました"));

  btns.append(addBtn, copy1, copy2);
  card.appendChild(btns);

  return card;
}

function renderDetail() {
  const box = techEl("tech-detail");
  if (!box) return;
  box.innerHTML = "";

  if (!techState.instrumentId) { box.hidden = true; return; }
  box.hidden = false;

  const inst = findInstrumentById(techState.instrumentId);
  const list = entriesFor(techState.instrumentId);

  const head = document.createElement("div");
  head.className = "tech-detail-head";
  head.innerHTML =
    `<h3>${escapeHtml(inst.instrumentJa)}<small>${escapeHtml(inst.instrument)}</small></h3>`;
  const back = document.createElement("button");
  back.type = "button";
  back.className = "btn sub tech-btn";
  back.textContent = "← 楽器一覧へ";
  back.addEventListener("click", () => {
    techState.instrumentId = null;
    renderInstrumentGrid();
    renderDetail();
    techEl("tech-instrument-grid").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  head.appendChild(back);
  box.appendChild(head);

  if (!list.length) {
    const p = document.createElement("p");
    p.className = "tech-empty";
    p.textContent = "この楽器の表現データはまだ登録されていません。元データが入り次第ここに並びます。";
    box.appendChild(p);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "tech-card-grid";
  list.forEach(e => grid.appendChild(buildCard(e)));
  box.appendChild(grid);
}

/* ============================================================
   検索結果 / 「どんな音にしたい？」
   ============================================================

   このツールは端末内だけで動く方針（外部送信なし）なので、
   推定は searchTags を使った日本語マッチで行う。
   「トロンボーンをうにょ〜っとしたい」→ トロンボーン + うにょ の2語が当たる。 */
function renderSearchResult(query) {
  const box = techEl("tech-search-result");
  if (!box) return;
  box.innerHTML = "";

  if (!query.trim()) { box.hidden = true; return; }
  box.hidden = false;

  const hits = searchEntries(query);
  if (!hits.length) {
    box.innerHTML =
      `<p class="tech-empty">「${escapeHtml(query)}」に当たる表現は見つかりませんでした。` +
      `別の言い方（楽器名・擬音・英語の奏法名）でも試してみてください。</p>`;
    return;
  }

  const p = document.createElement("p");
  p.className = "tech-result-label";
  p.textContent = `${hits.length}件の候補が見つかりました`;
  box.appendChild(p);

  const grid = document.createElement("div");
  grid.className = "tech-card-grid";
  hits.slice(0, 12).forEach(e => grid.appendChild(buildCard(e)));
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
      search && search.focus();
    });
  }

  renderCategoryChips();
  renderInstrumentGrid();
  renderDetail();
  renderAdded();

  // リセットで state.extras が空になったとき、追加済み表示も追随させる
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) resetBtn.addEventListener("click", () => setTimeout(renderAdded, 0));

  // Premium表示は Studio のセッション次第で変わるため、タブを開くたびに描き直す
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && activeTab === "inst") { renderDetail(); renderSearchResult(techState.query); }
  });
}

/* app.js の init が終わってから走らせる（state / toast / render を使うため） */
document.addEventListener("DOMContentLoaded", () => setTimeout(initTechniques, 0));

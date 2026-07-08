/* ============================================================
   Sunoプロンプト工房 - アプリロジック
   選択 → 前半重視(フロントロード)の英語スタイルプロンプト生成
   ============================================================ */
"use strict";

/* ---------- 状態 ---------- */
const state = {
  genres: [],        // 最大2 (先頭がメイン)
  moods: [],         // 最大3
  singer: null,
  quality: null,
  bpm: null,         // 数値 or null
  tempoWord: null,   // プリセットの形容
  key: "none",
  meter: "44",
  groove: "none",
  inst: [],          // 最大5
  prod: "none",
  era: "none",
  dyn: "none",
  extras: [],        // 相談モードで追加される文言
  autoFill: true,    // おまかせ補完
  generated: false,  // 生成ボタンを押したか
  stale: false,      // 生成後に選択が変わったか
  sectionFX: {}      // セクションごとの演出 { verse:["meter78"], ... }
};
DB.sections.forEach(s => { state.sectionFX[s.id] = []; });

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ---------- ヘルパー ---------- */
const findGenre = (id) => DB.genres.find(g => g.id === id);
const findMood  = (id) => DB.moods.find(m => m.id === id);
const allInstruments = DB.instrumentGroups.flatMap(g => g.items);
const findInst  = (id) => allInstruments.find(i => i.id === id);

function toggleArr(arr, val, max) {
  const i = arr.indexOf(val);
  if (i >= 0) { arr.splice(i, 1); return true; }
  if (arr.length >= max) return false;
  arr.push(val);
  return true;
}

/* ============================================================
   UI構築
   ============================================================ */
function buildChips(containerSel, items, getLabel, getHint, onClick) {
  const box = $(containerSel);
  box.innerHTML = "";
  items.forEach(item => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.dataset.id = item.id;
    b.innerHTML = getHint && getHint(item)
      ? `<span>${getLabel(item)}</span><small>${getHint(item)}</small>`
      : `<span>${getLabel(item)}</span>`;
    b.addEventListener("click", () => { onClick(item); markStale(); render(); });
    box.appendChild(b);
  });
}

function init() {
  buildChips("#genre-chips", DB.genres, g => g.label, null, g => {
    if (!toggleArr(state.genres, g.id, 2)) toast("ジャンルは2つまで(混ぜすぎると軸がぶれます)");
  });
  buildChips("#mood-chips", DB.moods, m => m.label, null, m => {
    if (!toggleArr(state.moods, m.id, 3)) toast("ムードは3つまで(相反すると打ち消し合います)");
  });
  buildChips("#singer-chips", DB.singers, s => s.label, null, s => {
    state.singer = state.singer === s.id ? null : s.id;
    if (state.singer === "inst") state.quality = null;
  });
  buildChips("#quality-chips", DB.voiceQualities, q => q.label, null, q => {
    state.quality = state.quality === q.id ? null : q.id;
  });
  buildChips("#tempo-chips", DB.tempoPresets, t => t.label, t => `${t.range} BPM`, t => {
    if (state.tempoWord === t.id) { state.tempoWord = null; state.bpm = null; }
    else { state.tempoWord = t.id; state.bpm = t.bpm; $("#bpm-input").value = t.bpm; }
  });
  buildChips("#key-chips", DB.keys, k => k.label, k => k.hint, k => {
    state.key = state.key === k.id ? "none" : k.id;
  });
  buildChips("#meter-chips", DB.meters, m => m.label, m => m.hint, m => {
    state.meter = m.id;
  });
  buildChips("#groove-chips", DB.grooves, g => g.label, null, g => {
    state.groove = state.groove === g.id ? "none" : g.id;
  });
  buildChips("#prod-chips", DB.productions, p => p.label, null, p => {
    state.prod = state.prod === p.id ? "none" : p.id;
  });
  buildChips("#era-chips", DB.eras, e => e.label, null, e => {
    state.era = state.era === e.id ? "none" : e.id;
  });
  buildChips("#dyn-chips", DB.dynamicsOpts, d => d.label, null, d => {
    state.dyn = state.dyn === d.id ? "none" : d.id;
  });

  // 楽器(グループ見出し付き)
  const instBox = $("#inst-groups");
  instBox.innerHTML = "";
  DB.instrumentGroups.forEach(grp => {
    const h = document.createElement("p");
    h.className = "inst-group-title";
    h.textContent = grp.group;
    instBox.appendChild(h);
    const wrap = document.createElement("div");
    wrap.className = "chip-row";
    grp.items.forEach(item => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.id = item.id;
      b.innerHTML = `<span>${item.label}</span>`;
      b.addEventListener("click", () => {
        if (!toggleArr(state.inst, item.id, 5)) toast("楽器は5つまで(多すぎると反映されにくくなります)");
        markStale();
        render();
      });
      wrap.appendChild(b);
    });
    instBox.appendChild(wrap);
  });

  // セクション演出
  const secBox = $("#section-fx-rows");
  DB.sections.forEach(sec => {
    const wrap = document.createElement("div");
    wrap.className = "section-fx-row";
    const h = document.createElement("p");
    h.className = "section-fx-title";
    h.textContent = sec.label;
    wrap.appendChild(h);
    const row = document.createElement("div");
    row.className = "chip-row";
    DB.sectionFX.forEach(fx => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.sec = sec.id;
      b.dataset.fx = fx.id;
      b.innerHTML = `<span>${fx.label}</span>`;
      b.addEventListener("click", () => {
        if (!toggleArr(state.sectionFX[sec.id], fx.id, 3)) toast("演出は1セクション3つまで");
        markStale();
        render();
      });
      row.appendChild(b);
    });
    wrap.appendChild(row);
    secBox.appendChild(wrap);
  });

  // レシピ
  const recipeBox = $("#recipe-cards");
  DB.recipes.forEach(r => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "recipe-card";
    card.innerHTML = `<strong>${r.label}</strong><span>${r.desc}</span>`;
    card.addEventListener("click", () => { applyRecipe(r); });
    recipeBox.appendChild(card);
  });

  // BPM直接入力
  $("#bpm-input").addEventListener("input", e => {
    const v = parseInt(e.target.value, 10);
    state.bpm = (v >= 40 && v <= 240) ? v : null;
    if (state.bpm) {
      state.tempoWord = null;
      DB.tempoPresets.forEach(t => {
        const [lo, hi] = t.range.split("〜").map(Number);
        if (state.bpm >= lo && state.bpm <= hi) state.tempoWord = t.id;
      });
    }
    markStale();
    render();
  });

  $("#autofill-toggle").addEventListener("change", e => { state.autoFill = e.target.checked; markStale(); render(); });
  $("#extra-input").addEventListener("input", () => { markStale(); render(); });

  $("#generate-btn").addEventListener("click", generate);
  $("#copy-style").addEventListener("click", () => {
    if (!state.generated) { toast("先に「スタイルを生成」を押してください"); return; }
    copyText($("#style-output").textContent, "スタイルプロンプトをコピーしました🎵");
  });
  $("#copy-exclude").addEventListener("click", () => copyText($("#exclude-output").value, "除外スタイルをコピーしました"));
  $("#copy-styled-lyrics").addEventListener("click", () => copyText($("#styled-lyrics").value, "スタイル入り歌詞をコピーしました🎼"));
  $("#copy-lyrics").addEventListener("click", () => copyText($("#lyrics-tagged").value, "タグ付き歌詞をコピーしました"));
  $("#save-history").addEventListener("click", saveHistory);
  $("#analyze-btn").addEventListener("click", analyzeLyrics);
  $("#tag-lyrics-btn").addEventListener("click", tagLyrics);
  $("#reset-btn").addEventListener("click", () => {
    if (confirm("すべての選択をリセットしますか?")) resetState();
  });

  buildConsult();
  renderHistory();
  render();
}

function resetState() {
  state.genres = []; state.moods = []; state.singer = null; state.quality = null;
  state.bpm = null; state.tempoWord = null; state.key = "none"; state.meter = "44";
  state.groove = "none"; state.inst = []; state.prod = "none"; state.era = "none";
  state.dyn = "none"; state.extras = [];
  state.generated = false; state.stale = false;
  DB.sections.forEach(s => { state.sectionFX[s.id] = []; });
  $("#styled-lyrics-wrap").hidden = true;
  $("#bpm-input").value = "";
  $("#extra-input").value = "";
  $$("#consult-box .chip").forEach(c => c.classList.remove("on"));
  render();
}

function applyRecipe(r) {
  const s = r.set;
  state.genres = [...s.genres];
  state.moods = [...s.moods];
  state.singer = s.singer; state.quality = s.quality;
  state.bpm = s.bpm; state.tempoWord = null;
  state.key = s.key; state.meter = s.meter; state.groove = s.groove;
  state.inst = [...s.inst]; state.prod = s.prod; state.era = s.era; state.dyn = s.dyn;
  DB.sections.forEach(sec => { state.sectionFX[sec.id] = (s.sfx && s.sfx[sec.id]) ? [...s.sfx[sec.id]] : []; });
  $("#bpm-input").value = s.bpm;
  toast(`レシピ「${r.label}」を読み込みました。ここから自由に調整OK!`);
  markStale();
  render();
  $("#step-genre").scrollIntoView({ behavior:"smooth" });
}

/* ============================================================
   相談モード
   ============================================================ */
function buildConsult() {
  const box = $("#consult-box");
  DB.consult.forEach((cq, qi) => {
    const div = document.createElement("div");
    div.className = "consult-q";
    const p = document.createElement("p");
    p.textContent = cq.q;
    div.appendChild(p);
    const row = document.createElement("div");
    row.className = "chip-row";
    cq.opts.forEach(opt => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.innerHTML = `<span>${opt.label}</span>`;
      b.addEventListener("click", () => {
        row.querySelectorAll(".chip").forEach(c => c.classList.remove("on"));
        b.classList.add("on");
        applyConsult(opt.apply);
        markStale();
        render();
      });
      row.appendChild(b);
    });
    div.appendChild(row);
    box.appendChild(div);
  });
}

function applyConsult(apply) {
  if (apply.moods) {
    apply.moods.forEach(m => { if (!state.moods.includes(m) && state.moods.length < 3) state.moods.push(m); });
  }
  if (apply.genres) {
    apply.genres.forEach(g => { if (!state.genres.includes(g) && state.genres.length < 2) state.genres.push(g); });
  }
  if (apply.singer && !state.singer) state.singer = apply.singer;
  if (apply.prod && state.prod === "none") state.prod = apply.prod;
  if (apply.era) state.era = apply.era;
  if (apply.dyn) state.dyn = apply.dyn;
  if (apply.extra && !state.extras.includes(apply.extra)) state.extras.push(apply.extra);
}

/* ============================================================
   歌詞分析
   ============================================================ */
function analyzeLyrics() {
  const text = $("#lyrics-input").value.trim();
  const box = $("#lyrics-suggest");
  box.innerHTML = "";
  if (!text) { toast("先に歌詞を入力してください"); return; }

  const hits = [];
  DB.lyricRules.forEach(rule => {
    const m = text.match(rule.re);
    if (m) hits.push({ rule, count: m.length });
  });
  hits.sort((a, b) => b.count - a.count);

  if (!hits.length) {
    box.innerHTML = `<p class="suggest-none">はっきりした情景ワードは見つかりませんでした。ジャンルとムードを自分で選んでみてください!</p>`;
    return;
  }

  const p = document.createElement("p");
  p.className = "suggest-label";
  p.textContent = "歌詞から読み取った提案(タップで反映):";
  box.appendChild(p);

  hits.slice(0, 4).forEach(({ rule }) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip suggest-chip";
    const gLabels = (rule.apply.genres || []).map(id => findGenre(id)?.label).filter(Boolean).join("・");
    const mLabels = (rule.apply.moods || []).map(id => findMood(id)?.label).filter(Boolean).join("・");
    b.innerHTML = `<span>${rule.hint}</span><small>${[gLabels, mLabels].filter(Boolean).join(" / ")}</small>`;
    b.addEventListener("click", () => {
      applyConsult(rule.apply);
      if (rule.apply.keyPref && state.key === "none") {
        state.key = rule.apply.keyPref === "minor" ? "amin" : "cmaj";
      }
      b.classList.add("on");
      markStale();
      render();
      toast("歌詞の雰囲気を選択に反映しました");
    });
    box.appendChild(b);
  });
}

/* ---------- 歌詞にセクションタグを付ける ---------- */
function tagLyrics() {
  const text = $("#lyrics-input").value.trim();
  if (!text) { toast("先に歌詞を入力してください"); return; }
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const seen = new Map();
  let verse = 0;
  const out = [];
  blocks.forEach((b, i) => {
    const norm = b.replace(/\s+/g, "");
    let tag;
    if (seen.has(norm)) {
      tag = "[Chorus]";
      seen.set(norm, "[Chorus]");
      const firstIdx = out.findIndex(o => o.norm === norm);
      if (firstIdx >= 0) out[firstIdx].tag = "[Chorus]";
    } else if (i === blocks.length - 1 && blocks.length >= 3 && b.split("\n").length <= 2) {
      tag = "[Outro]";
    } else {
      verse += 1;
      tag = `[Verse ${verse}]`;
      seen.set(norm, tag);
    }
    out.push({ tag, body: b, norm });
  });
  // Chorus昇格でVerse番号が飛んだ場合に振り直す
  let vn = 0;
  out.forEach(o => {
    if (o.tag.startsWith("[Verse")) { vn += 1; o.tag = `[Verse ${vn}]`; }
  });
  const result = "[Intro]\n\n" + out.map(o => `${o.tag}\n${o.body}`).join("\n\n");
  $("#lyrics-tagged").value = result;
  $("#lyrics-tagged-wrap").hidden = false;
  toast("セクションタグを付けました。Sunoの歌詞欄にどうぞ");
}

/* ============================================================
   プロンプト生成(フロントロード方式)
   ============================================================ */
function buildPrompt() {
  const core = [];
  const detail = [];

  /* --- 1. ジャンル(最重要・先頭) --- */
  const gs = state.genres.map(findGenre).filter(Boolean);
  if (gs.length === 2) {
    core.push(`${gs[0].tag} fused with ${gs[1].tag}`);
  } else if (gs.length === 1) {
    core.push(gs[0].tag);
  }

  /* --- 2. ムード --- */
  const ms = state.moods.map(findMood).filter(Boolean);
  if (ms.length) core.push(ms.map(m => m.tag).join(" and "));

  /* --- 3. ボーカル --- */
  const singer = DB.singers.find(s => s.id === state.singer);
  if (singer) {
    if (singer.id === "inst") {
      core.push(singer.tag);
    } else {
      const q = DB.voiceQualities.find(v => v.id === state.quality);
      core.push(q ? `${q.tag} ${singer.tag}` : singer.tag);
    }
  }

  /* --- 4. テンポ/BPM --- */
  let bpm = state.bpm;
  if (!bpm && state.autoFill && gs.length) bpm = gs[0].bpm[2];
  if (bpm) {
    const t = DB.tempoPresets.find(t => t.id === state.tempoWord);
    core.push(t && t.word !== "mid-tempo" ? `${t.word} ${bpm} BPM` : `${bpm} BPM`);
  }

  /* --- 5. キー --- */
  const key = DB.keys.find(k => k.id === state.key);
  if (key && key.tag) core.push(key.tag);

  /* --- 6. 拍子・グルーヴ --- */
  const meter = DB.meters.find(m => m.id === state.meter);
  if (meter && meter.tag) core.push(meter.tag);
  const groove = DB.grooves.find(g => g.id === state.groove);
  if (groove && groove.tag) core.push(groove.tag);

  /* --- 7. 楽器(ディテール先頭) --- */
  let instTags = state.inst.map(id => findInst(id)?.tag).filter(Boolean);
  if (!instTags.length && state.autoFill && gs.length) instTags = gs[0].inst.slice(0, 3);
  detail.push(...instTags);

  /* --- 8. プロダクション --- */
  const prod = DB.productions.find(p => p.id === state.prod);
  if (prod && prod.tag) detail.push(prod.tag);
  else if (state.autoFill && gs.length) detail.push(gs[0].prod);

  /* --- 9. 年代・展開・追加 --- */
  const era = DB.eras.find(e => e.id === state.era);
  if (era && era.tag) detail.push(era.tag);
  const dyn = DB.dynamicsOpts.find(d => d.id === state.dyn);
  if (dyn && dyn.tag) detail.push(dyn.tag);

  /* --- セクション演出のサマリーをスタイル欄にも反映 --- */
  const allFX = Object.values(state.sectionFX).flat();
  if (allFX.some(id => id.startsWith("meter"))) detail.push("mid-song time signature changes");
  if (allFX.some(id => id.startsWith("key"))) detail.push("dramatic mid-song key change");
  if (allFX.includes("halftime") || allFX.includes("doubletime")) detail.push("tempo feel shifts between sections");

  state.extras.forEach(x => detail.push(x));
  const extra = $("#extra-input").value.trim();
  if (extra) detail.push(extra);

  let coreStr = core.join(", ");
  if (coreStr) coreStr = coreStr.charAt(0).toUpperCase() + coreStr.slice(1);
  const detailStr = detail.join(", ");
  const full = [coreStr, detailStr].filter(Boolean).join(", ");
  const tagCount = core.length + detail.length;

  return { coreStr, detailStr, full, tagCount, bpm, gs, ms };
}

/* ---------- 除外スタイル ---------- */
function buildExclude(gs) {
  const parts = new Set();
  gs.forEach(g => g.excl.split(",").map(s => s.trim()).forEach(s => parts.add(s)));
  if (state.singer === "inst") parts.add("vocals");
  if (state.prod === "lofiTex") parts.add("polished pop production");
  return [...parts].slice(0, 6).join(", ");
}

/* ---------- 警告 ---------- */
function buildWarnings(res) {
  const warns = [];
  // ムード矛盾
  DB.moodConflicts.forEach(([a, b]) => {
    if (state.moods.includes(a) && state.moods.includes(b)) {
      warns.push(`⚠️ ムード「${findMood(a).label}」と「${findMood(b).label}」は打ち消し合います。どちらかに絞るのがおすすめ`);
    }
  });
  // BPMとジャンルのミスマッチ
  if (res.bpm && res.gs.length) {
    const g = res.gs[0];
    if (res.bpm < g.bpm[0] - 15 || res.bpm > g.bpm[1] + 15) {
      warns.push(`⚠️ ${g.label}の定番BPMは${g.bpm[0]}〜${g.bpm[1]}。${res.bpm} BPMだと意図と違う解釈をされるかも`);
    }
  }
  // タグ数
  if (res.tagCount > 15) warns.push(`⚠️ タグが${res.tagCount}個。15個を超えると後半が無視されやすくなります`);
  else if (res.tagCount > 0 && res.tagCount < 4) warns.push(`💡 タグが${res.tagCount}個だけ。あと2〜3個足すと精度が上がります(最適は5〜12個)`);
  // 文字数
  if (res.full.length > 1000) warns.push(`⚠️ ${res.full.length}字。スタイル欄の上限(約1000字)を超えています`);
  else if (res.coreStr.length > 200) warns.push(`💡 コア部分が${res.coreStr.length}字。最重要要素は前半200字に収まるとベスト`);
  // 変拍子×ダンス系
  if (["54","78"].includes(state.meter) && state.genres.some(g => ["edm","house","techno","idol"].includes(g))) {
    warns.push(`💡 変拍子×ダンス系は難易度高め。生成回数を多めに試すのがコツ`);
  }
  return warns;
}

/* ============================================================
   生成ボタン
   ============================================================ */
function generate() {
  const res = buildPrompt();
  if (!res.full) {
    toast("まずジャンルかムードを選んでください🎧");
    $("#step-genre").scrollIntoView({ behavior: "smooth" });
    return;
  }
  state.generated = true;
  state.stale = false;
  renderOutput(res);
  buildStyledLyrics(res);
  render();
  $("#output-panel").scrollIntoView({ behavior: "smooth" });
  toast("スタイルプロンプトを生成しました✨");
}

/* ============================================================
   スタイル入り歌詞(冒頭メタタグ + セクションごとのパイプタグ)
   Suno実例調査による表記ルール:
   - 冒頭は [Mood: ] [Energy: ] [Instrumental: ] など短い個別タグを積む
     (長い説明文の [Style: 〜] は歌詞として歌われる事故のリスクがあるため避ける)
   - セクション内の局所変化は [Chorus | Key Change] のようにパイプ区切りの
     短い認識語のみを使う(Build-Up / Breakdown / Drop / Key Change 等)
   ============================================================ */
function fxShortsFor(secId) {
  return state.sectionFX[secId]
    .map(id => DB.sectionFX.find(f => f.id === id)?.short)
    .filter(Boolean);
}

function sectionTag(sunoName, secId) {
  const fx = fxShortsFor(secId);
  return fx.length ? `[${sunoName} | ${fx.join(", ")}]` : `[${sunoName}]`;
}

/* ムード+BPMから大まかなエネルギー感を推定 */
function estimateEnergy(res) {
  const HIGH = ["energetic", "euphoric", "aggressive", "triumphant"];
  const LOW = ["peaceful", "chill", "cozy", "melancholic", "dreamy", "haunting"];
  let score = 0;
  state.moods.forEach(m => { if (HIGH.includes(m)) score += 1; if (LOW.includes(m)) score -= 1; });
  if (res.bpm) { if (res.bpm >= 130) score += 1; else if (res.bpm < 85) score -= 1; }
  if (score > 0) return "High";
  if (score < 0) return "Low";
  return "Medium";
}

function buildTopMetaTags(res) {
  const lines = [];
  if (res.gs.length) {
    lines.push(`[Genre: ${res.gs.map(g => g.tag).join(", ")}]`);
  }
  if (res.ms.length) {
    const moodWords = res.ms.map(m => m.tag.replace(/^\w/, c => c.toUpperCase()));
    lines.push(`[Mood: ${moodWords.join(", ")}]`);
  }
  lines.push(`[Energy: ${estimateEnergy(res)}]`);
  let instTags = state.inst.map(id => findInst(id)?.tag).filter(Boolean);
  if (!instTags.length && res.gs.length) instTags = res.gs[0].inst;
  instTags = instTags.slice(0, 3).map(t => t.replace(/^\w/, c => c.toUpperCase()));
  if (instTags.length) lines.push(`[Instrument: ${instTags.join(", ")}]`);
  if (state.singer === "inst") lines.push("[Instrumental]");
  return lines;
}

function buildStyledLyrics(res) {
  const wrap = $("#styled-lyrics-wrap");
  const text = $("#lyrics-input").value.trim();
  if (!text) { wrap.hidden = true; return; }

  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const norm = (b) => b.replace(/\s+/g, "");
  const counts = {};
  blocks.forEach(b => { counts[norm(b)] = (counts[norm(b)] || 0) + 1; });

  // サビ判定: 最も繰り返されているブロック(2回以上)
  let chorusNorm = null, best = 1;
  Object.entries(counts).forEach(([n, c]) => {
    if (c > best || (c === best && c >= 2 && n.length > (chorusNorm?.length || 0))) {
      if (c >= 2) { chorusNorm = n; best = c; }
    }
  });

  const kinds = blocks.map(b => (norm(b) === chorusNorm ? "chorus" : null));
  // Bメロ判定: サビの直前の非サビブロック(先頭以外)
  kinds.forEach((k, i) => {
    if (k === null && kinds[i + 1] === "chorus" && i > 0) kinds[i] = "prechorus";
  });
  // Cメロ判定: 一度サビが出た後の非サビ・非Bメロブロック(最終ブロック以外)
  const firstChorus = kinds.indexOf("chorus");
  kinds.forEach((k, i) => {
    if (k === null && firstChorus >= 0 && i > firstChorus && i < blocks.length - 1) kinds[i] = "bridge";
  });
  // アウトロ判定: 最後の短いブロック
  const last = blocks.length - 1;
  if (kinds[last] === null && blocks.length >= 3 && blocks[last].split("\n").length <= 2) kinds[last] = "outro";

  let verse = 0;
  const lines = [];
  buildTopMetaTags(res).forEach(l => lines.push(l));
  lines.push("");
  lines.push(sectionTag("Intro", "intro"));
  blocks.forEach((b, i) => {
    lines.push("");
    if (kinds[i] === "chorus")        lines.push(sectionTag("Chorus", "chorus"));
    else if (kinds[i] === "prechorus") lines.push(sectionTag("Pre-Chorus", "prechorus"));
    else if (kinds[i] === "bridge")    lines.push(sectionTag("Bridge", "bridge"));
    else if (kinds[i] === "outro")     lines.push(sectionTag("Outro", "outro"));
    else { verse += 1;                 lines.push(sectionTag(`Verse ${verse}`, "verse")); }
    lines.push(b);
  });
  // 歌詞にアウトロが無い場合、演出指定があればタグだけ足す
  if (!kinds.includes("outro") && fxShortsFor("outro").length) {
    lines.push("");
    lines.push(sectionTag("Outro", "outro"));
  }

  $("#styled-lyrics").value = lines.join("\n");
  wrap.hidden = false;
}

function renderOutput(res) {
  const out = $("#style-output");
  out.innerHTML = `<mark class="core-part">${escapeHtml(res.coreStr)}</mark>` +
    (res.detailStr ? `<span class="detail-part">, ${escapeHtml(res.detailStr)}</span>` : "");

  const len = res.full.length;
  $("#char-count").textContent = `${len} / 1000字`;
  $("#tag-count").textContent = `タグ ${res.tagCount}個`;
  const gauge = $("#char-gauge-fill");
  gauge.style.width = Math.min(100, len / 10) + "%";
  gauge.classList.toggle("over", len > 1000);
  $("#tag-count").classList.toggle("good", res.tagCount >= 5 && res.tagCount <= 12);

  $("#exclude-output").value = buildExclude(res.gs);

  const wbox = $("#warnings");
  const warns = buildWarnings(res);
  wbox.innerHTML = warns.map(w => `<p>${w}</p>`).join("");
  wbox.hidden = !warns.length;
}

/* ============================================================
   描画(選択状態のみ。出力は生成ボタンで更新)
   ============================================================ */
function render() {
  // チップのON状態
  $$("#genre-chips .chip").forEach(c => c.classList.toggle("on", state.genres.includes(c.dataset.id)));
  $$("#genre-chips .chip").forEach(c => {
    c.classList.toggle("main-genre", state.genres[0] === c.dataset.id && state.genres.length > 1);
  });
  $$("#mood-chips .chip").forEach(c => c.classList.toggle("on", state.moods.includes(c.dataset.id)));
  $$("#singer-chips .chip").forEach(c => c.classList.toggle("on", state.singer === c.dataset.id));
  $$("#quality-chips .chip").forEach(c => c.classList.toggle("on", state.quality === c.dataset.id));
  $("#quality-row").style.display = (state.singer && state.singer !== "inst") ? "" : "none";
  $$("#tempo-chips .chip").forEach(c => c.classList.toggle("on", state.tempoWord === c.dataset.id));
  $$("#key-chips .chip").forEach(c => c.classList.toggle("on", state.key === c.dataset.id));
  $$("#meter-chips .chip").forEach(c => c.classList.toggle("on", state.meter === c.dataset.id));
  $$("#groove-chips .chip").forEach(c => c.classList.toggle("on", state.groove === c.dataset.id));
  $$("#inst-groups .chip").forEach(c => c.classList.toggle("on", state.inst.includes(c.dataset.id)));
  $$("#section-fx-rows .chip").forEach(c => c.classList.toggle("on", state.sectionFX[c.dataset.sec]?.includes(c.dataset.fx)));
  $$("#prod-chips .chip").forEach(c => c.classList.toggle("on", state.prod === c.dataset.id));
  $$("#era-chips .chip").forEach(c => c.classList.toggle("on", state.era === c.dataset.id));
  $$("#dyn-chips .chip").forEach(c => c.classList.toggle("on", state.dyn === c.dataset.id));

  // 生成後に選択が変わったら「再生成してね」の目印
  const note = $("#stale-note");
  if (note) note.hidden = !(state.generated && state.stale);

  // 未生成のときはプレースホルダーを維持
  if (!state.generated) {
    $("#style-output").innerHTML =
      `<span class="placeholder">選んだら、下の「スタイルを生成」ボタンを押してください</span>`;
  }

  // 選択サマリー
  renderSummary(buildPrompt());
}

/* 選択が変わったときに呼ぶ(チップのclickハンドラ経由) */
function markStale() {
  if (state.generated) state.stale = true;
}

function renderSummary(res) {
  const items = [];
  state.genres.forEach((id, i) => items.push((i === 0 && state.genres.length > 1 ? "主軸: " : "") + findGenre(id).label));
  state.moods.forEach(id => items.push(findMood(id).label));
  const singer = DB.singers.find(s => s.id === state.singer);
  if (singer) items.push(singer.label);
  if (state.bpm) items.push(`${state.bpm} BPM`);
  const key = DB.keys.find(k => k.id === state.key);
  if (key && key.tag) items.push(key.label);
  const meter = DB.meters.find(m => m.id === state.meter);
  if (meter && meter.tag) items.push(meter.label.split("(")[0]);
  state.inst.forEach(id => items.push(findInst(id).label));
  const fxCount = Object.values(state.sectionFX).flat().length;
  if (fxCount) items.push(`セクション演出×${fxCount}`);
  $("#pick-count").textContent = items.length ? `選択中: ${items.join(" / ")}` : "まだ何も選ばれていません";
}

/* ============================================================
   履歴 (localStorage)
   ============================================================ */
const LS_KEY = "sunoKoubouHistory";

function saveHistory() {
  if (!state.generated) { toast("先に「スタイルを生成」を押してください"); return; }
  const res = buildPrompt();
  if (!res.full) { toast("先にプロンプトを作ってください"); return; }
  const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  list.unshift({ date: new Date().toLocaleString("ja-JP"), prompt: res.full, exclude: $("#exclude-output").value });
  localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 20)));
  renderHistory();
  toast("履歴に保存しました📁");
}

function renderHistory() {
  const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  const box = $("#history-list");
  box.innerHTML = "";
  $("#history-panel").hidden = !list.length;
  list.forEach((h, i) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<time>${h.date}</time><p>${escapeHtml(h.prompt)}</p>`;
    const row = document.createElement("div");
    row.className = "history-actions";
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "コピー";
    copyBtn.addEventListener("click", () => copyText(h.prompt, "コピーしました"));
    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => {
      list.splice(i, 1);
      localStorage.setItem(LS_KEY, JSON.stringify(list));
      renderHistory();
    });
    row.append(copyBtn, delBtn);
    div.appendChild(row);
    box.appendChild(div);
  });
}

/* ---------- ユーティリティ ---------- */
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

function copyText(text, msg) {
  if (!text || !text.trim()) { toast("コピーする内容がありません"); return; }
  navigator.clipboard.writeText(text).then(() => toast(msg)).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast(msg);
  });
}

let toastTimer = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------- Service Worker ---------- */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

document.addEventListener("DOMContentLoaded", init);

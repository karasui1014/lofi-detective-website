/* ============================================================
   シーダンス2.5 プロンプト工房 ── 状態管理とUI
   ============================================================ */
"use strict";

/* ---------- モード定義 ---------- */
const MODES = [
  {
    id: "lv0", name: "おまかせ1カット", tag: "Lv0",
    sub: "用意するもの：ゼロ",
    desc: "テキストだけで生成します。イメージ映像・Bロール・SNSの単発向け。",
    prepare: [
      "何も要りません。やりたいことを一行書けば始められます",
      "※ 同じ人物を次の生成でもう一度出すことは<b>できません</b>（顔が変わります）"
    ]
  },
  {
    id: "lv1", name: "キャラ・商品を固定", tag: "Lv1", recommend: true,
    sub: "用意するもの：参照画像 4〜7枚",
    desc: "同じ人物・同じ商品が生成をまたいで固定されます。連作が作れる実用ゾーン。",
    prepare: [
      "顔がはっきり写った画像（1〜2枚）",
      "衣装・商品の色と質感がわかる画像",
      "ロケーション（場所）の画像",
      "小道具・ロゴなど固定したいものの画像",
      "色トーンの見本画像",
      "※ 50枚まで入りますが、<b>増やすほど破綻します。4〜7枚が最適</b>"
    ]
  },
  {
    id: "lv2", name: "30秒フル演出", tag: "Lv2",
    sub: "用意するもの：素材 ＋ コンテ ＋ 音声設計",
    desc: "広告・ショートドラマ・MV本編レベル。30秒尺を使い切るなら台本は実質必須です。",
    prepare: [
      "参照素材フォルダ（人物 / 衣装 / ロケ / 小道具 / トーンで分類）",
      "30秒1シーンのコンテ（起点 → 展開 → 着地）",
      "音声設計（環境音・効果音・セリフ・音楽と、鳴るタイミング）",
      "キャラクター定義（視覚アンカー3〜5個を毎回同じ文で使い回す）"
    ]
  },
  {
    id: "edit", name: "既存動画を部分修正", tag: "編集",
    sub: "用意するもの：直したい動画1本",
    desc: "作り直さずに一部だけ差し替えます。やり直しコストを激減させる機能です。",
    prepare: [
      "直したい動画（<b>20秒以下がいちばん安定</b>します）",
      "差し替え用の画像（必要なら）",
      "※ 「何を変えないか（Keep）」を書かないと全体が作り直されます"
    ]
  }
];

/* モードごとに表示するパネル */
const VISIBLE = {
  lv0:  ["step-mode", "step-meta", "step-beats", "step-look", "step-audio", "step-guards"],
  lv1:  ["step-mode", "step-meta", "step-characters", "step-refs", "step-beats", "step-look", "step-audio", "step-guards"],
  lv2:  ["step-mode", "step-meta", "step-characters", "step-refs", "step-opening", "step-beats", "step-closing", "step-look", "step-audio", "step-guards"],
  edit: ["step-mode", "step-meta", "step-refs", "step-edit", "step-beats", "step-guards"]
};

const STORE_KEY = "seedance_koubou_v1";
let uid = 0;
const nid = () => "i" + (++uid) + "_" + Date.now().toString(36);

/* ---------- 初期状態 ---------- */
function blankState() {
  return {
    version: 1,
    mode: "lv1",
    meta: { name: "", purpose: "", summary: "", duration: 15, aspect: "16:9", resolution: "1080p" },
    characters: [],
    refs: [],
    opening: "",
    closing: "",
    beats: [],
    look: { startSize: "", endSize: "", height: "", pace: "", lighting: [], textures: [], colors: [] },
    audio: { ambience: "", music: "", silence: false, dialogues: [], captions: "" },
    guards: { avoid: [], locks: [] },
    edit: { keep: "" }
  };
}

let state = blankState();
let lang = "mix";

/* ---------- 小道具 ---------- */
const $ = id => document.getElementById(id);
function esc(v) {
  return String(v === null || v === undefined ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function optionsFrom(dict, selected, blankLabel) {
  let h = blankLabel ? '<option value="">' + esc(blankLabel) + "</option>" : "";
  dict.forEach(d => {
    const v = typeof d === "string" ? d : d.en;
    const l = typeof d === "string" ? d : d.ja + "（" + d.en + "）";
    h += '<option value="' + esc(v) + '"' + (v === selected ? " selected" : "") + ">" + esc(l) + "</option>";
  });
  return h;
}
let toastTimer = null;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

/* ---------- ビートのひな形 ---------- */
function evenBeats(n, duration) {
  const base = Math.floor(duration / n);
  const secs = new Array(n).fill(base);
  let rest = duration - base * n;
  let i = 0;
  while (rest > 0) { secs[i % n]++; rest--; i++; }
  return secs;
}
function newBeat(sec) {
  return { id: nid(), sec: sec || 5, event: "", move: "", sfx: "" };
}
function templateBeats(duration) {
  const a = Math.max(1, Math.round(duration * 0.2));
  const c = Math.max(1, Math.round(duration * 0.25));
  const b = Math.max(1, duration - a - c);
  const beats = [newBeat(a), newBeat(b), newBeat(c)];
  beats[0].move = "locked-off";
  beats[1].move = "dolly out";
  beats[2].move = "";
  return beats;
}

/* ============================================================
   描画：構造（追加・削除でだけ呼ぶ）
   ============================================================ */
function renderStructure() {
  /* パネルの出し入れ */
  const show = VISIBLE[state.mode] || VISIBLE.lv1;
  document.querySelectorAll("main .panel").forEach(p => {
    p.hidden = show.indexOf(p.id) === -1;
  });
  /* 番号を振り直す */
  let n = 0;
  document.querySelectorAll("main .panel").forEach(p => {
    if (p.hidden) return;
    n++;
    const num = p.querySelector(".step-num");
    if (num) num.textContent = n;
  });

  renderModes();
  renderCharacters();
  renderRefs();
  renderBeats();
  renderDialogues();
  renderOutput();
}

function renderModes() {
  const box = $("mode-grid");
  box.innerHTML = MODES.map(m =>
    '<button type="button" class="mode-card' + (state.mode === m.id ? " on" : "") + '" data-mode="' + m.id + '">' +
    '<span class="mode-tag">' + esc(m.tag) + (m.recommend ? '<span class="rec">推奨</span>' : "") + "</span>" +
    '<span class="mode-name">' + esc(m.name) + "</span>" +
    '<span class="mode-sub">' + esc(m.sub) + "</span>" +
    '<span class="mode-desc">' + esc(m.desc) + "</span>" +
    "</button>"
  ).join("");

  const m = MODES.find(x => x.id === state.mode);
  $("prepare-box").innerHTML =
    "<h3>このモードで用意するもの</h3><ul>" +
    m.prepare.map(p => "<li>" + p + "</li>").join("") + "</ul>";
}

function renderCharacters() {
  const box = $("character-list");
  if (!state.characters.length) {
    box.innerHTML = '<p class="empty">まだ人物がいません。固定したい人物がいれば追加してください。</p>';
    return;
  }
  box.innerHTML = state.characters.map((c, i) =>
    '<div class="card" data-id="' + c.id + '">' +
      '<div class="card-head">' +
        '<input type="text" class="label-input" data-k="label" value="' + esc(c.label) + '" placeholder="&lt;配達員&gt;" maxlength="24">' +
        '<span class="anchor-count" data-count="' + c.id + '"></span>' +
        '<button type="button" class="del" data-del-char="' + c.id + '">削除</button>' +
      "</div>" +
      '<div class="grid-5">' +
        '<label>年齢・体型<input type="text" data-k="build" value="' + esc(c.build) + '" placeholder="30代前半・細身"></label>' +
        '<label>髪<input type="text" data-k="hair" value="' + esc(c.hair) + '" placeholder="黒髪のショート"></label>' +
        '<label>顔の特徴<input type="text" data-k="face" value="' + esc(c.face) + '" placeholder="左目の下にほくろ"></label>' +
        '<label>衣装<input type="text" data-k="wardrobe" value="' + esc(c.wardrobe) + '" placeholder="くすんだ緑のジャケット"></label>' +
        '<label>持ち物<input type="text" data-k="props" value="' + esc(c.props) + '" placeholder="真鍮の筒"></label>' +
      "</div>" +
    "</div>"
  ).join("");
  updateAnchorCounts();
}

function updateAnchorCounts() {
  state.characters.forEach(c => {
    const el = document.querySelector('[data-count="' + c.id + '"]');
    if (!el) return;
    const n = [c.build, c.hair, c.face, c.wardrobe, c.props].filter(v => (v || "").trim()).length;
    el.textContent = "視覚アンカー " + n + " / 5";
    el.className = "anchor-count" + (n >= 3 ? " ok" : " ng");
  });
}

function renderRefs() {
  const box = $("ref-list");
  if (!state.refs.length) {
    box.innerHTML = '<p class="empty">素材がありません。下のボタンから追加してください。</p>';
    return;
  }
  const boundChoices = [
    { v: "", l: "（紐づけなし）" },
    { v: "全体", l: "全体" }
  ].concat(state.characters.map(c => ({ v: c.label, l: c.label })));

  box.innerHTML = state.refs.map((r, i) => {
    const label = Builder.refLabel(state.refs, r);
    /* 人物名を変えた・消した場合でも選択が消えないよう、無い値はその場で足す */
    const choices = boundChoices.some(c => c.v === r.boundTo)
      ? boundChoices
      : boundChoices.concat([{ v: r.boundTo, l: r.boundTo + "（存在しない人物）" }]);
    const sel = choices.map(c =>
      '<option value="' + esc(c.v) + '"' + (c.v === r.boundTo ? " selected" : "") + ">" + esc(c.l) + "</option>"
    ).join("");
    return '<div class="card ref-card" data-id="' + r.id + '">' +
      '<div class="card-head">' +
        '<span class="ref-label ref-' + r.kind + '">' + esc(label) + "</span>" +
        '<button type="button" class="move" data-move-ref="' + r.id + '" data-dir="-1"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" class="move" data-move-ref="' + r.id + '" data-dir="1"' + (i === state.refs.length - 1 ? " disabled" : "") + ">↓</button>" +
        '<button type="button" class="del" data-del-ref="' + r.id + '">削除</button>' +
      "</div>" +
      '<div class="grid-4">' +
        '<label>使う属性<span class="req">必須</span><input type="text" data-k="uses" value="' + esc(r.uses) + '" placeholder="顔立ちと髪型"></label>' +
        '<label>使わない属性<input type="text" data-k="notUses" value="' + esc(r.notUses) + '" placeholder="背景・構図・衣装"></label>' +
        "<label>紐づけ先<select data-k=\"boundTo\">" + sel + "</select></label>" +
        '<label>同一物グループ<input type="text" data-k="groupTag" value="' + esc(r.groupTag) + '" placeholder="真鍮の筒"></label>' +
      "</div>" +
    "</div>";
  }).join("");
}

function renderBeats() {
  const box = $("beat-list");
  if (!state.beats.length) {
    box.innerHTML = '<p class="empty">ビートがありません。「静→動→静で入れ直す」が手っ取り早いです。</p>';
    return;
  }
  const tl = Builder.timeline(state.beats);
  box.innerHTML = state.beats.map((b, i) => {
    const t = tl[i];
    return '<div class="card beat-card" data-id="' + b.id + '">' +
      '<div class="card-head">' +
        '<span class="beat-no">ビート' + (i + 1) + "</span>" +
        '<span class="beat-time">' + t.start + "-" + t.end + "s</span>" +
        '<label class="sec-input">秒数<input type="number" min="1" max="180" data-k="sec" value="' + esc(b.sec) + '"></label>' +
        '<button type="button" class="move" data-move-beat="' + b.id + '" data-dir="-1"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" class="move" data-move-beat="' + b.id + '" data-dir="1"' + (i === state.beats.length - 1 ? " disabled" : "") + ">↓</button>" +
        '<button type="button" class="del" data-del-beat="' + b.id + '">削除</button>' +
      "</div>" +
      '<label class="full">この区間で起きること<span class="req">必須</span>' +
        '<textarea data-k="event" rows="2" placeholder="動作の力学で書く。例:左手をカウンターに置き、筒を両手で持ち上げる">' + esc(b.event) + "</textarea>" +
      "</label>" +
      '<div class="grid-2">' +
        "<label>カメラの動き（1つだけ）<select data-k=\"move\">" + optionsFrom(CAMERA_MOVES, b.move, "指定なし") + "</select></label>" +
        '<label>この瞬間に鳴る音<input type="text" data-k="sfx" value="' + esc(b.sfx) + '" placeholder="真鍮の鐘が1回"></label>' +
      "</div>" +
    "</div>";
  }).join("");
}

function renderDialogues() {
  const box = $("dialogue-list");
  const d = state.audio.dialogues;
  if (!d.length) { box.innerHTML = ""; return; }
  box.innerHTML = d.map(x =>
    '<div class="card dlg-card" data-id="' + x.id + '">' +
      '<div class="grid-4">' +
        '<label>話者<input type="text" data-k="speaker" value="' + esc(x.speaker) + '" placeholder="&lt;配達員&gt;"></label>' +
        "<label>言語<select data-k=\"lang\">" + optionsFrom(DIALOG_LANGS, x.lang) + "</select></label>" +
        "<label>話し方<select data-k=\"manner\">" + optionsFrom(DIALOG_MANNERS, x.manner, "指定なし") + "</select></label>" +
        '<label>秒<input type="number" min="0" data-k="at" value="' + esc(x.at) + '"></label>' +
      "</div>" +
      '<div class="dlg-line">' +
        '<input type="text" class="full-input" data-k="text" value="' + esc(x.text) + '" placeholder="セリフ本文（短く）">' +
        '<button type="button" class="del" data-del-dlg="' + x.id + '">削除</button>' +
      "</div>" +
    "</div>"
  ).join("");
}

/* ============================================================
   描画：出力（入力のたびに呼ぶ・軽い処理だけ）
   ============================================================ */
function renderOutput() {
  /* ビートバー */
  const bar = $("beat-bar");
  bar.innerHTML = "";
  const tl = Builder.timeline(state.beats);
  tl.forEach((t, i) => {
    const seg = document.createElement("div");
    seg.className = "seg seg-" + (i % 4);
    seg.style.flexGrow = String(Math.max(1, t.beat.sec));
    seg.textContent = t.beat.sec + "s";
    seg.title = "ビート" + (i + 1) + "：" + t.start + "-" + t.end + "s";
    bar.appendChild(seg);
  });
  const total = state.beats.reduce((a, b) => a + (Number(b.sec) || 0), 0);
  const ok = total === Number(state.meta.duration);
  const tot = $("beat-total");
  tot.textContent = "合計 " + total + "秒 / 総尺 " + state.meta.duration + "秒" + (ok ? "　一致しています" : "　← 一致していません");
  tot.className = "beat-total" + (ok ? " ok" : " ng");

  /* 素材カウント */
  const nI = state.refs.filter(r => r.kind === "image").length;
  const nV = state.refs.filter(r => r.kind === "video").length;
  const nA = state.refs.filter(r => r.kind === "audio").length;
  $("ref-count").textContent =
    "画像 " + nI + "/" + LIMITS.images + "　動画 " + nV + "/" + LIMITS.videos +
    "　音声 " + nA + "/" + LIMITS.audios + "　合計 " + state.refs.length + "/" + LIMITS.total;

  /* 本体 */
  const text = Builder.build(state, lang);
  $("output").textContent = text || "（左のフォームを埋めるとここに出ます）";
  $("charcount").textContent = text.length + "字";

  /* 検証 */
  const issues = Validator.run(state);
  const nErr = issues.filter(i => i.level === "error").length;
  const nWarn = issues.filter(i => i.level === "warn").length;
  const box = $("verify");
  const head = '<h3 class="verify-head">破綻チェック' +
    '<span class="pill err' + (nErr ? "" : " off") + '">エラー ' + nErr + "</span>" +
    '<span class="pill warn' + (nWarn ? "" : " off") + '">警告 ' + nWarn + "</span>" +
    "</h3>";
  if (!issues.length) {
    box.innerHTML = head + '<p class="verify-clean">問題は見つかりませんでした。このまま生成できます。</p>';
  } else {
    box.innerHTML = head + '<ul class="verify-list">' + issues.map(i =>
      '<li class="lv-' + i.level + '"><span class="vid">' + i.id + "</span>" +
      "<span class=\"vmsg\">" + esc(i.msg) +
      (i.hint ? '<span class="vhint">' + esc(i.hint) + "</span>" : "") + "</span></li>"
    ).join("") + "</ul>";
  }
  $("btn-copy").className = nErr ? "primary has-error" : "primary";

  saveCurrent();
}

/* ============================================================
   静的コントロールの初期化と同期
   ============================================================ */
function initStaticControls() {
  $("meta-duration").innerHTML = optionsFrom(DURATIONS.map(String), String(state.meta.duration));
  $("meta-aspect").innerHTML = optionsFrom(ASPECTS, state.meta.aspect);
  $("meta-resolution").innerHTML = optionsFrom(RESOLUTIONS, state.meta.resolution);
  $("preset-select").innerHTML = '<option value="">選ぶと下がまとめて入ります</option>' +
    PRESETS.map(p => '<option value="' + p.id + '">' + esc(p.name) + "</option>").join("");
  $("look-start").innerHTML = optionsFrom(SHOT_SIZES, state.look.startSize, "指定なし");
  $("look-end").innerHTML = optionsFrom(SHOT_SIZES, state.look.endSize, "指定なし");
  $("look-height").innerHTML = optionsFrom(CAMERA_HEIGHTS, state.look.height, "指定なし");
  $("look-pace").innerHTML = optionsFrom(PACES, state.look.pace, "指定なし");

  buildTags("tags-lighting", LIGHTING, "lighting");
  buildTags("tags-textures", TEXTURES, "textures");
  buildTags("tags-colors", COLORS, "colors");
  buildTags("tags-avoid", AVOID_TAGS, "avoid");
  buildTags("tags-locks", LOCKS, "locks");
}

function buildTags(boxId, dict, key) {
  $(boxId).innerHTML = dict.map(d => {
    const v = typeof d === "string" ? d : d.en;
    const l = typeof d === "string" ? d : d.ja;
    const sub = typeof d === "string" ? "" : '<span class="en">' + esc(d.en) + "</span>";
    return '<button type="button" class="tag" data-tagkey="' + key + '" data-tag="' + esc(v) + '">' +
      esc(l) + sub + "</button>";
  }).join("");
}

function currentTagList(key) {
  if (key === "avoid" || key === "locks") return state.guards[key];
  return state.look[key];
}

function syncControls() {
  $("meta-name").value = state.meta.name;
  $("meta-purpose").value = state.meta.purpose;
  $("meta-summary").value = state.meta.summary;
  $("meta-duration").value = String(state.meta.duration);
  $("meta-aspect").value = state.meta.aspect;
  $("meta-resolution").value = state.meta.resolution;
  $("opening").value = state.opening;
  $("closing").value = state.closing;
  $("edit-keep").value = state.edit.keep;
  $("look-start").value = state.look.startSize;
  $("look-end").value = state.look.endSize;
  $("look-height").value = state.look.height;
  $("look-pace").value = state.look.pace;
  $("audio-ambience").value = state.audio.ambience;
  $("audio-music").value = state.audio.music;
  $("audio-silence").checked = !!state.audio.silence;
  $("audio-captions").value = state.audio.captions;

  document.querySelectorAll(".tag").forEach(b => {
    const list = currentTagList(b.dataset.tagkey) || [];
    b.classList.toggle("on", list.indexOf(b.dataset.tag) !== -1);
  });
  document.querySelectorAll("#lang-toggle button").forEach(b => {
    b.classList.toggle("on", b.dataset.lang === lang);
  });
}

/* ============================================================
   イベント
   ============================================================ */
function bindEvents() {

  /* --- モード --- */
  $("mode-grid").addEventListener("click", e => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    state.mode = btn.dataset.mode;
    if (state.mode === "edit" && !state.refs.some(r => r.kind === "video")) {
      state.refs.unshift({ id: nid(), kind: "video", uses: "編集する元の映像そのもの", notUses: "", boundTo: "全体", groupTag: "" });
    }
    renderStructure();
  });

  /* --- プリセット --- */
  $("preset-select").addEventListener("change", e => {
    const p = PRESETS.find(x => x.id === e.target.value);
    if (!p) return;
    state.meta.duration = p.duration;
    state.meta.aspect = p.aspect;
    state.look.lighting = p.lighting.slice();
    state.look.textures = p.textures.slice();
    state.look.colors = p.colors.slice();
    state.beats = p.beats.map(sec => newBeat(sec));
    syncControls();
    renderStructure();
    toast(p.name + " を読み込みました");
  });

  /* --- メタ・単純フィールド --- */
  const simple = [
    ["meta-name", v => state.meta.name = v],
    ["meta-purpose", v => state.meta.purpose = v],
    ["meta-summary", v => state.meta.summary = v],
    ["meta-aspect", v => state.meta.aspect = v],
    ["meta-resolution", v => state.meta.resolution = v],
    ["opening", v => state.opening = v],
    ["closing", v => state.closing = v],
    ["edit-keep", v => state.edit.keep = v],
    ["look-start", v => state.look.startSize = v],
    ["look-end", v => state.look.endSize = v],
    ["look-height", v => state.look.height = v],
    ["look-pace", v => state.look.pace = v],
    ["audio-ambience", v => state.audio.ambience = v],
    ["audio-music", v => state.audio.music = v],
    ["audio-captions", v => state.audio.captions = v]
  ];
  simple.forEach(([id, set]) => {
    const el = $(id);
    el.addEventListener("input", () => { set(el.value); renderOutput(); });
    el.addEventListener("change", () => { set(el.value); renderOutput(); });
  });
  $("meta-duration").addEventListener("change", e => {
    state.meta.duration = Number(e.target.value);
    renderOutput();
  });
  $("audio-silence").addEventListener("change", e => {
    state.audio.silence = e.target.checked;
    renderOutput();
  });

  /* --- タグ --- */
  document.querySelectorAll(".tag-group").forEach(g => {
    g.addEventListener("click", e => {
      const b = e.target.closest(".tag");
      if (!b) return;
      const list = currentTagList(b.dataset.tagkey);
      const i = list.indexOf(b.dataset.tag);
      if (i === -1) list.push(b.dataset.tag); else list.splice(i, 1);
      b.classList.toggle("on", i === -1);
      renderOutput();
    });
  });

  /* --- 人物 --- */
  $("btn-add-character").addEventListener("click", () => {
    state.characters.push({
      id: nid(), label: "<人物" + (state.characters.length + 1) + ">",
      build: "", hair: "", face: "", wardrobe: "", props: ""
    });
    renderStructure();
  });
  $("character-list").addEventListener("click", e => {
    const b = e.target.closest("[data-del-char]");
    if (!b) return;
    state.characters = state.characters.filter(c => c.id !== b.dataset.delChar);
    renderStructure();
  });
  $("character-list").addEventListener("input", e => {
    const card = e.target.closest("[data-id]");
    const k = e.target.dataset.k;
    if (!card || !k) return;
    const c = state.characters.find(x => x.id === card.dataset.id);
    if (!c) return;

    if (k === "label") {
      /* 呼称を変えたら、その人物に紐づいている素材も追従させる。
         空文字は「紐づけなし」と衝突するので対象外。 */
      const old = c.label;
      c.label = e.target.value;
      if (old && old !== c.label) {
        state.refs.forEach(r => { if (r.boundTo === old) r.boundTo = c.label; });
        renderRefs();
      }
    } else {
      c[k] = e.target.value;
    }

    updateAnchorCounts();
    renderOutput();
  });

  /* --- 参照素材 --- */
  document.querySelectorAll("[data-add-ref]").forEach(b => {
    b.addEventListener("click", () => {
      state.refs.push({ id: nid(), kind: b.dataset.addRef, uses: "", notUses: "", boundTo: "", groupTag: "" });
      renderStructure();
    });
  });
  $("ref-list").addEventListener("click", e => {
    const del = e.target.closest("[data-del-ref]");
    if (del) {
      state.refs = state.refs.filter(r => r.id !== del.dataset.delRef);
      renderStructure();
      return;
    }
    const mv = e.target.closest("[data-move-ref]");
    if (mv) {
      moveItem(state.refs, mv.dataset.moveRef, Number(mv.dataset.dir));
      renderStructure();
    }
  });
  const refInput = e => {
    const card = e.target.closest("[data-id]");
    const k = e.target.dataset.k;
    if (!card || !k) return;
    const r = state.refs.find(x => x.id === card.dataset.id);
    if (!r) return;
    r[k] = e.target.value;
    renderOutput();
  };
  $("ref-list").addEventListener("input", refInput);
  $("ref-list").addEventListener("change", refInput);

  /* --- ビート --- */
  $("btn-add-beat").addEventListener("click", () => {
    state.beats.push(newBeat(5));
    renderStructure();
  });
  $("btn-even-beat").addEventListener("click", () => {
    if (!state.beats.length) return;
    const secs = evenBeats(state.beats.length, Number(state.meta.duration));
    state.beats.forEach((b, i) => b.sec = secs[i]);
    renderStructure();
    toast("均等に割りました");
  });
  $("btn-tmpl-beat").addEventListener("click", () => {
    if (state.beats.some(b => (b.event || "").trim()) &&
        !confirm("入力済みのビート本文が消えます。入れ直しますか？")) return;
    state.beats = templateBeats(Number(state.meta.duration));
    renderStructure();
    toast("静→動→静 で入れ直しました");
  });
  $("beat-list").addEventListener("click", e => {
    const del = e.target.closest("[data-del-beat]");
    if (del) {
      state.beats = state.beats.filter(b => b.id !== del.dataset.delBeat);
      renderStructure();
      return;
    }
    const mv = e.target.closest("[data-move-beat]");
    if (mv) {
      moveItem(state.beats, mv.dataset.moveBeat, Number(mv.dataset.dir));
      renderStructure();
    }
  });
  const beatInput = e => {
    const card = e.target.closest("[data-id]");
    const k = e.target.dataset.k;
    if (!card || !k) return;
    const b = state.beats.find(x => x.id === card.dataset.id);
    if (!b) return;
    b[k] = k === "sec" ? Math.max(1, Number(e.target.value) || 1) : e.target.value;
    if (k === "sec") {
      const tl = Builder.timeline(state.beats);
      document.querySelectorAll("#beat-list .beat-card").forEach((card2, i) => {
        const t = card2.querySelector(".beat-time");
        if (t && tl[i]) t.textContent = tl[i].start + "-" + tl[i].end + "s";
      });
    }
    renderOutput();
  };
  $("beat-list").addEventListener("input", beatInput);
  $("beat-list").addEventListener("change", beatInput);

  /* --- セリフ --- */
  $("btn-add-dialogue").addEventListener("click", () => {
    state.audio.dialogues.push({ id: nid(), speaker: "", lang: "Japanese", manner: "", at: "", text: "" });
    renderDialogues();
    renderOutput();
  });
  $("dialogue-list").addEventListener("click", e => {
    const b = e.target.closest("[data-del-dlg]");
    if (!b) return;
    state.audio.dialogues = state.audio.dialogues.filter(d => d.id !== b.dataset.delDlg);
    renderDialogues();
    renderOutput();
  });
  const dlgInput = e => {
    const card = e.target.closest("[data-id]");
    const k = e.target.dataset.k;
    if (!card || !k) return;
    const d = state.audio.dialogues.find(x => x.id === card.dataset.id);
    if (!d) return;
    d[k] = e.target.value;
    renderOutput();
  };
  $("dialogue-list").addEventListener("input", dlgInput);
  $("dialogue-list").addEventListener("change", dlgInput);

  /* --- 言語切替 --- */
  $("lang-toggle").addEventListener("click", e => {
    const b = e.target.closest("[data-lang]");
    if (!b) return;
    lang = b.dataset.lang;
    document.querySelectorAll("#lang-toggle button").forEach(x => x.classList.toggle("on", x === b));
    renderOutput();
  });

  /* --- 出力 --- */
  $("btn-copy").addEventListener("click", () => {
    const text = Builder.build(state, lang);
    const nErr = Validator.run(state).filter(i => i.level === "error").length;
    if (nErr && !confirm("エラーが " + nErr + " 件あります。このままコピーしますか？")) return;
    navigator.clipboard.writeText(text)
      .then(() => toast("コピーしました"))
      .catch(() => {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        toast("コピーしました");
      });
  });
  $("btn-txt").addEventListener("click", () => {
    download((state.meta.name || "seedance-prompt") + ".txt", Builder.build(state, lang), "text/plain");
  });

  /* --- 保存まわり --- */
  $("btn-save").addEventListener("click", saveProject);
  $("btn-load").addEventListener("click", loadProject);
  $("btn-delete").addEventListener("click", deleteProject);
  $("btn-new").addEventListener("click", () => {
    if (!confirm("入力中の内容を破棄して新規作成しますか？")) return;
    state = blankState();
    state.beats = templateBeats(state.meta.duration);
    initStaticControls();
    syncControls();
    renderStructure();
    toast("新規作成しました");
  });
  $("btn-export").addEventListener("click", () => {
    download((state.meta.name || "seedance-project") + ".json", JSON.stringify(state, null, 2), "application/json");
  });
  $("btn-import").addEventListener("click", () => $("file-import").click());
  $("file-import").addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const obj = JSON.parse(fr.result);
        state = migrate(obj);
        initStaticControls();
        syncControls();
        renderStructure();
        toast("読み込みました");
      } catch (err) {
        toast("読み込めませんでした（JSONの形式が違います）");
      }
      e.target.value = "";
    };
    fr.readAsText(f);
  });
}

function moveItem(arr, id, dir) {
  const i = arr.findIndex(x => x.id === id);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= arr.length) return;
  const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
}

function download(name, text, mime) {
  const blob = new Blob([text], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================
   保存（localStorage）
   ============================================================ */
function store() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || { projects: {}, current: null };
  } catch (e) {
    return { projects: {}, current: null };
  }
}
function writeStore(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* 容量超過等は黙って諦める */ }
}
function saveCurrent() {
  const s = store();
  s.current = state;
  writeStore(s);
}
function saveProject() {
  let name = (state.meta.name || "").trim();
  if (!name) {
    name = prompt("作品名を入力してください");
    if (!name) return;
    state.meta.name = name;
    $("meta-name").value = name;
  }
  const s = store();
  s.projects[name] = JSON.parse(JSON.stringify(state));
  writeStore(s);
  refreshProjectList(name);
  toast("「" + name + "」を保存しました");
}
function loadProject() {
  const name = $("project-select").value;
  if (!name) { toast("読み込む作品を選んでください"); return; }
  const s = store();
  if (!s.projects[name]) { toast("見つかりませんでした"); return; }
  state = migrate(s.projects[name]);
  initStaticControls();
  syncControls();
  renderStructure();
  toast("「" + name + "」を読み込みました");
}
function deleteProject() {
  const name = $("project-select").value;
  if (!name) return;
  if (!confirm("「" + name + "」を削除しますか？")) return;
  const s = store();
  delete s.projects[name];
  writeStore(s);
  refreshProjectList();
  toast("削除しました");
}
function refreshProjectList(select) {
  const s = store();
  const names = Object.keys(s.projects).sort();
  $("project-select").innerHTML = '<option value="">（選択してください）</option>' +
    names.map(n => '<option value="' + esc(n) + '"' + (n === select ? " selected" : "") + ">" + esc(n) + "</option>").join("");
}

/* 古い/欠けたデータを埋める */
function migrate(obj) {
  const base = blankState();
  const s = Object.assign(base, obj || {});
  s.meta = Object.assign(base.meta, obj.meta || {});
  s.look = Object.assign(base.look, obj.look || {});
  s.audio = Object.assign(base.audio, obj.audio || {});
  s.guards = Object.assign(base.guards, obj.guards || {});
  s.edit = Object.assign(base.edit, obj.edit || {});
  ["characters", "refs", "beats"].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
  ["lighting", "textures", "colors"].forEach(k => { if (!Array.isArray(s.look[k])) s.look[k] = []; });
  ["avoid", "locks"].forEach(k => { if (!Array.isArray(s.guards[k])) s.guards[k] = []; });
  if (!Array.isArray(s.audio.dialogues)) s.audio.dialogues = [];
  [].concat(s.characters, s.refs, s.beats, s.audio.dialogues).forEach(x => { if (x && !x.id) x.id = nid(); });
  return s;
}

/* ============================================================
   起動
   ============================================================ */
function boot() {
  const s = store();
  if (s.current) {
    state = migrate(s.current);
  } else {
    state = blankState();
    state.beats = templateBeats(state.meta.duration);
    state.guards.avoid = ["jitter", "identity drift", "bent limbs"];
    state.guards.locks = ["顔立ち・髪型は最後まで同一に保つ", "カメラの動きは1ショットにつき1つだけ"];
  }
  initStaticControls();
  bindEvents();
  syncControls();
  refreshProjectList();
  renderStructure();

  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", boot);

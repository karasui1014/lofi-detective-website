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
      "※ 「そのまま維持するもの」を書かないと全体が作り直されます"
    ]
  },
  {
    id: "extend", name: "動画を前後に延長", tag: "延長",
    sub: "用意するもの：伸ばしたい動画1本",
    desc: "既存の動画の続き、または前の場面を作ります。人物と場所をそのまま引き継ぎます。",
    prepare: [
      "伸ばしたい動画（延長元）",
      "つなぎ目の状態のメモ（端で人物と物がどうなっているか）",
      "※ 編集と延長の両方が必要なときは、<b>先に編集して、その結果を延長元にします</b>"
    ]
  }
];

/* モードごとに表示するパネル */
const VISIBLE = {
  lv0:  ["step-mode", "step-meta", "step-beats", "step-look", "step-audio", "step-guards"],
  lv1:  ["step-mode", "step-meta", "step-characters", "step-refs", "step-frames", "step-beats", "step-look", "step-audio", "step-guards"],
  lv2:  ["step-mode", "step-meta", "step-characters", "step-refs", "step-frames", "step-opening", "step-beats", "step-closing", "step-look", "step-audio", "step-guards"],
  edit: ["step-mode", "step-meta", "step-refs", "step-edit", "step-beats", "step-guards"],
  extend: ["step-mode", "step-meta", "step-characters", "step-refs", "step-extend", "step-beats", "step-look", "step-audio", "step-guards"]
};

const STORE_KEY = "seedance_koubou_v1";
let uid = 0;
const nid = () => "i" + (++uid) + "_" + Date.now().toString(36);

/* ---------- 初期状態 ---------- */
function blankState() {
  return {
    version: 1,
    ui: "simple",
    simple: { purpose: "cm", script: "", duration: 15, aspect: "16:9" },
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
    edit: { keep: "", thenExtend: false },
    stage2: { duration: 10, beats: [] },
    extend: { direction: "backward", boundary: "" },
    frames: { mode: "", first: "", last: "" },
    output: { symbols: true, timestamps: true }
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
  document.body.classList.toggle("is-simple", state.ui === "simple");
  document.querySelectorAll("#uimode button").forEach(b =>
    b.classList.toggle("on", b.dataset.ui === state.ui));

  /* かんたんモードは1枚のパネルだけ見せる */
  if (state.ui === "simple") {
    document.querySelectorAll("main .panel").forEach(p => {
      p.hidden = p.id !== "step-simple";
    });
    renderPurposes();
    renderSimpleImages();
    renderOutput();
    return;
  }
  $("step-simple").hidden = true;

  /* パネルの出し入れ */
  const show = (VISIBLE[state.mode] || VISIBLE.lv1).slice();
  /* 編集モードで「このあと延長」を選んだら、延長の前提と2本目のビート表を出す */
  if (state.mode === "edit" && state.edit.thenExtend) {
    show.push("step-extend", "step-stage2");
  }
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

  /* ビート表の見出しはモードで意味が変わる */
  $("beats-title").textContent =
    state.mode === "edit" ? (state.edit.thenExtend ? "1本目：変更内容（時間割）" : "変更内容（時間割）")
    : state.mode === "extend" ? "延長部分のビート表（時間割）"
    : "ビート表（時間割）";

  renderModes();
  renderCharacters();
  renderRefs();
  renderFrameSelects();
  renderBeats("main");
  renderBeats("stage2");
  renderDialogues();
  renderOutput();
}

/* ============================================================
   かんたんモード
   ============================================================ */

function renderPurposes() {
  $("purpose-grid").innerHTML = SIMPLE_PURPOSES.map(p =>
    '<button type="button" class="purpose-card' + (state.simple.purpose === p.id ? " on" : "") +
    '" data-purpose="' + p.id + '">' +
    '<span class="purpose-name">' + esc(p.name) + "</span>" +
    '<span class="purpose-desc">' + esc(p.desc) + "</span>" +
    '<span class="purpose-spec">' + p.duration + "秒・" + p.aspect + "</span>" +
    "</button>"
  ).join("");
}

function renderSimpleImages() {
  const box = $("simple-images");
  const imgs = state.refs.filter(r => r.kind === "image");
  if (!imgs.length) {
    box.innerHTML = '<p class="empty">画像なしでも作れます。同じ人物や商品を出したいときだけ足してください。</p>';
    return;
  }
  box.innerHTML = imgs.map(r => {
    const label = Builder.refLabel(state.refs, r);
    const roleOpts = IMAGE_ROLES.map(o =>
      '<option value="' + esc(o.v) + '"' + (o.v === r.role ? " selected" : "") + ">" + esc(o.l) + "</option>"
    ).join("");
    const pic = r.thumb
      ? '<img class="thumb-img" src="' + r.thumb + '" alt="' + esc(label) + '">'
      : '<span class="thumb-empty">画像なし</span>';
    return '<div class="simple-img' + (r.role ? "" : " no-role") + '" data-id="' + r.id + '">' +
      '<div class="simple-img-pic">' + pic +
        '<span class="simple-img-tag">' + esc(label) + "</span>" +
        '<button type="button" class="simple-img-del" data-del-ref="' + r.id + '" title="削除">×</button>' +
      "</div>" +
      '<select class="simple-role" data-role-for="' + r.id + '">' +
        '<option value="">役割を選ぶ</option>' + roleOpts +
      "</select>" +
    "</div>";
  }).join("");
}

/* 台本を行ごとに読み、ビートと台詞に振り分ける。
   1行 = 1つの出来事。「かぎかっこ」は台詞として抜き出す。 */
function parseScript(text) {
  const lines = String(text || "").split(/[\n。]+/).map(s => s.trim()).filter(Boolean);
  const out = [];
  lines.forEach(line => {
    const said = [];
    const rest = line
      .replace(/[「『]([^」』]{1,80})[」』]/g, (m, p1) => { said.push(p1.trim()); return ""; })
      .replace(/^[、,\s]+|[、,\s]+$/g, "")
      .trim();
    if (rest) {
      out.push({ text: rest, said: said });
    } else if (said.length && out.length) {
      out[out.length - 1].said.push.apply(out[out.length - 1].said, said);
    } else if (said.length) {
      out.push({ text: "口を開いて話しはじめる", said: said });
    }
  });
  return out;
}

/* 文が多すぎると1ビートに動作が詰まって破綻するので、尺に見合う数へまとめる */
function groupInto(arr, n) {
  if (arr.length <= n) return arr.map(x => [x]);
  const out = [];
  for (let i = 0; i < n; i++) out.push([]);
  arr.forEach((x, i) => out[Math.floor(i * n / arr.length)].push(x));
  return out.filter(g => g.length);
}

/* かんたんモードの入力を、こだわりモードと同じ内部データへ書き出す */
function applySimple() {
  const p = SIMPLE_PURPOSES.find(x => x.id === state.simple.purpose) || SIMPLE_PURPOSES[0];
  const dur = Number(state.simple.duration) || p.duration;

  state.mode = state.refs.some(r => r.kind === "image") ? "lv1" : "lv0";
  state.meta.purpose = p.name;
  state.meta.duration = dur;
  state.meta.aspect = state.simple.aspect || p.aspect;

  state.look.lighting = p.lighting.slice();
  state.look.textures = p.textures.slice();
  state.look.colors = p.colors.slice();
  state.look.startSize = p.startSize;
  state.look.endSize = p.endSize;
  state.look.height = p.height;
  state.look.pace = p.pace;
  state.guards.avoid = p.avoid.slice();
  state.guards.locks = p.locks.slice();

  /* 台本 → ビート */
  const parsed = parseScript(state.simple.script);
  const maxBeats = Math.max(1, Math.min(6, Math.floor(dur / 3) || 1));
  const groups = groupInto(parsed, maxBeats);
  const secs = groups.length ? evenBeats(groups.length, dur) : [];

  state.beats = groups.map((g, i) => {
    const b = newBeat(secs[i]);
    b.event = g.map(x => x.text).filter(Boolean).join("、");
    b.move = p.cameras[i % p.cameras.length] || "";
    return b;
  });
  if (!state.beats.length) state.beats = [newBeat(dur)];

  /* 一文要約は「最初 〜 最後」で全体の流れを1行にする */
  state.meta.summary = !parsed.length ? ""
    : parsed.length === 1 ? parsed[0].text
    : parsed[0].text + " 〜 " + parsed[parsed.length - 1].text;

  /* 台詞 */
  const dialogues = [];
  let cursor = 0;
  groups.forEach((g, i) => {
    const start = cursor;
    cursor += secs[i] || 0;
    g.forEach(x => x.said.forEach(t => {
      dialogues.push({
        id: nid(), speaker: "", lang: "Japanese", manner: "",
        at: Math.min(dur, start + 1), text: t
      });
    }));
  });
  state.audio.dialogues = dialogues;

  renderSimpleReadout(p, parsed.length, groups.length);
}

function renderSimpleReadout(p, lineCount, beatCount) {
  const d = state.audio.dialogues.length;
  const imgs = state.refs.filter(r => r.kind === "image").length;
  const noRole = state.refs.filter(r => r.kind === "image" && !r.role).length;

  if (!beatCount) {
    $("simple-readout").textContent =
      "台本を書くと、ここに「何カットに分けたか」が出ます。1行＝1カットです。";
    return;
  }

  const parts = ["読み取り結果：" + beatCount + "カット"];
  if (d) parts.push("台詞 " + d + "個");
  if (imgs) parts.push("画像 " + imgs + "枚");
  let msg = parts.join(" / ") + "　→　" + p.name + "らしい光・色・カメラの流れを自動で当てています。";

  if (lineCount > beatCount) {
    msg += "\n台本が長いので " + lineCount + "行を " + beatCount +
      "カットにまとめました。1カットに動きを詰めすぎると崩れるので、削るか長さを伸ばすのがおすすめです。";
  }
  if (noRole) {
    msg += "\n役割が未選択の画像が " + noRole + "枚あります。何を決める素材なのか選んでください。";
  }
  $("simple-readout").textContent = msg;
}

/* 境界フレームのプルダウンは画像素材から作る（素材が増減するたび作り直す） */
function renderFrameSelects() {
  const imgs = state.refs.filter(r => r.kind === "image" && !r.unused);
  const opts = cur => '<option value="">（指定なし）</option>' + imgs.map(r =>
    '<option value="' + esc(r.id) + '"' + (r.id === cur ? " selected" : "") + ">" +
    esc(Builder.refLabel(state.refs, r) + (r.uses ? "：" + r.uses : "")) + "</option>"
  ).join("");
  $("frame-first").innerHTML = opts(state.frames.first);
  $("frame-last").innerHTML = opts(state.frames.last);
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
    const thumb = r.kind === "image"
      ? (r.thumb
          ? '<img class="thumb-img" src="' + r.thumb + '" alt="' + esc(label) + 'のプレビュー">'
          : '<span class="thumb-empty">画像なし</span>')
      : '<span class="thumb-empty thumb-file">' + (r.fileName ? esc(r.fileName) : "ファイル未選択") + "</span>";
    const fileAccept = r.kind === "image" ? "image/*" : r.kind === "video" ? "video/*" : "audio/*";

    return '<div class="card ref-card' + (r.unused ? " is-unused" : "") + '" data-id="' + r.id + '">' +
      '<div class="card-head">' +
        '<span class="ref-label ref-' + r.kind + '">' + esc(label) + "</span>" +
        '<label class="unused-check"><input type="checkbox" data-k="unused"' + (r.unused ? " checked" : "") + "> 今回は使わない</label>" +
        '<button type="button" class="move" data-move-ref="' + r.id + '" data-dir="-1"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" class="move" data-move-ref="' + r.id + '" data-dir="1"' + (i === state.refs.length - 1 ? " disabled" : "") + ">↓</button>" +
        '<button type="button" class="del" data-del-ref="' + r.id + '">削除</button>' +
      "</div>" +
      '<div class="ref-thumb-row">' +
        '<div class="thumb-box">' + thumb + "</div>" +
        '<div class="thumb-ctrl">' +
          '<label class="file-pick">画像・ファイルを置く<input type="file" accept="' + fileAccept + '" data-pick-ref="' + r.id + '" hidden></label>' +
          (r.thumb || r.fileName ? '<button type="button" class="del" data-clear-thumb="' + r.id + '">クリア</button>' : "") +
        "</div>" +
      "</div>" +
      '<div class="grid-4">' +
        '<label>使う属性<span class="req">必須</span><input type="text" data-k="uses" list="dl-role-' + r.kind + '" value="' + esc(r.uses) + '" placeholder="顔立ちと髪型"></label>' +
        '<label>使わない属性<input type="text" data-k="notUses" list="dl-notuse" value="' + esc(r.notUses) + '" placeholder="背景・構図・衣装"></label>' +
        "<label>紐づけ先<select data-k=\"boundTo\">" + sel + "</select></label>" +
        '<label>同一物グループ<input type="text" data-k="groupTag" value="' + esc(r.groupTag) + '" placeholder="真鍮の筒"></label>' +
      "</div>" +
      '<label class="keyat">キーフレーム秒<span class="opt">（この素材を◯秒地点の画として参照させたいときだけ）</span>' +
        '<input type="number" min="0" data-k="keyAt" value="' + esc(r.keyAt) + '"></label>' +
    "</div>";
  }).join("");
}

/* which: "main" | "stage2" */
function beatsOf(which) {
  return which === "stage2" ? state.stage2.beats : state.beats;
}
function durationOf(which) {
  return Number(which === "stage2" ? state.stage2.duration : state.meta.duration);
}

function renderBeats(which) {
  which = which || "main";
  const box = $(which === "stage2" ? "stage2-list" : "beat-list");
  const beats = beatsOf(which);
  if (!beats.length) {
    box.innerHTML = '<p class="empty">ビートがありません。' +
      (which === "stage2" ? "「＋ ビートを追加」から作ってください。"
                          : "「静→動→静で入れ直す」が手っ取り早いです。") + "</p>";
    return;
  }
  const tl = Builder.timeline(beats);
  box.innerHTML = beats.map((b, i) => {
    const t = tl[i];
    return '<div class="card beat-card" data-id="' + b.id + '">' +
      '<div class="card-head">' +
        '<span class="beat-no">ビート' + (i + 1) + "</span>" +
        '<span class="beat-time">' + t.start + "-" + t.end + "s</span>" +
        '<label class="sec-input">秒数<input type="number" min="1" max="180" data-k="sec" value="' + esc(b.sec) + '"></label>' +
        '<button type="button" class="move" data-move-beat="' + b.id + '" data-dir="-1"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" class="move" data-move-beat="' + b.id + '" data-dir="1"' + (i === beats.length - 1 ? " disabled" : "") + ">↓</button>" +
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

function renderBeatBar(which) {
  const bar = $(which === "stage2" ? "stage2-bar" : "beat-bar");
  const tot = $(which === "stage2" ? "stage2-total" : "beat-total");
  const beats = beatsOf(which);
  const dur = durationOf(which);

  bar.innerHTML = "";
  Builder.timeline(beats).forEach((t, i) => {
    const seg = document.createElement("div");
    seg.className = "seg seg-" + (i % 4);
    seg.style.flexGrow = String(Math.max(1, t.beat.sec));
    seg.textContent = t.beat.sec + "s";
    seg.title = "ビート" + (i + 1) + "：" + t.start + "-" + t.end + "s";
    bar.appendChild(seg);
  });

  const total = beats.reduce((a, b) => a + (Number(b.sec) || 0), 0);
  const ok = total === dur;
  const label = which === "stage2" ? "延長する長さ" : "総尺";
  tot.textContent = "合計 " + total + "秒 / " + label + " " + dur + "秒" +
    (ok ? "　一致しています" : "　← 一致していません");
  tot.className = "beat-total" + (ok ? " ok" : " ng");
}

/* ============================================================
   描画：出力（入力のたびに呼ぶ・軽い処理だけ）
   ============================================================ */
function renderOutput() {
  renderBeatBar("main");
  renderBeatBar("stage2");

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
  $("settings-output").textContent = Builder.settings(state);

  /* 2段階（編集 → 延長） */
  const two = Builder.twoStage(state);
  $("stage1-label").hidden = !two;
  $("output2-block").hidden = !two;
  if (two) $("output2").textContent = Builder.buildStage2(state, lang);

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
  $("stage2-duration").innerHTML = optionsFrom(DURATIONS.map(String), String(state.stage2.duration));
  $("simple-duration").innerHTML = optionsFrom(DURATIONS.map(String), String(state.simple.duration));
  $("simple-aspect").innerHTML = optionsFrom(ASPECTS, state.simple.aspect);
  $("meta-aspect").innerHTML = optionsFrom(ASPECTS, state.meta.aspect);
  $("meta-resolution").innerHTML = optionsFrom(RESOLUTIONS, state.meta.resolution);
  $("preset-select").innerHTML = '<option value="">選ぶと下がまとめて入ります</option>' +
    PRESETS.map(p => '<option value="' + p.id + '">' + esc(p.name) + "</option>").join("");
  $("look-start").innerHTML = optionsFrom(SHOT_SIZES, state.look.startSize, "指定なし");
  $("look-end").innerHTML = optionsFrom(SHOT_SIZES, state.look.endSize, "指定なし");
  $("look-height").innerHTML = optionsFrom(CAMERA_HEIGHTS, state.look.height, "指定なし");
  $("look-pace").innerHTML = optionsFrom(PACES, state.look.pace, "指定なし");
  $("frame-mode").innerHTML = FRAME_MODES.map(m =>
    '<option value="' + esc(m.v) + '"' + (m.v === state.frames.mode ? " selected" : "") + ">" + esc(m.l) + "</option>").join("");
  $("extend-dir").innerHTML = EXTEND_DIRS.map(m =>
    '<option value="' + esc(m.v) + '"' + (m.v === state.extend.direction ? " selected" : "") + ">" + esc(m.l) + "</option>").join("");

  fillDatalist("dl-role-image", REF_ROLE_PRESETS.image);
  fillDatalist("dl-role-video", REF_ROLE_PRESETS.video);
  fillDatalist("dl-role-audio", REF_ROLE_PRESETS.audio);
  fillDatalist("dl-notuse", REF_NOTUSE_PRESETS);

  buildTags("tags-lighting", LIGHTING, "lighting");
  buildTags("tags-textures", TEXTURES, "textures");
  buildTags("tags-colors", COLORS, "colors");
  buildTags("tags-avoid", AVOID_TAGS, "avoid");
  buildTags("tags-locks", LOCKS, "locks");
}

function fillDatalist(id, list) {
  $(id).innerHTML = list.map(v => '<option value="' + esc(v) + '"></option>').join("");
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
  $("simple-script").value = state.simple.script;
  $("simple-duration").value = String(state.simple.duration);
  $("simple-aspect").value = state.simple.aspect;
  $("meta-name").value = state.meta.name;
  $("meta-purpose").value = state.meta.purpose;
  $("meta-summary").value = state.meta.summary;
  $("meta-duration").value = String(state.meta.duration);
  $("meta-aspect").value = state.meta.aspect;
  $("meta-resolution").value = state.meta.resolution;
  $("opening").value = state.opening;
  $("closing").value = state.closing;
  $("edit-keep").value = state.edit.keep;
  $("edit-then-extend").checked = !!state.edit.thenExtend;
  $("stage2-duration").value = String(state.stage2.duration);
  $("look-start").value = state.look.startSize;
  $("look-end").value = state.look.endSize;
  $("look-height").value = state.look.height;
  $("look-pace").value = state.look.pace;
  $("audio-ambience").value = state.audio.ambience;
  $("audio-music").value = state.audio.music;
  $("audio-silence").checked = !!state.audio.silence;
  $("audio-captions").value = state.audio.captions;
  $("extend-dir").value = state.extend.direction;
  $("extend-boundary").value = state.extend.boundary;
  $("frame-mode").value = state.frames.mode;
  $("opt-symbols").checked = !!state.output.symbols;
  $("opt-timestamps").checked = !!state.output.timestamps;

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

  /* --- かんたん / こだわり の切替 --- */
  $("uimode").addEventListener("click", e => {
    const b = e.target.closest("[data-ui]");
    if (!b) return;
    state.ui = b.dataset.ui;
    initStaticControls();
    syncControls();
    renderStructure();
  });

  /* --- かんたん：用途 --- */
  $("purpose-grid").addEventListener("click", e => {
    const b = e.target.closest("[data-purpose]");
    if (!b) return;
    const p = SIMPLE_PURPOSES.find(x => x.id === b.dataset.purpose);
    state.simple.purpose = b.dataset.purpose;
    state.simple.duration = p.duration;
    state.simple.aspect = p.aspect;
    $("simple-duration").value = String(p.duration);
    $("simple-aspect").value = p.aspect;
    applySimple();
    renderStructure();
  });

  /* --- かんたん：台本・尺・比率 --- */
  $("simple-script").addEventListener("input", e => {
    state.simple.script = e.target.value;
    applySimple();
    renderOutput();
  });
  $("simple-duration").addEventListener("change", e => {
    state.simple.duration = Number(e.target.value);
    applySimple();
    renderOutput();
  });
  $("simple-aspect").addEventListener("change", e => {
    state.simple.aspect = e.target.value;
    applySimple();
    renderOutput();
  });

  /* --- かんたん：画像をまとめて追加 --- */
  $("simple-file").addEventListener("change", e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    let left = files.length;
    files.forEach(f => {
      const ref = {
        id: nid(), kind: "image", uses: "", notUses: "", boundTo: "", groupTag: "",
        unused: false, keyAt: "", thumb: "", fileName: f.name, role: ""
      };
      state.refs.push(ref);
      shrinkImageToDataUrl(f, 480, 0.72)
        .then(url => { ref.thumb = url; })
        .catch(() => {})
        .then(() => {
          if (--left === 0) { applySimple(); renderStructure(); }
        });
    });
    e.target.value = "";
  });

  /* --- かんたん：画像の役割・削除 --- */
  $("simple-images").addEventListener("change", e => {
    const sel = e.target.closest("[data-role-for]");
    if (!sel) return;
    const r = state.refs.find(x => x.id === sel.dataset.roleFor);
    if (!r) return;
    r.role = sel.value;
    const role = IMAGE_ROLES.find(o => o.v === sel.value);
    r.uses = role ? role.uses : "";
    r.notUses = role ? role.notUses : "";
    /* カード全体を作り直すとフォーカスが飛ぶので、印だけ付け替える */
    const card = sel.closest(".simple-img");
    if (card) card.classList.toggle("no-role", !r.role);
    applySimple();
    renderOutput();
  });
  $("simple-images").addEventListener("click", e => {
    const del = e.target.closest("[data-del-ref]");
    if (!del) return;
    state.refs = state.refs.filter(r => r.id !== del.dataset.delRef);
    applySimple();
    renderStructure();
  });

  /* --- モード --- */
  $("mode-grid").addEventListener("click", e => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    const next = btn.dataset.mode;
    const wantsMaster = next === "edit" || next === "extend";
    const AUTO_USES = ["編集する元の映像そのもの", "延長する元の映像そのもの"];
    const label = next === "edit" ? AUTO_USES[0] : AUTO_USES[1];

    /* 自動で足した元動画は、編集・延長を離れたら片付ける。
       手で書き換えられていたら残す（ユーザーの入力を消さない）。 */
    state.refs = state.refs.filter(r =>
      !(r.auto && !wantsMaster && AUTO_USES.indexOf((r.uses || "").trim()) !== -1));

    if (wantsMaster) {
      const auto = state.refs.find(r => r.auto);
      if (auto) {
        if (AUTO_USES.indexOf((auto.uses || "").trim()) !== -1) auto.uses = label;
      } else if (!state.refs.some(r => r.kind === "video")) {
        state.refs.unshift({
          id: nid(), kind: "video", uses: label,
          notUses: "", boundTo: "全体", groupTag: "", unused: false, keyAt: "", auto: true, thumb: "", fileName: ""
        });
      }
    }

    state.mode = next;
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
    ["extend-dir", v => state.extend.direction = v],
    ["extend-boundary", v => state.extend.boundary = v],
    ["frame-first", v => state.frames.first = v],
    ["frame-last", v => state.frames.last = v],
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
  $("frame-mode").addEventListener("change", e => {
    state.frames.mode = e.target.value;
    renderOutput();
  });
  $("opt-symbols").addEventListener("change", e => {
    state.output.symbols = e.target.checked;
    renderOutput();
  });
  $("opt-timestamps").addEventListener("change", e => {
    state.output.timestamps = e.target.checked;
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
      state.refs.push({ id: nid(), kind: b.dataset.addRef, uses: "", notUses: "", boundTo: "", groupTag: "", unused: false, keyAt: "", thumb: "", fileName: "" });
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
      return;
    }
    const clear = e.target.closest("[data-clear-thumb]");
    if (clear) {
      const r = state.refs.find(x => x.id === clear.dataset.clearThumb);
      if (r) { r.thumb = ""; r.fileName = ""; }
      renderStructure();
    }
  });
  $("ref-list").addEventListener("change", e => {
    const input = e.target.closest("[data-pick-ref]");
    if (!input || !input.files || !input.files[0]) return;
    const r = state.refs.find(x => x.id === input.dataset.pickRef);
    if (!r) return;
    const file = input.files[0];
    if (r.kind === "image") {
      shrinkImageToDataUrl(file, 480, 0.72).then(url => {
        r.thumb = url;
        r.fileName = file.name;
        renderStructure();
      }).catch(() => toast("この画像は読み込めませんでした"));
    } else {
      r.fileName = file.name;
      renderStructure();
    }
  });
  const refInput = e => {
    const card = e.target.closest("[data-id]");
    const k = e.target.dataset.k;
    if (!card || !k) return;
    const r = state.refs.find(x => x.id === card.dataset.id);
    if (!r) return;
    if (k === "unused") {
      r.unused = e.target.checked;
      renderStructure();          /* 見た目と境界フレームの候補が変わる */
      return;
    }
    r[k] = e.target.value;
    if (k === "uses") renderFrameSelects();   /* 候補の表示名に使っている */
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
  bindBeatList("main", "beat-list");
  bindBeatList("stage2", "stage2-list");

  /* --- 2本目（延長）の操作 --- */
  $("btn-add-stage2").addEventListener("click", () => {
    state.stage2.beats.push(newBeat(5));
    renderStructure();
  });
  $("btn-even-stage2").addEventListener("click", () => {
    if (!state.stage2.beats.length) return;
    const secs = evenBeats(state.stage2.beats.length, Number(state.stage2.duration));
    state.stage2.beats.forEach((b, i) => b.sec = secs[i]);
    renderStructure();
    toast("均等に割りました");
  });
  $("stage2-duration").addEventListener("change", e => {
    state.stage2.duration = Number(e.target.value);
    renderOutput();
  });
  $("edit-then-extend").addEventListener("change", e => {
    state.edit.thenExtend = e.target.checked;
    if (e.target.checked && !state.stage2.beats.length) {
      state.stage2.beats = evenBeats(2, Number(state.stage2.duration)).map(sec => newBeat(sec));
    }
    renderStructure();
  });

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
    copyText(text);
  });
  $("btn-txt").addEventListener("click", () => {
    const body = Builder.build(state, lang);
    download((state.meta.name || "seedance-prompt") + ".txt",
      body + "\n\n----------------\n" + Builder.settings(state), "text/plain");
  });
  $("btn-copy-settings").addEventListener("click", () => {
    copyText(Builder.settings(state));
  });
  $("btn-copy2").addEventListener("click", () => {
    copyText(Builder.buildStage2(state, lang));
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

/* ビート表の操作は2本とも同じなので共通化する */
function bindBeatList(which, boxId) {
  const box = $(boxId);

  box.addEventListener("click", e => {
    const del = e.target.closest("[data-del-beat]");
    if (del) {
      const list = beatsOf(which).filter(b => b.id !== del.dataset.delBeat);
      if (which === "stage2") state.stage2.beats = list; else state.beats = list;
      renderStructure();
      return;
    }
    const mv = e.target.closest("[data-move-beat]");
    if (mv) {
      moveItem(beatsOf(which), mv.dataset.moveBeat, Number(mv.dataset.dir));
      renderStructure();
    }
  });

  const onInput = e => {
    const card = e.target.closest("[data-id]");
    const k = e.target.dataset.k;
    if (!card || !k) return;
    const beats = beatsOf(which);
    const b = beats.find(x => x.id === card.dataset.id);
    if (!b) return;
    b[k] = k === "sec" ? Math.max(1, Number(e.target.value) || 1) : e.target.value;
    if (k === "sec") {
      const tl = Builder.timeline(beats);
      box.querySelectorAll(".beat-card").forEach((card2, i) => {
        const t = card2.querySelector(".beat-time");
        if (t && tl[i]) t.textContent = tl[i].start + "-" + tl[i].end + "s";
      });
    }
    renderOutput();
  };
  box.addEventListener("input", onInput);
  box.addEventListener("change", onInput);
}

/* 選んだ画像を確認用サムネイルに縮小する。AIには送らない・端末内だけで完結させる。
   localStorageを圧迫しないよう、長辺maxPxに縮めてJPEGで持つ。 */
function shrinkImageToDataUrl(file, maxPx, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load failed")); };
    img.src = url;
  });
}

function copyText(text) {
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
  s.extend = Object.assign(base.extend, obj.extend || {});
  s.frames = Object.assign(base.frames, obj.frames || {});
  s.output = Object.assign(base.output, obj.output || {});
  s.simple = Object.assign(base.simple, obj.simple || {});
  if (s.ui !== "simple" && s.ui !== "pro") s.ui = "simple";
  s.stage2 = Object.assign(base.stage2, obj.stage2 || {});
  if (!Array.isArray(s.stage2.beats)) s.stage2.beats = [];
  s.stage2.beats.forEach(b => { if (!b.id) b.id = nid(); });
  ["characters", "refs", "beats"].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
  s.refs.forEach(r => {
    if (r.unused === undefined) r.unused = false;
    if (r.keyAt === undefined) r.keyAt = "";
    if (r.thumb === undefined) r.thumb = "";
    if (r.fileName === undefined) r.fileName = "";
    if (r.role === undefined) r.role = "";
  });
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
  $("app-version").textContent = APP_VERSION;
  initStaticControls();
  bindEvents();
  syncControls();
  refreshProjectList();
  if (state.ui === "simple") applySimple();
  renderStructure();

  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", boot);

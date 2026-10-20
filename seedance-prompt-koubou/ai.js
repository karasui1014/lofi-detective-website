/* ============================================================
   シーダンス2.5 プロンプト工房 ── AIにおまかせ（ChatGPT・Claude連携）
   ============================================================
   ■ 何をするか
   「かんたん」は台本の行を機械的にカットへ分けるだけで、意味は読み取らない。
   ここでは意味の理解を ChatGPT や Claude に任せる。
     ① やりたいことを自由に書く
     ② 工房のルールを全部詰めた「頼む文」をコピーして、AIに貼る
     ③ AIの返事（JSON）を貼り戻すと、こだわりモードが全部埋まった状態になる
   ■ APIは使わない（コピペで橋渡しする）
   APIキーを預からずに済み、利用者がふだん使っているAIの有料・無料プランを
   そのまま使える。工房はプロンプトを作るだけで、生成はしないという設計も変わらない。
   ============================================================ */
"use strict";

/* 返事の形の見本。キーの名前は内部データと揃えてある */
const AI_SCHEMA_EXAMPLE = {
  purpose: "用途（MV・CM・ショートドラマ・SNSなど短く）",
  summary: "全体の流れを一文で（最初から最後まで）",
  characters: [
    { label: "<人物1>", build: "体格・年齢感", hair: "髪型と色", face: "顔立ち", wardrobe: "服装（色・素材）", props: "持ち物" }
  ],
  opening: "最初のフレームの状態（人物と物がどこにあるか）",
  closing: "最後のフレームの状態",
  beats: [
    { sec: 3, event: "目に見える出来事を具体的に1〜2文", move: "dolly in", sfx: "そのカットで鳴る音（任意）" }
  ],
  look: {
    startSize: "wide shot", endSize: "close-up", height: "eye level", pace: "slow",
    lighting: ["golden hour"], textures: ["cinematic"], colors: ["warm tone"]
  },
  audio: {
    ambience: "環境音", music: "音楽（なければ空）",
    dialogues: [{ speaker: "<人物1>", at: 4, text: "台詞", manner: "quietly" }]
  },
  avoid: ["jitter", "identity drift"],
  locks: ["顔立ち・髪型は最後まで同一に保つ"]
};

function aiEnList(list) {
  return list.map(x => (typeof x === "string" ? x : x.en)).join(", ");
}

/* カットの数は長さに見合う範囲にする（詰めすぎると1カットに動きが溢れて崩れる） */
function aiBeatRange(dur) {
  const max = Math.max(1, Math.min(6, Math.floor(dur / 3) || 1));
  const min = Math.max(1, Math.min(max, Math.round(dur / 8)));
  return { min, max };
}

/* AIに渡す「頼む文」を組み立てる */
function buildAiRequest() {
  const a = state.ai;
  const dur = Number(a.duration) || 15;
  const range = aiBeatRange(dur);
  const imgs = state.refs.filter(r => r.kind === "image" && !r.unused);
  const imgLines = imgs.length
    ? imgs.map((r, i) => {
        const role = IMAGE_ROLES.find(x => x.v === r.role);
        return "- image" + (i + 1) + "：" + (role ? role.l : (r.role || "役割未設定"));
      }).join("\n")
    : "なし（テキストだけで作る）";

  return [
    "あなたは、ByteDance の動画生成AI「Seedance 2.5」用のプロンプトを設計する映像ディレクターです。",
    "次の「やりたいこと」を、1シーン（ワンパス）の香盤表に組み立ててください。",
    "",
    "# やりたいこと",
    (a.idea || "").trim() || "（未記入）",
    "",
    "# 条件",
    "- 長さ：" + dur + "秒 ／ 画面比：" + (a.aspect || "16:9"),
    "- 参考画像：",
    imgLines,
    "- カットは " + range.min + "〜" + range.max + " 個。sec の合計はちょうど " + dur + " 秒にする",
    "- event は、目に見える動きを具体的に書く。「悲しい」のような感情語ではなく、表情・体の動き・物の変化で表す",
    "- 1カットに詰め込む動作は1つか2つまで。カメラの動き（move）は1カットにつき1つだけ",
    "- move は次から選ぶ：" + aiEnList(CAMERA_MOVES),
    "- startSize と endSize は次から選ぶ：" + aiEnList(SHOT_SIZES),
    "- height は次から選ぶ：" + aiEnList(CAMERA_HEIGHTS),
    "- pace は次から選ぶ：" + aiEnList(PACES),
    "- lighting は次から1〜2個：" + aiEnList(LIGHTING),
    "- textures は次から1〜2個：" + aiEnList(TEXTURES),
    "- colors は次から1〜2個：" + aiEnList(COLORS),
    "- avoid は次から必要なものを選ぶ：" + aiEnList(AVOID_TAGS),
    "- locks は次から必要なものを選ぶ（文言はそのまま）：" + LOCKS.join(" ／ "),
    "- 台詞は必要なときだけ入れる。at は何秒目に話すか。manner は次から選ぶ：" + aiEnList(DIALOG_MANNERS),
    imgs.length
      ? "- 人物が出るなら characters に、毎回同じ見た目で出せるよう具体的に書き、event や台詞の speaker では <人物1> のようなラベルで呼ぶ。出ないなら空の配列"
      : "- 参考画像が無いので characters は空の配列にする。人物は event の中で、服の色など見た目がわかる短い言い方で書く（<人物1> のようなラベルは使わない）",
    "- 長さ・画面比・解像度は、本文（event など）に書かない",
    "- 文章は日本語で。move などの選択肢は英語のまま",
    "",
    "# 返事の形",
    "説明は要りません。次の形の JSON だけを ```json で囲んで返してください。",
    "```json",
    JSON.stringify(AI_SCHEMA_EXAMPLE, null, 2),
    "```"
  ].join("\n");
}

/* 返事から JSON を取り出す。前後の説明文や ``` があっても読めるようにする */
function aiExtractJson(text) {
  const t = String(text || "");
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let body = fenced ? fenced[1] : t;
  const s = body.indexOf("{");
  const e = body.lastIndexOf("}");
  if (s === -1 || e <= s) throw new Error("返事の中に JSON が見つかりませんでした。AIの返事を全部コピーして貼ってください。");
  body = body.slice(s, e + 1)
    .replace(/[“”]/g, '"')
    .replace(/,\s*([}\]])/g, "$1");   /* 末尾の余計なカンマ */
  try {
    return JSON.parse(body);
  } catch (err) {
    throw new Error("JSON の形が崩れていて読めませんでした。AIに「JSONだけをもう一度」と頼んでください。");
  }
}

function aiStr(v, max) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max || 300);
}
/* AIがよく使う言い換えを、工房の選択肢に寄せる */
const AI_MOVE_ALIASES = [
  [/push ?in|zoom ?in|move in|dolly forward/i, "dolly in"],
  [/pull ?(out|back)|zoom ?out|move (out|back)|dolly back/i, "dolly out"],
  [/static|fixed|still|locked|tripod/i, "locked-off"],
  [/follow|track/i, "tracking"],
  [/orbit.*left|arc.*left/i, "arc left"],
  [/orbit|arc/i, "arc right"],
  [/hand ?held|shaky/i, "handheld"],
  [/drone|aerial|bird/i, "aerial"],
  [/focus/i, "rack focus"],
  [/pedestal up|boom up|rise|crane up/i, "crane up"],
  [/pedestal down|boom down|crane down/i, "crane down"]
];
function aiMove(v) {
  const direct = aiPick(v, CAMERA_MOVES);
  if (direct) return direct;
  const t = aiStr(v);
  const hit = AI_MOVE_ALIASES.find(([re]) => re.test(t));
  return hit ? hit[1] : "";
}

/* 選択肢にあるものだけ残す（AIが勝手に作った言葉で画面が壊れないように） */
function aiPick(v, list) {
  const allowed = list.map(x => (typeof x === "string" ? x : x.en));
  return allowed.indexOf(aiStr(v)) !== -1 ? aiStr(v) : "";
}
function aiPickMany(arr, list, max) {
  const out = [];
  (Array.isArray(arr) ? arr : []).forEach(v => {
    const p = aiPick(v, list);
    if (p && out.indexOf(p) === -1) out.push(p);
  });
  return out.slice(0, max || 99);
}

/* 秒数の合計を長さにぴったり合わせる（AIは合計を外しがち） */
function aiFitSeconds(secs, dur) {
  const raw = secs.map(s => Math.max(1, Math.round(Number(s) || 1)));
  const total = raw.reduce((a, b) => a + b, 0);
  const fit = raw.map(s => Math.max(1, Math.round(s * dur / total)));
  let diff = dur - fit.reduce((a, b) => a + b, 0);
  /* 端数は、いちばん長いカットで吸収する（短いカットを削ると動きが入らなくなる） */
  while (diff !== 0) {
    let k = 0;
    fit.forEach((s, i) => { if (s > fit[k]) k = i; });
    if (diff > 0) { fit[k] += 1; diff -= 1; }
    else if (fit[k] > 1) { fit[k] -= 1; diff += 1; }
    else break;   /* 全部1秒でも足りない＝カット数が長さより多い（呼び出し側で上限を切ってある） */
  }
  return fit;
}

/* 返事を内部データへ書き込む。戻り値は画面に出す一言 */
function importAiReply(text) {
  const j = aiExtractJson(text);
  const a = state.ai;
  const dur = Number(a.duration) || 15;
  const range = aiBeatRange(dur);

  const beatsIn = (Array.isArray(j.beats) ? j.beats : []).filter(b => b && aiStr(b.event));
  if (!beatsIn.length) throw new Error("カット（beats）が1つもありませんでした。");
  const trimmed = beatsIn.slice(0, range.max);
  const secs = aiFitSeconds(trimmed.map(b => b.sec), dur);

  state.beats = trimmed.map((b, i) => {
    const nb = newBeat(secs[i]);
    nb.event = aiStr(b.event, 400);
    nb.move = aiMove(b.move);
    nb.sfx = aiStr(b.sfx, 120);
    return nb;
  });

  state.characters = (Array.isArray(j.characters) ? j.characters : []).slice(0, LIMITS.people).map((c, i) => ({
    id: nid(),
    label: aiStr(c.label, 20) || "<人物" + (i + 1) + ">",
    build: aiStr(c.build, 120), hair: aiStr(c.hair, 120), face: aiStr(c.face, 120),
    wardrobe: aiStr(c.wardrobe, 160), props: aiStr(c.props, 120)
  }));

  const look = j.look || {};
  state.look.startSize = aiPick(look.startSize, SHOT_SIZES);
  state.look.endSize = aiPick(look.endSize, SHOT_SIZES);
  state.look.height = aiPick(look.height, CAMERA_HEIGHTS);
  state.look.pace = aiPick(look.pace, PACES);
  state.look.lighting = aiPickMany(look.lighting, LIGHTING, 3);
  state.look.textures = aiPickMany(look.textures, TEXTURES, 3);
  state.look.colors = aiPickMany(look.colors, COLORS, 3);

  const audio = j.audio || {};
  state.audio.ambience = aiStr(audio.ambience, 200);
  state.audio.music = aiStr(audio.music, 200);
  state.audio.dialogues = (Array.isArray(audio.dialogues) ? audio.dialogues : [])
    .filter(d => d && aiStr(d.text))
    .slice(0, 12)
    .map(d => ({
      id: nid(),
      speaker: aiStr(d.speaker, 20),
      lang: "Japanese",
      manner: aiPick(d.manner, DIALOG_MANNERS),
      at: Math.max(0, Math.min(dur, Math.round(Number(d.at) || 0))),
      text: aiStr(d.text, 200)
    }));

  state.guards.avoid = aiPickMany(j.avoid, AVOID_TAGS);
  state.guards.locks = aiPickMany(j.locks, LOCKS);
  state.opening = aiStr(j.opening, 300);
  state.closing = aiStr(j.closing, 300);

  state.meta.summary = aiStr(j.summary, 200);
  state.meta.purpose = aiStr(j.purpose, 30);
  state.meta.duration = dur;
  state.meta.aspect = a.aspect || "16:9";

  /* 参考画像があればキャラ固定（Lv1）、人物や始まり・終わりまで決まっていれば30秒フル演出（Lv2）も選べる */
  const hasImg = state.refs.some(r => r.kind === "image" && !r.unused);
  state.mode = hasImg ? ((state.opening || state.closing) && dur >= 20 ? "lv2" : "lv1") : "lv0";

  /* 画像なし（Lv0）は人物の定義を出力しない設計なので、
     AIがラベル（<人物1>）を使ってきたら、見た目の言葉に置き換えて本文だけで通じるようにする */
  if (state.mode === "lv0" && state.characters.length) {
    const swap = text => state.characters.reduce((t, c) => {
      const look = [c.build, c.wardrobe].filter(Boolean);
      const desc = look.length ? (look[0] + (look[1] ? "（" + look[1] + "）" : "")) : "";
      return desc ? t.split(c.label).join(desc) : t;
    }, text || "");
    state.beats.forEach(b => { b.event = swap(b.event); });
    state.audio.dialogues.forEach(d => { d.speaker = swap(d.speaker); });
    state.meta.summary = swap(state.meta.summary);
    state.opening = swap(state.opening);
    state.closing = swap(state.closing);
  }

  const notes = ["AIの案を読み込みました：" + state.beats.length + "カット"];
  if (state.audio.dialogues.length) notes.push("台詞 " + state.audio.dialogues.length + "個");
  if (state.characters.length) notes.push("人物 " + state.characters.length + "人");
  if (beatsIn.length > trimmed.length) notes.push("カットが多かったので " + trimmed.length + " 個までにしました");
  return notes.join(" / ");
}

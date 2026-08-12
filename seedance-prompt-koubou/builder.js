/* ============================================================
   プロンプト組み立て
   state → Seedance 2.5 形式のプロンプト文字列
   lang: "ja"（全部日本語） / "mix"（専門語だけ英語・推奨）
   ============================================================ */
"use strict";

const Builder = (function () {

  /* 語彙タグ（en値で保持）を表示用に変換 */
  function term(enValue, dict, lang) {
    const hit = dict.find(d => d.en === enValue);
    if (!hit) return enValue;
    if (lang === "mix") return hit.en;
    return hit.ja;
  }

  function terms(list, dict, lang) {
    return (list || []).map(v => term(v, dict, lang)).join("、");
  }

  /* 参照素材のラベル（@Image 1 など）を種別ごとに採番 */
  function refLabel(refs, ref) {
    const same = refs.filter(r => r.kind === ref.kind);
    const idx = same.indexOf(ref) + 1;
    const head = ref.kind === "image" ? "Image" : ref.kind === "video" ? "Video" : "Audio";
    return "@" + head + " " + idx;
  }

  function labelsOf(refs) {
    const map = new Map();
    refs.forEach(r => map.set(r.id, refLabel(refs, r)));
    return map;
  }

  /* ビートの開始・終了秒を計算 */
  function timeline(beats) {
    let cur = 0;
    return beats.map(b => {
      const start = cur;
      const sec = Number(b.sec) || 0;
      cur += sec;
      return { beat: b, start: start, end: cur };
    });
  }

  function line(arr) {
    return arr.filter(s => s && String(s).trim()).join("");
  }

  /* ---------- 各セクション ---------- */

  function secGoal(s, lang) {
    const m = s.meta;
    const head = [
      m.duration + "秒",
      m.aspect,
      m.resolution,
      m.purpose
    ].filter(Boolean).join("・");
    const body = (m.summary || "").trim();
    return "[生成目標]\n" + line([head, body ? "。" + body : ""]);
  }

  function secCharacters(s) {
    if (!s.characters.length) return "";
    const rows = s.characters.map(c => {
      const anchors = [c.build, c.hair, c.face, c.wardrobe, c.props]
        .map(v => (v || "").trim()).filter(Boolean);
      if (!anchors.length) return null;
      return c.label + " ＝ " + anchors.join("、") + "。";
    }).filter(Boolean);
    if (!rows.length) return "";
    return "[登場人物]\n" + rows.join("\n") +
      "\n※この記述は全ショットで一字一句同じものを使うこと。";
  }

  /* skipId: 編集モードの元動画など、別セクションで宣言済みの素材を除く。
     ラベルの採番は常に全素材から計算する（除外で番号がずれないように）。 */
  function secRefs(s, skipId) {
    const list = s.refs.filter(r => r.id !== skipId);
    if (!list.length) return "";
    const map = labelsOf(s.refs);
    const rows = list.map(r => {
      const label = map.get(r.id);
      const target = (r.boundTo || "").trim();
      const uses = (r.uses || "").trim();
      const not = (r.notUses || "").trim();
      let t = label + " は";
      if (target && target !== "全体") t += target + "の";
      t += (uses || "（役割未記入）") + "のみを定義。";
      if (not) t += not + "は使わない。";
      return t;
    });

    /* 同一物グループ → 「1個だけ」宣言 */
    const groups = {};
    list.forEach(r => {
      const g = (r.groupTag || "").trim();
      if (!g) return;
      (groups[g] = groups[g] || []).push(map.get(r.id));
    });
    Object.keys(groups).forEach(g => {
      if (groups[g].length < 2) return;
      rows.push(groups[g].join(" と ") + " はどれも同じ「" + g + "」1個を写したもの。映像内に " + g + " は1個だけ。");
    });

    return "[参照素材]\n" + rows.join("\n");
  }

  function secOpening(s) {
    const v = (s.opening || "").trim();
    return v ? "[初期状態]\n" + v : "";
  }

  function secEvents(s, lang) {
    const tl = timeline(s.beats);
    const rows = tl.map(t => {
      const b = t.beat;
      const time = t.start + "-" + t.end + "s: ";
      let body = (b.event || "").trim();
      if (body && !/[。.！!？?]$/.test(body)) body += "。";
      if (b.move) {
        body += "カメラは " + term(b.move, CAMERA_MOVES, lang) + "。";
      }
      return time + body;
    });
    return "[主要な出来事]\n" + rows.join("\n");
  }

  function secClosing(s) {
    const v = (s.closing || "").trim();
    return v ? "[終了状態]\n" + v : "";
  }

  function secLook(s, lang) {
    const L = s.look;
    const rows = [];
    const shot = [];
    if (L.startSize) shot.push(term(L.startSize, SHOT_SIZES, lang));
    if (L.endSize) shot.push(term(L.endSize, SHOT_SIZES, lang));
    if (shot.length) rows.push("ショット: " + shot.join(" → "));
    if (L.height) rows.push("カメラ高さ・角度: " + term(L.height, CAMERA_HEIGHTS, lang));
    if (L.pace) rows.push("テンポ: " + term(L.pace, PACES, lang));
    if (L.lighting.length) rows.push("光: " + terms(L.lighting, LIGHTING, lang));
    if (L.textures.length) rows.push("質感・スタイル: " + terms(L.textures, TEXTURES, lang));
    if (L.colors.length) rows.push("色: " + terms(L.colors, COLORS, lang));
    if (!rows.length) return "";
    return "[映像]\n" + rows.join("。") + "。\nカメラの動きは各ショットにつき1つだけ。";
  }

  function secAudio(s, lang) {
    const A = s.audio;
    const rows = [];

    const amb = (A.ambience || "").split(/[、,\n]/).map(v => v.trim()).filter(Boolean);
    if (amb.length) rows.push(amb.map(v => "<" + v + ">").join(" "));

    /* ビートに紐づく効果音 */
    const tl = timeline(s.beats);
    tl.forEach(t => {
      const sfx = (t.beat.sfx || "").trim();
      if (!sfx) return;
      rows.push("<" + sfx + "> at " + t.start + "s");
    });

    if ((A.music || "").trim()) rows.push("(" + A.music.trim() + ")");

    (A.dialogues || []).forEach(d => {
      if (!(d.text || "").trim()) return;
      const head = ["Spoken language: " + (d.lang || "Japanese")];
      if (d.manner) head.push(term(d.manner, DIALOG_MANNERS, "mix"));
      let t = head.join(", ");
      if (d.speaker) t += ", " + d.speaker;
      if (d.at !== "" && d.at !== null && d.at !== undefined) t += " at " + d.at + "s";
      t += " says: {" + d.text.trim() + "}";
      rows.push(t);
    });

    const caps = (A.captions || "").split(/\n/).map(v => v.trim()).filter(Boolean);
    caps.forEach(c => rows.push("【" + c + "】"));

    if (A.silence) rows.push("音楽なし。ナレーションなし。指示していない字幕を出さない。");

    if (!rows.length) return "";
    return "[音声]\n" + rows.join("\n");
  }

  function secGuards(s, lang) {
    const rows = [];
    (s.guards.locks || []).forEach(l => rows.push(l + "。"));
    if ((s.guards.avoid || []).length) {
      rows.push("avoid: " + s.guards.avoid.join(", "));
    }
    if (!rows.length) return "";
    return "[一貫性の維持]\n" + rows.join("\n");
  }

  /* ---------- 編集モード ---------- */
  function buildEdit(s, lang) {
    const map = labelsOf(s.refs);
    const src = s.refs.find(r => r.kind === "video");
    const srcLabel = src ? map.get(src.id) : "@Video 1";
    const out = [];

    out.push("[編集指示]\n" + srcLabel + " を編集する。" + srcLabel + " を唯一の編集マスターとし、指定していない部分は一切変更しない。");

    const keep = (s.edit.keep || "").trim();
    if (keep) out.push("Keep: " + keep + " はそのまま維持する。");

    const tl = timeline(s.beats);
    const rows = tl.map(t => {
      const b = t.beat;
      const body = (b.event || "").trim() || "変更なし";
      return t.start + "-" + t.end + "s: " + body;
    });
    out.push("Change:\n" + rows.join("\n"));

    const refs = secRefs(s, src ? src.id : null);
    if (refs) out.push(refs);

    out.push("差し替えた要素は元の照明・レンズ・粒状感に合わせる。");

    const g = secGuards(s, lang);
    if (g) out.push(g);

    return out.filter(Boolean).join("\n\n");
  }

  /* ---------- 本体 ---------- */
  function build(s, lang) {
    lang = lang || "mix";
    if (s.mode === "edit") return buildEdit(s, lang);

    const withRefs = s.mode === "lv1" || s.mode === "lv2";
    const full = s.mode === "lv2";

    const parts = [
      secGoal(s, lang),
      withRefs ? secCharacters(s) : "",
      withRefs ? secRefs(s) : "",
      full ? secOpening(s) : "",
      secEvents(s, lang),
      full ? secClosing(s) : "",
      secLook(s, lang),
      secAudio(s, lang),
      secGuards(s, lang)
    ];

    return parts.filter(p => p && p.trim()).join("\n\n");
  }

  return { build: build, timeline: timeline, labelsOf: labelsOf, refLabel: refLabel };
})();

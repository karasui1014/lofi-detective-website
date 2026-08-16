/* ============================================================
   プロンプト組み立て
   state → Seedance 2.5 形式のプロンプト文字列

   節の順番は「素材参照 → 一文要約 → ショット/時系列 → 一貫性」。
   素材の役割を最初に固定してから中身を書くほうが混線しにくい。

   長さ・比率・解像度・APIの境界フレーム指定などの「設定値」は
   本文に混ぜず、settings() で別に返す。
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

  function refById(s, id) {
    return s.refs.find(r => r.id === id) || null;
  }
  function labelById(s, id) {
    const r = refById(s, id);
    return r ? refLabel(s.refs, r) : "";
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

  /* 古い形式のプロジェクトを読んでも落ちないように、足りない箱を埋める。
     通常は app.js の migrate() が先に埋めるが、ここが落ちると画面全体が消えるため二重に守る。 */
  function normalize(s) {
    s.meta = s.meta || {};
    s.look = s.look || {};
    s.audio = s.audio || {};
    s.guards = s.guards || {};
    s.edit = s.edit || {};
    s.extend = s.extend || { direction: "backward", boundary: "" };
    s.frames = s.frames || { mode: "", first: "", last: "" };
    s.output = s.output || { symbols: true, timestamps: true };
    s.stage2 = s.stage2 || { duration: 10, beats: [] };
    ["characters", "refs", "beats"].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
    if (!Array.isArray(s.stage2.beats)) s.stage2.beats = [];
    ["lighting", "textures", "colors"].forEach(k => { if (!Array.isArray(s.look[k])) s.look[k] = []; });
    ["avoid", "locks"].forEach(k => { if (!Array.isArray(s.guards[k])) s.guards[k] = []; });
    if (!Array.isArray(s.audio.dialogues)) s.audio.dialogues = [];
    return s;
  }

  function sentence(v) {
    const t = (v || "").trim();
    if (!t) return "";
    return /[。.！!？?]$/.test(t) ? t : t + "。";
  }

  /* ---------- 素材参照 ---------- */
  /* skipId: 編集元・延長元など、別セクションで宣言済みの素材を除く。
     ラベルの採番は常に全素材から計算する（除外で番号がずれないように）。 */
  function secRefs(s, skipId) {
    const map = labelsOf(s.refs);
    const used = s.refs.filter(r => r.id !== skipId && !r.unused);
    const unused = s.refs.filter(r => r.id !== skipId && r.unused);
    const rows = [];

    used.forEach(r => {
      const label = map.get(r.id);
      const target = (r.boundTo || "").trim();
      const uses = (r.uses || "").trim();
      const not = (r.notUses || "").trim();
      let t = label + " は";
      if (target && target !== "全体") t += target + "の";
      t += (uses || "（役割未記入）") + "のみを定義。";
      if (not) t += not + "は使わない。";
      rows.push(t);
    });

    /* 同一物グループ → 「1個だけ」宣言 */
    const groups = {};
    used.forEach(r => {
      const g = (r.groupTag || "").trim();
      if (!g) return;
      (groups[g] = groups[g] || []).push(map.get(r.id));
    });
    Object.keys(groups).forEach(g => {
      if (groups[g].length < 2) return;
      rows.push(groups[g].join(" と ") + " はどれも同じ「" + g + "」1個を写したもの。映像内に " + g + " は1個だけ。");
    });

    /* 意味的な境界フレーム・キーフレーム */
    if (s.frames.mode === "semantic") {
      const f = labelById(s, s.frames.first);
      const l = labelById(s, s.frames.last);
      if (f) rows.push(f + " を最初のフレームとして参照する。完全一致は求めない。");
      if (l) rows.push(l + " を最後のフレームとして参照する。完全一致は求めない。");
    }
    used.forEach(r => {
      const at = String(r.keyAt === undefined ? "" : r.keyAt).trim();
      if (at === "") return;
      rows.push(map.get(r.id) + " を " + at + "秒地点のキーフレームとして参照する。");
    });

    /* ストーリーボード：読み順＋各コマの役割を列挙する（15コマ以内を推奨） */
    used.filter(r => r.specialty === "storyboard").forEach(r => {
      const label = map.get(r.id);
      const order = (r.sbOrder || "").trim();
      const panels = String(r.sbPanels || "").split("\n").map(s => s.trim()).filter(Boolean);
      let t = label + " はストーリーボード。";
      if (order) t += "読み順: " + order + "。";
      rows.push(t);
      if (panels.length) {
        rows.push("各コマの役割: " + panels.map((p, i) => (i + 1) + ") " + p).join("、"));
      }
    });

    /* 3Dブロックアウト：引き継ぐ情報と捨てる見た目を分けて明示する */
    used.filter(r => r.specialty === "blockout-rough" || r.specialty === "blockout-fine").forEach(r => {
      const label = map.get(r.id);
      const kindName = r.specialty === "blockout-rough" ? "粗い3Dブロックアウト" : "精細な3Dブロックアウト";
      const carry = (r.boCarry || "").trim();
      const discard = (r.boDiscard || "").trim();
      let t = label + " は" + kindName + "。";
      if (carry) t += "引き継ぐ情報: " + carry + "。";
      t += "見た目（" + (discard || "白模型の質感・色・素材") + "）は捨てて、実写の質感に置き換える。";
      rows.push(t);
    });

    if (!rows.length && !unused.length) return "";

    let out = rows.length ? "[素材参照]\n" + rows.join("\n") : "";
    if (unused.length) {
      const line = "[未使用素材]\n" + unused.map(r => map.get(r.id)).join("、") + " は今回使わない。";
      out = out ? out + "\n\n" + line : line;
    }
    return out;
  }

  /* ---------- 一文要約 ---------- */
  function secSummary(s, lang) {
    const parts = [sentence(s.meta.summary)];
    const style = [s.meta.purpose, terms(s.look.textures, TEXTURES, lang)]
      .filter(v => (v || "").trim()).join("、");
    if (style) parts.push(style + "。");

    const cam = [];
    if (s.look.startSize && s.look.endSize) {
      cam.push(term(s.look.startSize, SHOT_SIZES, lang) + "から" + term(s.look.endSize, SHOT_SIZES, lang) + "へ");
    } else if (s.look.startSize) {
      cam.push(term(s.look.startSize, SHOT_SIZES, lang));
    }
    if (s.look.height) cam.push(term(s.look.height, CAMERA_HEIGHTS, lang));
    if (s.look.pace) cam.push(term(s.look.pace, PACES, lang));
    if (cam.length) parts.push(cam.join("、") + "。");

    const body = parts.filter(Boolean).join("");
    return body ? "[一文要約]\n" + body : "";
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

  function secOpening(s) {
    const v = (s.opening || "").trim();
    return v ? "[初期状態]\n" + v : "";
  }

  function secClosing(s) {
    const v = (s.closing || "").trim();
    return v ? "[終了状態]\n" + v : "";
  }

  /* ---------- ショット／時系列 ---------- */
  function secEvents(s, lang, title, beatsOverride) {
    const useTime = !!s.output.timestamps;
    const tl = timeline(beatsOverride || s.beats);
    const rows = tl.map((t, i) => {
      const b = t.beat;
      const head = useTime ? t.start + "-" + t.end + "s: " : (i + 1) + ". ";
      let body = sentence(b.event);
      if (b.move) body += "カメラは " + term(b.move, CAMERA_MOVES, lang) + "。";
      return head + body;
    });
    if (!rows.length) return "";
    return "[" + (title || "ショット／時系列") + "]\n" + rows.join("\n");
  }

  /* ---------- 映像 ---------- */
  function secLook(s, lang) {
    const L = s.look;
    const rows = [];
    if (L.lighting.length) rows.push("光: " + terms(L.lighting, LIGHTING, lang));
    if (L.colors.length) rows.push("色: " + terms(L.colors, COLORS, lang));
    if (!rows.length && !s.beats.some(b => b.move)) return "";
    rows.push("カメラの動きは各ショットにつき1つだけ");
    return "[映像]\n" + rows.join("。") + "。";
  }

  /* ---------- 音声 ---------- */
  function secAudio(s, lang) {
    const A = s.audio;
    const sym = !!s.output.symbols;
    const rows = [];

    const amb = (A.ambience || "").split(/[、,\n]/).map(v => v.trim()).filter(Boolean);
    if (amb.length) {
      rows.push(sym ? amb.map(v => "<" + v + ">").join(" ") : "環境音: " + amb.join("、"));
    }

    /* ビートに紐づく効果音 */
    const tl = timeline(s.beats);
    tl.forEach(t => {
      const sfx = (t.beat.sfx || "").trim();
      if (!sfx) return;
      rows.push(sym ? "<" + sfx + "> at " + t.start + "s"
                    : "効果音: " + sfx + "（" + t.start + "秒）");
    });

    if ((A.music || "").trim()) {
      rows.push(sym ? "(" + A.music.trim() + ")" : "音楽: " + A.music.trim());
    }

    (A.dialogues || []).forEach(d => {
      if (!(d.text || "").trim()) return;
      const lg = d.lang || "Japanese";
      const mn = d.manner ? term(d.manner, DIALOG_MANNERS, sym ? "mix" : "ja") : "";
      const at = (d.at === "" || d.at === null || d.at === undefined) ? "" : d.at;
      if (sym) {
        let t = "Spoken language: " + lg;
        if (mn) t += ", " + mn;
        if (d.speaker) t += ", " + d.speaker;
        if (at !== "") t += " at " + at + "s";
        rows.push(t + " says: {" + d.text.trim() + "}");
      } else {
        const head = [lg, mn, d.speaker].filter(Boolean).join("・");
        rows.push("台詞: " + head + (at !== "" ? "（" + at + "秒）" : "") + "「" + d.text.trim() + "」");
      }
    });

    const caps = (A.captions || "").split(/\n/).map(v => v.trim()).filter(Boolean);
    caps.forEach(c => rows.push(sym ? "【" + c + "】" : "字幕: " + c));

    if (A.silence) rows.push("音楽なし。ナレーションなし。指示していない字幕を出さない。");

    if (!rows.length) return "";
    return "[音声]\n" + rows.join("\n");
  }

  function secGuards(s) {
    const rows = [];
    (s.guards.locks || []).forEach(l => rows.push(l + "。"));
    if ((s.guards.avoid || []).length) {
      rows.push("avoid: " + s.guards.avoid.join(", "));
    }
    if (!rows.length) return "";
    return "[一貫性]\n" + rows.join("\n");
  }

  /* ---------- 編集モード ---------- */
  function editHead(s) {
    const src = s.refs.find(r => r.kind === "video");
    const label = src ? refLabel(s.refs, src) : "@Video 1";
    const out = ["[編集指示]\n" + label + " を編集する。" + label +
      " を唯一の編集マスターとし、指定していない部分は一切変更しない。元の時系列をそのまま引き継ぐ。"];
    const keep = (s.edit.keep || "").trim();
    if (keep) out.push("そのまま維持するもの: " + keep + "。");
    return { text: out.join("\n"), srcId: src ? src.id : null };
  }

  /* ---------- 延長モード ---------- */
  function extendHead(s) {
    const src = s.refs.find(r => r.kind === "video");
    const label = src ? refLabel(s.refs, src) : "@Video 1";
    const dir = s.extend.direction === "forward"
      ? "前方（この場面より前）"
      : "後方（この続き）";
    const out = ["[延長指示]\n" + label + " の" + dir + "を生成する。" + label +
      " を唯一の延長元とし、同じ人物・同じ場所・同じ画作りを途切れさせずに引き継ぐ。"];
    const b = (s.extend.boundary || "").trim();
    if (b) out.push("つなぎ目の状態: " + sentence(b));
    return { text: out.join("\n"), srcId: src ? src.id : null };
  }

  /* ---------- 2段階（編集 → 延長）の2本目 ---------- */
  function twoStage(s) {
    return s.mode === "edit" && !!s.edit.thenExtend;
  }

  function buildStage2(s, lang) {
    normalize(s);
    const dir = s.extend.direction === "forward"
      ? "前方（この場面より前）"
      : "後方（この続き）";
    const src = s.refs.find(r => r.kind === "video");
    const out = [];

    out.push("[延長指示]\nプロンプト1で編集して出来た動画を元動画として、その" + dir + "を生成する。" +
      "その動画を唯一の延長元とし、同じ人物・同じ場所・同じ画作りを途切れさせずに引き継ぐ。" +
      "プロンプト1で差し替えた要素は、延長部分でも差し替え後の状態を保つ。");

    const b = (s.extend.boundary || "").trim();
    if (b) out.push("つなぎ目の状態: " + sentence(b));

    /* 編集元の動画は「もう使わない素材」なので外す */
    const refs = secRefs(s, src ? src.id : null);
    if (refs) out.push(refs);

    const ev = secEvents(s, lang, "延長部分のショット／時系列", s.stage2.beats);
    if (ev) out.push(ev);

    /* 効果音は2本目のビートから作り直す */
    const sym = !!s.output.symbols;
    const sfxRows = [];
    timeline(s.stage2.beats).forEach(t => {
      const sfx = (t.beat.sfx || "").trim();
      if (!sfx) return;
      sfxRows.push(sym ? "<" + sfx + "> at " + t.start + "s"
                       : "効果音: " + sfx + "（" + t.start + "秒）");
    });
    sfxRows.push("環境音・音楽・声の質感は元動画に合わせる。");
    out.push("[音声]\n" + sfxRows.join("\n"));

    out.push("画作り（光・色・粒状感・レンズ）は元動画に合わせる。");

    const g = secGuards(s);
    if (g) out.push(g);

    return out.filter(p => p && p.trim()).join("\n\n");
  }

  /* ============================================================
     かんたんモードの書き出し

     節の名前を「参考・内容・展開・音・固定」という普段の言葉にする。
     こだわりモードの [素材参照][一文要約]… と中身は同じだが、
     はじめて触る人が読んで意味の分かる見出しにしてある。
     ============================================================ */
  function buildSimple(s, lang) {
    normalize(s);
    lang = lang || "mix";
    const sp = s.simple;
    const out = [];

    /* --- 参考 --- */
    const refs = s.refs.filter(r => !r.unused && (r.uses || "").trim());
    if (refs.length) {
      const map = labelsOf(s.refs);
      const rows = refs.map(r => {
        let t = map.get(r.id) + " は" + r.uses.trim() + "のみを定義。";
        if ((r.notUses || "").trim()) t += r.notUses.trim() + "は使わない。";
        return t;
      });
      const unused = s.refs.filter(r => r.unused);
      if (unused.length) {
        rows.push(unused.map(r => map.get(r.id)).join("、") + " は今回使わない。");
      }
      out.push("[参考]\n" + rows.join("\n"));
    }

    /* --- 内容 --- */
    const content = [];
    const place = (sp.place || "").trim();
    if (place) content.push("場所は" + place + "。");
    const kind = SUBJECT_KINDS.find(k => k.v === sp.subjectKind);
    const name = (sp.subjectName || "").trim();
    if (name || kind) {
      content.push("主役は" + (name || kind.l) + (name && kind ? "（" + kind.l + "）" : "") + "。");
    }
    if ((s.meta.summary || "").trim()) content.push(sentence(s.meta.summary));

    const look = [s.meta.purpose, terms(s.look.textures, TEXTURES, lang), terms(s.look.colors, COLORS, lang)]
      .filter(v => (v || "").trim()).join("、");
    if (look) content.push(look + "。");

    const shot = [];
    if (s.look.startSize && s.look.endSize) {
      shot.push(term(s.look.startSize, SHOT_SIZES, lang) + " から " + term(s.look.endSize, SHOT_SIZES, lang) + " へ");
    }
    if (s.look.height) shot.push(term(s.look.height, CAMERA_HEIGHTS, lang));
    if (s.look.lighting.length) shot.push("光は " + terms(s.look.lighting, LIGHTING, lang));
    if (shot.length) content.push(shot.join("、") + "。");

    if (content.length) out.push("[内容]\n" + content.join("\n"));

    /* --- 展開 --- */
    const ev = secEvents(s, lang, "展開");
    if (ev) out.push(ev + "\nカメラの動きは各ショットにつき1つだけ。");

    /* --- 音 --- */
    const audio = secAudio(s, lang);
    if (audio) out.push(audio.replace("[音声]", "[音]"));

    /* --- 固定 --- */
    const fixRows = [];
    (s.guards.locks || []).forEach(l => fixRows.push(l + "。"));
    if ((s.guards.avoid || []).length) fixRows.push("avoid: " + s.guards.avoid.join(", "));
    if (fixRows.length) out.push("[固定]\n" + fixRows.join("\n"));

    return out.filter(p => p && p.trim()).join("\n\n");
  }

  /* ============================================================
     本体
     ============================================================ */
  function build(s, lang) {
    normalize(s);
    lang = lang || "mix";
    const withRefs = s.mode !== "lv0";
    const full = s.mode === "lv2";
    let head = null;

    if (s.mode === "edit") head = editHead(s);
    if (s.mode === "extend") head = extendHead(s);

    const eventsTitle = s.mode === "edit" ? "変更内容"
      : s.mode === "extend" ? "延長部分のショット／時系列"
      : "ショット／時系列";

    const parts = [
      head ? head.text : "",
      withRefs ? secRefs(s, head ? head.srcId : null) : "",
      s.mode === "edit" ? "" : secSummary(s, lang),
      withRefs && s.mode !== "edit" ? secCharacters(s) : "",
      full ? secOpening(s) : "",
      secEvents(s, lang, eventsTitle),
      full ? secClosing(s) : "",
      s.mode === "edit" ? "" : secLook(s, lang),
      s.mode === "edit" ? "" : secAudio(s, lang),
      s.mode === "edit" ? "差し替えた要素は元の照明・レンズ・粒状感に合わせる。" : "",
      secGuards(s)
    ];

    return parts.filter(p => p && p.trim()).join("\n\n");
  }

  /* ============================================================
     推奨設定（本文とは分けて出す）
     ============================================================ */
  function settings(s) {
    normalize(s);
    const rows = [];

    if (s.mode === "edit") {
      rows.push("比率と長さ: 元動画に合わせる（編集は元動画の設定を引き継ぐ）");
    } else if (s.mode === "extend") {
      rows.push("比率: 元動画に合わせる");
      rows.push("延長する長さ: " + s.meta.duration + "秒");
    } else if (s.frames.mode === "strict") {
      rows.push("長さ: " + s.meta.duration + "秒");
      rows.push("比率: 最初のフレーム画像にロックされる（設定値ではなく画像で決まる）");
      rows.push("解像度: " + s.meta.resolution);
    } else {
      rows.push("長さ: " + s.meta.duration + "秒");
      rows.push("比率: " + s.meta.aspect);
      rows.push("解像度: " + s.meta.resolution);
    }

    if (s.frames.mode === "strict") {
      const f = labelById(s, s.frames.first);
      const l = labelById(s, s.frames.last);
      if (f) rows.push("最初のフレーム: " + f + " を content.role=first_frame で渡す");
      if (l) rows.push("最後のフレーム: " + l + " を content.role=last_frame で渡す");
      rows.push("※ 厳密指定では比率が最初のフレーム画像にロックされます。最初と最後の画像の比率を揃えてください。");
    }

    if (twoStage(s)) {
      rows.push("");
      rows.push("プロンプト2（延長）");
      rows.push("比率: プロンプト1で出来た動画に合わせる");
      rows.push("延長する長さ: " + s.stage2.duration + "秒");
    }

    return "推奨設定\n" + rows.join("\n");
  }

  return {
    build: build,
    buildSimple: buildSimple,
    buildStage2: buildStage2,
    twoStage: twoStage,
    settings: settings,
    timeline: timeline,
    labelsOf: labelsOf,
    refLabel: refLabel,
    labelById: labelById
  };
})();

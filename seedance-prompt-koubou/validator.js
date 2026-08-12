/* ============================================================
   破綻チェッカー V1〜V16
   level: "error" | "warn" | "info"
   ============================================================ */
"use strict";

const Validator = (function () {

  function countHits(text, dict) {
    const t = (text || "").toLowerCase();
    let n = 0;
    const found = [];
    dict.forEach(w => {
      const k = String(w).toLowerCase();
      if (k && t.indexOf(k) !== -1) { n++; found.push(w); }
    });
    return { n: n, found: found };
  }

  function has(text, dict) {
    return countHits(text, dict).n > 0;
  }

  function run(s) {
    const out = [];
    const add = (id, level, msg, hint) => out.push({ id, level, msg, hint: hint || "" });

    const isEdit = s.mode === "edit";
    const withRefs = s.mode === "lv1" || s.mode === "lv2" || isEdit;

    /* --- V1 ビート合計 ≠ 総尺 --- */
    const total = s.beats.reduce((a, b) => a + (Number(b.sec) || 0), 0);
    if (s.beats.length === 0) {
      add("V1", "error", "ビートが1つもありません。", "「ビート表」で追加してください。");
    } else if (total !== Number(s.meta.duration)) {
      add("V1", "error",
        "ビートの合計が " + total + "秒。総尺 " + s.meta.duration + "秒 と一致していません。",
        "各ビートの秒数を調整するか「均等割り」を押してください。");
    }

    /* --- V2 1ビートにカメラの動きが複数 --- */
    s.beats.forEach((b, i) => {
      const hits = countHits(b.event, CAMERA_KEYWORDS);
      const inText = hits.n;
      const selected = b.move && b.move !== "locked-off" ? 1 : 0;
      if (inText + selected >= 2) {
        add("V2", "error",
          "ビート" + (i + 1) + "：カメラの動きが2つ以上あります（" +
          (selected ? "選択:" + b.move + " " : "") + hits.found.join("・") + "）。",
          "1つのビートに動きは1つだけ。分けるか、本文からカメラ表現を消してください。");
      }
    });

    /* --- V3 参照素材の役割が未記入 --- */
    if (withRefs) {
      s.refs.forEach(r => {
        if (!(r.uses || "").trim()) {
          add("V3", "error",
            Builder.refLabel(s.refs, r) + " の「使う属性」が空です。",
            "「顔立ちと髪型」「ジャケットの色と質感」のように、狭く書いてください。");
        }
      });
    }

    /* --- V4 「使わない属性」が未記入 --- */
    if (withRefs) {
      const master = isEdit ? s.refs.find(r => r.kind === "video") : null;
      s.refs.forEach(r => {
        if (master && r.id === master.id) return;   /* 編集マスターには不要 */
        if ((r.uses || "").trim() && !(r.notUses || "").trim()) {
          add("V4", "warn",
            Builder.refLabel(s.refs, r) + " の「使わない属性」が空です。",
            "背景や構図が意図せず映り込む最頻の原因です。「背景・構図」など書いておくと安全です。");
        }
      });
    }

    /* --- V5 人物と参照画像の1対1対応 --- */
    if (s.mode === "lv1" || s.mode === "lv2") {
      s.characters.forEach(c => {
        const bound = s.refs.some(r => r.kind === "image" && (r.boundTo || "").trim() === c.label);
        if (!bound) {
          add("V5", "error",
            c.label + " に紐づく参照画像がありません。",
            "参照マニフェストで、その人物の画像の「紐づけ先」を " + c.label + " にしてください。人物入れ替わりの原因です。");
        }
      });
    }

    /* --- V5 紐づけ先の人物が存在しない（削除・改名の取り残し） --- */
    if (withRefs) {
      const labels = s.characters.map(c => c.label);
      s.refs.forEach(r => {
        const b = (r.boundTo || "").trim();
        if (!b || b === "全体") return;
        if (labels.indexOf(b) === -1) {
          add("V5", "error",
            Builder.refLabel(s.refs, r) + " の紐づけ先「" + b + "」という人物がいません。",
            "登場人物を消したか名前を変えた可能性があります。紐づけ先を選び直してください。");
        }
      });
    }

    /* --- V6 同一物の複数画像にグループ未設定 --- */
    if (withRefs) {
      const byUses = {};
      s.refs.filter(r => r.kind === "image").forEach(r => {
        const key = (r.uses || "").trim();
        if (!key) return;
        (byUses[key] = byUses[key] || []).push(r);
      });
      Object.keys(byUses).forEach(k => {
        const list = byUses[k];
        if (list.length >= 2 && list.some(r => !(r.groupTag || "").trim())) {
          add("V6", "warn",
            "同じ役割「" + k + "」の画像が" + list.length + "枚あります。",
            "同じ物を別角度で撮ったものなら「同一物グループ」に名前を入れてください。物体の増殖を防げます。");
        }
      });
    }

    /* --- V7 登場人物が多すぎる --- */
    if (s.characters.length > LIMITS.people) {
      add("V7", "warn",
        "登場人物が " + s.characters.length + "人です（安定するのは " + LIMITS.people + "人まで）。",
        "人数が増えるほど顔の取り違えが起きます。分割して撮ることを検討してください。");
    }

    /* --- V8 セリフの言語が混在 --- */
    const langs = [...new Set((s.audio.dialogues || [])
      .filter(d => (d.text || "").trim()).map(d => d.lang))];
    if (langs.length > 1) {
      add("V8", "warn",
        "セリフの言語が混在しています（" + langs.join(" / ") + "）。",
        "1本の中では1言語に揃えるのが安全です。");
    }

    /* --- V9 曖昧語 --- */
    const allText = [
      s.meta.summary, s.opening, s.closing,
      ...s.beats.map(b => b.event)
    ].join("\n");
    VAGUE_WORDS.forEach(v => {
      if (allText.toLowerCase().indexOf(v.w.toLowerCase()) !== -1) {
        add("V9", "warn", "曖昧な表現「" + v.w + "」が入っています。", v.hint);
      }
    });

    /* --- V10 1ビートに動作を詰め込みすぎ --- */
    s.beats.forEach((b, i) => {
      const hits = countHits(b.event, ACTION_VERBS);
      if (hits.n >= 3) {
        add("V10", "warn",
          "ビート" + (i + 1) + "：動作が" + hits.n + "個入っています（" + hits.found.slice(0, 4).join("・") + "…）。",
          "1ビート＝連続した1つの主要動作。動作が飛ぶ原因なので分割してください。");
      }
      if ((b.event || "").length > 160) {
        add("V10", "warn",
          "ビート" + (i + 1) + "：本文が長すぎます（" + b.event.length + "字）。",
          "1ビートは目安60〜100字程度。長い場合はビートを分けてください。");
      }
    });

    /* --- V11 感情が抽象語だけ --- */
    if (has(allText, EMOTION_WORDS) && !has(allText, BODY_WORDS)) {
      add("V11", "info",
        "感情を抽象語だけで指定しています。",
        "目・眉・呼吸・肩・口元など、見える変化に置き換えると表情が安定します。");
    }

    /* --- V12 avoid が空 --- */
    if (!(s.guards.avoid || []).length) {
      add("V12", "info", "avoid（禁止事項）が空です。",
        "jitter / identity drift / bent limbs あたりは入れておくと事故が減ります。");
    }

    /* --- V13 分量 --- */
    const built = Builder.build(s, "mix");
    const len = built.length;
    const range = s.mode === "lv0" ? [60, 600]
      : s.mode === "lv1" ? [200, 1600]
      : s.mode === "edit" ? [80, 1200]
      : [400, 3500];
    if (len < range[0]) {
      add("V13", "info", "プロンプトが短めです（" + len + "字 / 目安 " + range[0] + "〜" + range[1] + "字）。",
        "尺を使い切れない可能性があります。");
    } else if (len > range[1]) {
      add("V13", "info", "プロンプトが長めです（" + len + "字 / 目安 " + range[0] + "〜" + range[1] + "字）。",
        "ショットに実質的に影響しない記述を削ってください。");
    }

    /* --- V14 素材数の上限 --- */
    const nImg = s.refs.filter(r => r.kind === "image").length;
    const nVid = s.refs.filter(r => r.kind === "video").length;
    const nAud = s.refs.filter(r => r.kind === "audio").length;
    if (nImg > LIMITS.images) add("V14", "error", "参照画像が上限超過（" + nImg + " / " + LIMITS.images + "）。");
    if (nVid > LIMITS.videos) add("V14", "error", "参照動画が上限超過（" + nVid + " / " + LIMITS.videos + "）。");
    if (nAud > LIMITS.audios) add("V14", "error", "参照音声が上限超過（" + nAud + " / " + LIMITS.audios + "）。");
    if (s.refs.length > LIMITS.total) add("V14", "error", "参照素材の合計が上限超過（" + s.refs.length + " / " + LIMITS.total + "）。");

    /* --- V15 編集モードの前提 --- */
    if (isEdit) {
      if (!s.refs.some(r => r.kind === "video")) {
        add("V15", "error", "編集モードなのに元動画（@Video）が登録されていません。",
          "参照マニフェストで種別「動画」を1つ追加してください。");
      }
      if (!(s.edit.keep || "").trim()) {
        add("V15", "warn", "Keep（変えない要素）が未記入です。",
          "「人物とカメラワーク」など維持するものを書かないと、全体が作り直されます。");
      }
      if (Number(s.meta.duration) > 20) {
        add("V15", "info", "編集は20秒以下がいちばん安定します。");
      }
    }

    /* --- V17 必須項目の未入力 --- */
    if (!isEdit && !(s.meta.summary || "").trim()) {
      add("V17", "error", "「この30秒でやりたいこと」が空です。",
        "ここが空だと、モデルが何の映像なのかを判断できません。");
    }
    s.beats.forEach((b, i) => {
      if (!(b.event || "").trim()) {
        add("V17", "error", "ビート" + (i + 1) + " の本文が空です。",
          isEdit ? "変更しない区間なら「変更なし」と書いてください。"
                 : "この区間で何が起きるかを書いてください。空のままだとモデルが勝手に埋めます。");
      }
    });

    /* --- V16 視覚アンカーが少ない --- */
    if (s.mode === "lv1" || s.mode === "lv2") {
      s.characters.forEach(c => {
        const n = [c.build, c.hair, c.face, c.wardrobe, c.props]
          .filter(v => (v || "").trim()).length;
        if (n < 3) {
          add("V16", "warn", c.label + " の視覚アンカーが " + n + "個しかありません。",
            "3〜5個埋めると同一人物として安定します（少なすぎても多すぎても崩れます）。");
        }
      });
    }

    return out;
  }

  return { run: run };
})();

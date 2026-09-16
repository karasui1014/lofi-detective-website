/* ============================================================
   Suno スタイルプロンプト辞典 — データ（01〜05）
   ============================================================

   ■ このファイルの原則
   englishPrompt は「そのまま使う英語表現」です。
   読みやすさや語感を理由に書き換えないでください。
   改善版を作る場合は englishPrompt を残したまま verifiedPrompt に入れます。

   ■ 情報源を混同しない
   このファイルは sourceType: "style-dictionary"（スタイル辞典）。
   楽器・奏法（instrument-techniques.js）は "v6-instrument-expression" で、
   Suno V6 が実際に出力した表現です。出どころが違うので必ず分けます。

   ■ 検証状態
   "reference" … 参考プロンプト。まだAI音楽部側で検証していない（初期値）
   "verified"  … 実際に生成して効果を確認したもの
   verified にするときは verifiedPrompt / verificationNote / testedModel を埋めます。

   ■ 重複登録しない
   1つの表現は1カテゴリーにだけ置き、他カテゴリーとの関係は tags で表します。
   例: brushed snare backbeat は rhythm-mood に置き、tags に drums / snare を持たせる。
   検索はカテゴリーをまたいで当たるので、二重登録は不要です。

   ■ カテゴリーの足し方
   STYLE_DICT_CATEGORIES に1行足すだけで画面に出ます（06〜09もここに追加）。
   UI側のコードは触らなくて構いません。
   ============================================================ */
"use strict";

const STYLE_DICT_CATEGORIES = [
  { id: "rhythm-mood",   no: "01", ja: "リズム・曲調", en: "Rhythm & Mood",        desc: "リズム・テンポ・感情・曲調" },
  { id: "drums",         no: "02", ja: "ドラム",       en: "Drums & Rhythm",       desc: "ドラム・ビート・グルーヴ" },
  { id: "melody",        no: "03", ja: "メロディ",     en: "Melody & Harmony",     desc: "メロディ・コード・ハーモニー" },
  { id: "bass-design",   no: "04", ja: "ベース・音響", en: "Bass & Sound Design",  desc: "ベース・低音・音響処理・質感" },
  { id: "vocals",        no: "05", ja: "ボーカル",     en: "Vocals & Effects",     desc: "ボーカル・ハーモニー・空間系エフェクト" }
];

/* 共通フィールド
   id / category / englishPrompt / japaneseName / meaning
   recommendations[] … 相性の良い組み合わせ・おすすめ用途
   cautions[]        … 注意事項
   tags[]            … 検索用（英語・日本語・ジャンル・楽器・効果・擬音・雰囲気）
   relatedPrompts[]  … 関連する表現の englishPrompt。登録済みならリンクになる
   sourceType        … "style-dictionary"
   verificationStatus… "reference" | "verified"
   verifiedPrompt / verificationNote / recommendedModifiers / testedModel / testedDate
                     … AI音楽部で検証したときだけ埋める（Premium表示） */
const STYLE_DICT_ENTRIES = [

  /* ══════════ 01 Rhythm & Mood ══════════ */
  {
    id: "128-bpm", category: "rhythm-mood",
    englishPrompt: "128 BPM",
    japaneseName: "128ビーピーエム",
    meaning: "テンポ128。ダンス／エレクトロポップらしい強い推進感が出る。",
    recommendations: ["bright major key と好相性", "sidechain pumping でさらに躍動感"],
    cautions: ["速すぎると疲れる印象になるので注意"],
    relatedPrompts: ["bright major key", "sidechain pumping"],
    tags: ["128","bpm","テンポ","ダンス","エレクトロポップ","アップテンポ","速い","推進感","dance","electropop"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "92-bpm", category: "rhythm-mood",
    englishPrompt: "92 BPM",
    japaneseName: "92ビーピーエム",
    meaning: "中低速のテンポ。Hip-Hop、Lo-Fi、落ち着いた曲に向く。",
    recommendations: ["half-time pocket と好相性", "ゆったりしたグルーヴに"],
    cautions: ["ダンス感を出したい場合は物足りない"],
    relatedPrompts: ["half-time pocket"],
    tags: ["92","bpm","テンポ","中速","遅め","ゆったり","落ち着いた","hip-hop","ヒップホップ","lo-fi","ローファイ"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "anthemic-urgency", category: "rhythm-mood",
    englishPrompt: "anthemic urgency",
    japaneseName: "アンセミック・アージェンシー",
    meaning: "アンセムのような高揚感と「今すぐ進め」という切迫感を生む。",
    recommendations: ["propulsive breakbeat と好相性", "tension release でさらに効果的"],
    cautions: ["感情が強く出るのでバラードには不向き"],
    relatedPrompts: ["propulsive breakbeat", "tension release"],
    tags: ["高揚","切迫","アンセム","盛り上がる","疾走","エモい","anthem","urgent","ムード"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "bittersweet-longing", category: "rhythm-mood",
    englishPrompt: "bittersweet longing",
    japaneseName: "ビタースイート・ロンギング",
    meaning: "明るさの中に残る切ない憧れ・恋しさ。ポップなのにエモい雰囲気を作る。",
    recommendations: ["bright major key と好相性", "J-POP、バラード、エモ系におすすめ"],
    cautions: ["切なさが強すぎると暗い印象になるのでバランスに注意"],
    relatedPrompts: ["bright major key"],
    tags: ["切ない","せつない","明るい","エモい","憧れ","恋しい","ほろ苦い","j-pop","バラード","ムード"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "bright-major-key", category: "rhythm-mood",
    englishPrompt: "bright major key",
    japaneseName: "ブライト・メジャーキー",
    meaning: "明るく開放的な長調。ポジティブで爽やかな雰囲気を作る。",
    recommendations: ["bittersweet longing と組み合わせると「明るいのに切ない」表現が可能", "J-POP、ポップスに最適"],
    cautions: ["使いすぎると単調になりやすい"],
    relatedPrompts: ["bittersweet longing"],
    tags: ["明るい","長調","メジャー","ポジティブ","爽やか","開放的","キー","調","j-pop"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "brushed-snare-backbeat", category: "rhythm-mood",
    englishPrompt: "brushed snare backbeat",
    japaneseName: "ブラッシュド・スネア・バックビート",
    meaning: "ブラシ系スネアによる柔らかく繊細なバックビート。落ち着いたグルーヴを作る。",
    recommendations: ["Rhodes chords と好相性", "Jazz、Soul、AOR系におすすめ"],
    cautions: ["激しい曲やAGGRESSIVEな楽曲にはやや弱め"],
    relatedPrompts: ["Rhodes chords"],
    tags: ["drums","snare","groove","ドラム","スネア","ブラシ","バックビート","柔らかい","繊細","jazz","soul","aor"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },

  /* ══════════ 02 Drums & Rhythm ══════════ */
  {
    id: "chopped-breakbeat-drums", category: "drums",
    englishPrompt: "chopped breakbeat drums",
    japaneseName: "チョップド・ブレイクビート・ドラムス",
    meaning: "ブレイクビーツを細かく切り刻んだ、複雑で実験的なリズム。",
    recommendations: ["programmed breakbeats と好相性", "エレクトロ、Hip-Hopにおすすめ"],
    cautions: ["リズムが複雑になりすぎる場合あり"],
    relatedPrompts: ["programmed breakbeats"],
    tags: ["ドラム","ブレイクビーツ","切り刻む","複雑","実験的","エレクトロ","hip-hop","breakbeat"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "gated-snare-plate", category: "drums",
    englishPrompt: "gated snare plate",
    japaneseName: "ゲーテッド・スネア・プレート",
    meaning: "プレートリバーブをかけたスネアの残響を途中でカット。80年代的な迫力あるサウンド。",
    recommendations: ["ポップ、ロック、エレクトロに最適", "ドラムのインパクトを強くしたい時に"],
    cautions: ["かけすぎると不自然になるので注意"],
    relatedPrompts: [],
    tags: ["スネア","ドラム","80年代","80s","ゲートリバーブ","リバーブ","迫力","レトロ","インパクト","gated","plate"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "sampled-handclaps", category: "drums",
    englishPrompt: "sampled handclaps",
    japaneseName: "サンプルド・ハンドクラップス",
    meaning: "サンプリングされたハンドクラップ（手拍子）。曲にノリと一体感を加える。",
    recommendations: ["ダンス、ポップ、ファンクにおすすめ", "スネアと重ねて使うと効果的"],
    cautions: ["音量バランスに注意"],
    relatedPrompts: [],
    tags: ["手拍子","ハンドクラップ","クラップ","パンパン","ノリ","一体感","ダンス","ファンク","clap"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "layered-tom-fills", category: "drums",
    englishPrompt: "layered tom fills",
    japaneseName: "レイヤード・タム・フィルズ",
    meaning: "複数のタムを重ねた迫力あるフィルイン。曲の盛り上がりを演出。",
    recommendations: ["wide drum room と好相性", "サビ前や展開部分に効果的"],
    cautions: ["多用するとくどくなるので注意"],
    relatedPrompts: ["wide drum room"],
    tags: ["タム","フィル","ドラム","ドコドコ","盛り上がり","サビ前","展開","tom","fill"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "syncopated-four-on-the-floor", category: "drums",
    englishPrompt: "syncopated four-on-the-floor",
    japaneseName: "シンコペイテッド・フォー・オン・ザ・フロア",
    meaning: "基本の四つ打ちに裏拍などのアクセントを加えた、躍動感のあるリズム。",
    recommendations: ["ダンス、エレクトロポップに最適", "sidechain pumping とも相性が良い", "シンプルすぎる四つ打ちを避けたい時におすすめ"],
    cautions: [],
    relatedPrompts: ["sidechain pumping"],
    tags: ["四つ打ち","ドンドン","ダンス","躍動","裏拍","シンコペーション","エレクトロポップ","four-on-the-floor"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "syncopated-hi-hat-clicks", category: "drums",
    englishPrompt: "syncopated hi-hat clicks",
    japaneseName: "シンコペイテッド・ハイハット・クリックス",
    meaning: "ハイハットを裏拍などに細かく配置し、グルーヴに動きを与える。",
    recommendations: ["Hip-Hop、R&B、エレクトロに最適", "swung 16th hats と組み合わせるとより人間的なノリに"],
    cautions: ["細かすぎるとメロディの邪魔になる場合あり"],
    relatedPrompts: ["swung 16th hats"],
    tags: ["ハイハット","チキチキ","裏拍","グルーヴ","細かい","hip-hop","r&b","hi-hat"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },

  /* ══════════ 03 Melody & Harmony ══════════ */
  {
    id: "fm-bell-arpeggios", category: "melody",
    englishPrompt: "FM bell arpeggios",
    japaneseName: "エフエム・ベル・アルペジオ",
    meaning: "FM音源のような透明感のあるベルのアルペジオ。キラキラした未来的な雰囲気を作る。",
    recommendations: ["Japanese electro-pop と好相性", "コード進行の上に乗せて輝きを追加"],
    cautions: ["高域が強くなりやすいので使いすぎに注意"],
    relatedPrompts: ["Japanese electro-pop"],
    tags: ["キラキラ","きらきら","ベル","アルペジオ","透明感","未来的","輝き","高音","シンセ","fm"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "glockenspiel-counterline", category: "melody",
    englishPrompt: "glockenspiel counterline",
    japaneseName: "グロッケンシュピール・カウンターライン",
    meaning: "グロッケンが主旋律とは別の対旋律を奏で、華やかさと可憐さを加える。",
    recommendations: ["bright major key と好相性", "J-POP、ポップスに最適"],
    cautions: ["FM bellと重ねると高域が強くなるので注意"],
    relatedPrompts: ["bright major key", "FM bell arpeggios"],
    tags: ["キラキラ","きらきら","グロッケン","鉄琴","対旋律","華やか","可憐","j-pop","glockenspiel"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "chorus-guitar-stabs", category: "melody",
    englishPrompt: "chorus guitar stabs",
    japaneseName: "コーラス・ギター・スタブス",
    meaning: "コーラスエフェクトをかけたギターの短いカッティング。曲に広がりとアクセントを与える。",
    recommendations: ["stereo chorus guitar と相性が良い", "エレクトロポップ、ロックにおすすめ", "曲の隙間に入れると効果的"],
    cautions: [],
    relatedPrompts: ["stereo chorus guitar"],
    tags: ["ギター","カッティング","ジャキ","コーラス","広がり","アクセント","エレクトロポップ","ロック","guitar"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "rhodes-chords", category: "melody",
    englishPrompt: "Rhodes chords",
    japaneseName: "ローズ・コード",
    meaning: "エレクトリックピアノ（Rhodes）による暖かく柔らかなコード。都会的で大人な雰囲気を作る。",
    recommendations: ["Jazz、Soul、Lo-Fiと好相性", "muted bass clarinetとの組み合わせ◎", "他のシンセと重ねると厚みが増す"],
    cautions: [],
    relatedPrompts: ["muted bass clarinet"],
    tags: ["keyboard","electric-piano","rhodes","エレピ","ローズ","鍵盤","コード","温かい","暖かい","都会的","大人","jazz","soul","lo-fi","ローファイ","j-pop","シティポップ"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "layered-choir-pads", category: "melody",
    englishPrompt: "layered choir pads",
    japaneseName: "レイヤード・クワイア・パッド",
    meaning: "複数のコーラスを重ねたパッドサウンド。壮大さ、神秘的な雰囲気、感動的な広がりを演出。",
    recommendations: ["anthemic urgency と好相性", "サビやブリッジで効果的"],
    cautions: ["ボーカルと周波数が競合しやすいため音量バランスに注意"],
    relatedPrompts: ["anthemic urgency"],
    tags: ["コーラス","合唱","パッド","ワー","壮大","神秘的","広がり","choir","pad"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "vocoder-choir", category: "melody",
    englishPrompt: "vocoder choir",
    japaneseName: "ボコーダー・クワイア",
    meaning: "ボコーダーで加工したコーラス。人声とシンセの中間のような未来的で幻想的なサウンド。",
    recommendations: ["エレクトロ、シンセウェーブに最適", "サビの盛り上げや空間演出に効果的"],
    cautions: ["使いすぎると機械的に聞こえるので注意"],
    relatedPrompts: [],
    tags: ["ボコーダー","コーラス","ロボット","未来的","幻想的","シンセウェーブ","エレクトロ","vocoder"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },

  /* ══════════ 04 Bass & Sound Design ══════════ */
  {
    id: "punchy-synth-bass", category: "bass-design",
    englishPrompt: "punchy synth bass",
    japaneseName: "パンチー・シンセベース",
    meaning: "アタックの強いシンセベース。力強く現代的で、ダンス感のある低音を作る。",
    recommendations: ["エレクトロ、ポップ、ダンスに最適", "sidechain pumping と好相性"],
    cautions: ["低域が強すぎると他の音が埋もれるので注意"],
    relatedPrompts: ["sidechain pumping"],
    tags: ["ベース","シンセベース","低音","ブンブン","パンチ","力強い","ダンス","エレクトロ","bass"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "sub-bass-glides", category: "bass-design",
    englishPrompt: "sub-bass glides",
    japaneseName: "サブベース・グライド",
    meaning: "超低域のベースが滑らかに上下する。重厚で未来的なサウンドを作る。",
    recommendations: ["Trap、Hip-Hop、AGGRESSIVEに最適", "808系ドラムと好相性"],
    cautions: ["スマホや小型スピーカーでは聞こえにくいため過剰にしすぎない"],
    relatedPrompts: [],
    tags: ["ベース","サブベース","超低域","ウネウネ","重厚","未来的","trap","hip-hop","808","グライド"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "sub-drop-accents", category: "bass-design",
    englishPrompt: "sub drop accents",
    japaneseName: "サブ・ドロップ・アクセント",
    meaning: "場面転換やサビ前に入る「ズゥーン」という超低域の下降音。",
    recommendations: ["ダンス、EDM、映像向けに効果的", "tension release と組み合わせる"],
    cautions: ["多用すると映画予告編のようになるので注意"],
    relatedPrompts: ["tension release"],
    tags: ["ズゥーン","ずぅーん","ドロップ","超低域","下降","場面転換","サビ前","edm","ダンス"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "tape-saturation", category: "bass-design",
    englishPrompt: "tape saturation",
    japaneseName: "テープ・サチュレーション",
    meaning: "アナログテープのような自然な歪みと温かさを加え、全体を馴染ませる。",
    recommendations: ["どんなジャンルにも使える", "digitalな冷たさを和らげる"],
    cautions: ["かけすぎると音がこもるので注意"],
    relatedPrompts: [],
    tags: ["テープ","サチュレーション","温かい","暖かい","歪み","アナログ","馴染む","質感","saturation"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "soft-tape-saturation", category: "bass-design",
    englishPrompt: "soft tape saturation",
    japaneseName: "ソフト・テープ・サチュレーション",
    meaning: "軽めのテープサチュレーション。自然で控えめな温かさと優しい質感を加える。",
    recommendations: ["ポップス、バラード、Lo-Fiに最適", "ボーカルやアコースティック楽器と好相性", "通常のtape saturationより自然"],
    cautions: [],
    relatedPrompts: ["tape saturation"],
    tags: ["テープ","サチュレーション","温かい","暖かい","優しい","控えめ","質感","lo-fi","ローファイ","バラード"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "vinyl-dust-texture", category: "bass-design",
    englishPrompt: "vinyl dust texture",
    japaneseName: "ヴァイナル・ダスト・テクスチャー",
    meaning: "レコードのチリ・パチという針ノイズの質感を加え、レトロでノスタルジックな雰囲気を作る。",
    recommendations: ["Lo-Fi、レトロ、シティポップに最適", "Rhodes chordsやJazz系と好相性"],
    cautions: ["かけすぎると楽曲のクリアさが失われる"],
    relatedPrompts: ["Rhodes chords"],
    tags: ["パチパチ","ぱちぱち","チリチリ","レコード","ノイズ","針","レトロ","ノスタルジック","質感","lo-fi","ローファイ","シティポップ","vinyl"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },

  /* ══════════ 05 Vocals & Effects ══════════ */
  {
    id: "female-vocals-breathy", category: "vocals",
    englishPrompt: "female vocals (breathy)",
    japaneseName: "フィメール・ボーカル（ブリージー）",
    meaning: "息を多く含んだ、やわらかく繊細な女性ボーカル。透明感・親しみやすさ・エモい雰囲気を作る。",
    recommendations: ["J-POP、シティポップ、バラードに最適", "reverb と組み合わせるとさらに幻想的"],
    cautions: ["強すぎるエフェクトで埋もれないよう注意"],
    relatedPrompts: ["reverb (large hall)"],
    tags: ["女性","ボーカル","息っぽい","息","ウィスパー","透明感","繊細","エモい","j-pop","シティポップ","female","breathy"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "male-vocals-warm", category: "vocals",
    englishPrompt: "male vocals (warm)",
    japaneseName: "メール・ボーカル（ウォーム）",
    meaning: "温かく落ち着いた男性ボーカル。安心感・誠実さ・力強さを演出できる。",
    recommendations: ["ポップ、ロック、バラードに最適", "acoustic guitar や piano と好相性", "硬くなりすぎる場合はsoftを併記すると自然"],
    cautions: [],
    relatedPrompts: [],
    tags: ["男性","ボーカル","温かい","暖かい","落ち着いた","安心感","誠実","力強い","male","warm"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "vocal-harmonies", category: "vocals",
    englishPrompt: "vocal harmonies",
    japaneseName: "ボーカル・ハーモニー",
    meaning: "メインボーカルにハーモニーを重ね、厚みと広がりを加える。",
    recommendations: ["pop、ballad、R&Bに最適", "anthemic と組み合わせると効果的"],
    cautions: ["強すぎると主旋律が埋もれるので注意"],
    relatedPrompts: ["anthemic urgency"],
    tags: ["ハモリ","ハーモニー","コーラス","厚み","広がり","バラード","r&b","harmony"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "reverb-large-hall", category: "vocals",
    englishPrompt: "reverb (large hall)",
    japaneseName: "リバーブ（ラージホール）",
    meaning: "大きなホールのような残響。空間の広がりと壮大さを演出する。",
    recommendations: ["バラード、アンビエント、シネマティックに最適", "vocal harmoniesやpianoと好相性"],
    cautions: ["かけすぎるとぼやけるので注意"],
    relatedPrompts: ["vocal harmonies"],
    tags: ["リバーブ","残響","ホール","ワーン","空間","広がり","壮大","エフェクト","reverb"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "delay-echo", category: "vocals",
    englishPrompt: "delay (echo)",
    japaneseName: "ディレイ（エコー）",
    meaning: "やまびこのような反復音。リズムに奥行きと動きを加え、幻想的・未来的な印象を作る。",
    recommendations: ["エレクトロ、ポップ、シティポップに最適", "vocal、guitar、synthと好相性"],
    cautions: ["テンポに合わせた設定が重要"],
    relatedPrompts: [],
    tags: ["ディレイ","エコー","やまびこ","反復","奥行き","幻想的","未来的","エフェクト","delay","echo"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  },
  {
    id: "vocal-chops", category: "vocals",
    englishPrompt: "vocal chops",
    japaneseName: "ボーカル・チョップ",
    meaning: "ボーカルを細かくカットし、リズム楽器のように使用する手法。",
    recommendations: ["EDM、ダンス、ポップに最適", "catchyなフレーズ作りに効果的"],
    cautions: ["元のボーカルのキーやテンポに合わせると自然"],
    relatedPrompts: [],
    tags: ["ボーカル","チョップ","刻む","カット","キャッチー","edm","ダンス","chops"],
    sourceType: "style-dictionary", verificationStatus: "reference",
    verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
  }
];

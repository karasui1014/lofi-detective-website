/* ============================================================
   楽器・奏法プロンプト研究所 — データ
   ============================================================

   ■ このファイルの原則（重要）

   originalPrompt は「Suno V6がその奏法・演奏表現を表すために
   使用した英語表現」そのものです。
   読みやすさのために言い換えたり、短くしたり、単語を足したりしては
   いけません。ここを書き換えると、この機能の存在意義（Sunoが実際に
   どう言語化しているかを見る）が失われます。

   一方、次のフィールドは UI 表示のために後から足した説明です。
   元データではありません。自由に直して構いません。
     - technique / techniqueJa … 表現に付けた見出し
     - meaning                  … 奏法の説明
     - soundDescription         … どんな音になるか
     - tags                     … 擬音などの検索用タグ

   ■ 情報源を混同しない
   このファイルは sourceType: "v6-instrument-expression"。
   Suno V6 が実際に出力した表現です。
   スタイル辞典（style-dictionary.js / sourceType: "style-dictionary"）とは
   出どころが違うので、同じ棚に混ぜないでください。

   ■ 検証について
   初期状態はすべて verificationStatus: "unverified" です。
   実際にSunoで生成して効果を確認できたものだけ "verified" に変え、
   verifiedPrompt / verificationNote / testedModel などを埋めてください。
   originalPrompt と verifiedPrompt は別物として扱います
   （同じ意味に見えても、片方を消して片方に寄せないこと）。

   ■ 追加のしかた
   1. TECHNIQUE_INSTRUMENTS に楽器が無ければ足す（id はユニークに）
   2. TECHNIQUE_ENTRIES に instrumentId を指定して1件ずつ足す
   コード側は触らなくて構いません。
   ============================================================ */
"use strict";

/* ---------- カテゴリー ---------- */
const TECHNIQUE_CATEGORIES = [
  { id: "keyboard",   ja: "鍵盤",         en: "Keyboard" },
  { id: "guitar",     ja: "ギター・撥弦", en: "Guitar / Plucked Strings" },
  { id: "bowed",      ja: "擦弦",         en: "Bowed Strings" },
  { id: "bass",       ja: "ベース",       en: "Bass" },
  { id: "brass",      ja: "金管",         en: "Brass" },
  { id: "woodwind",   ja: "木管",         en: "Woodwind" },
  { id: "drums",      ja: "ドラム",       en: "Drums" },
  { id: "percussion", ja: "打楽器",       en: "Percussion" },
  { id: "mallet",     ja: "鍵盤打楽器",   en: "Mallet" },
  { id: "world",      ja: "民族・伝統",   en: "Traditional / World" },
  { id: "synth",      ja: "シンセ・電子", en: "Synth / Electronic" },
  { id: "ensemble",   ja: "アンサンブル", en: "Ensemble" },
  { id: "other",      ja: "その他",       en: "Other" }
];

/* ---------- 楽器 ----------
   instrument   : 元データの楽器名（変更しない）
   instrumentJa : UI表示用の日本語名（追加分）
   category     : TECHNIQUE_CATEGORIES の id */
const TECHNIQUE_INSTRUMENTS = [
  /* 鍵盤 */
  { id:"piano",        instrument:"Grand Piano / Piano",        instrumentJa:"ピアノ / グランドピアノ", category:"keyboard" },
  { id:"epiano",       instrument:"Electric Piano / Rhodes",    instrumentJa:"エレクトリックピアノ / ローズ", category:"keyboard" },
  { id:"feltpiano",    instrument:"Felt Piano / Upright Piano", instrumentJa:"フェルトピアノ / アップライトピアノ", category:"keyboard" },
  { id:"preparedpiano",instrument:"Prepared Piano",             instrumentJa:"プリペアドピアノ", category:"keyboard" },
  { id:"organ",        instrument:"Organ",                      instrumentJa:"オルガン", category:"keyboard" },
  { id:"pipeorgan",    instrument:"Pipe Organ",                 instrumentJa:"パイプオルガン", category:"keyboard" },
  { id:"harpsichord",  instrument:"Harpsichord",                instrumentJa:"チェンバロ", category:"keyboard" },
  { id:"celesta",      instrument:"Celesta",                    instrumentJa:"チェレスタ", category:"keyboard" },
  { id:"accordion",    instrument:"Accordion",                  instrumentJa:"アコーディオン", category:"keyboard" },
  { id:"bandoneon",    instrument:"Bandoneon",                  instrumentJa:"バンドネオン", category:"keyboard" },
  { id:"harmonium",    instrument:"Harmonium",                  instrumentJa:"ハルモニウム", category:"keyboard" },

  /* ギター・撥弦 */
  { id:"aguitar",      instrument:"Acoustic Guitar",            instrumentJa:"アコースティックギター", category:"guitar" },
  { id:"eguitar",      instrument:"Electric Guitar",            instrumentJa:"エレキギター", category:"guitar" },
  { id:"classguitar",  instrument:"Classical Guitar / Nylon-string Guitar", instrumentJa:"クラシックギター / ナイロン弦ギター", category:"guitar" },
  { id:"slideguitar",  instrument:"Slide Guitar",               instrumentJa:"スライドギター", category:"guitar" },
  { id:"harp",         instrument:"Harp",                       instrumentJa:"ハープ", category:"guitar" },
  { id:"mandolin",     instrument:"Mandolin",                   instrumentJa:"マンドリン", category:"guitar" },
  { id:"lute",         instrument:"Lute / Lute-like Strings",   instrumentJa:"リュート / リュート系弦楽器", category:"guitar" },

  /* 擦弦 */
  { id:"violin",       instrument:"Violin",                     instrumentJa:"バイオリン", category:"bowed" },
  { id:"viola",        instrument:"Viola",                      instrumentJa:"ヴィオラ", category:"bowed" },
  { id:"cello",        instrument:"Cello",                      instrumentJa:"チェロ", category:"bowed" },
  { id:"ecello",       instrument:"Electric Cello",             instrumentJa:"エレクトリックチェロ", category:"bowed" },
  { id:"fiddle",       instrument:"Fiddle",                     instrumentJa:"フィドル", category:"bowed" },

  /* ベース */
  { id:"ebass",        instrument:"Electric Bass",              instrumentJa:"エレキベース", category:"bass" },
  { id:"upright",      instrument:"Double Bass / Upright Bass", instrumentJa:"コントラバス / ウッドベース", category:"bass" },
  { id:"bassunspec",   instrument:"Bass / Acoustic Bass — Unspecified", instrumentJa:"ベース / アコースティックベース（種類指定なし）", category:"bass" },

  /* 金管 */
  { id:"trumpet",      instrument:"Trumpet",                    instrumentJa:"トランペット", category:"brass" },
  { id:"piccolotrumpet",instrument:"Piccolo Trumpet",           instrumentJa:"ピッコロトランペット", category:"brass" },
  { id:"trombone",     instrument:"Trombone",                   instrumentJa:"トロンボーン", category:"brass" },
  { id:"frenchhorn",   instrument:"French Horn",                instrumentJa:"ホルン", category:"brass" },
  { id:"tuba",         instrument:"Tuba",                       instrumentJa:"チューバ", category:"brass" },

  /* 木管 */
  { id:"flute",        instrument:"Flute",                      instrumentJa:"フルート", category:"woodwind" },
  { id:"bassflute",    instrument:"Bass Flute",                 instrumentJa:"バスフルート", category:"woodwind" },
  { id:"clarinet",     instrument:"Clarinet",                   instrumentJa:"クラリネット", category:"woodwind" },
  { id:"bassclarinet", instrument:"Bass Clarinet",              instrumentJa:"バスクラリネット", category:"woodwind" },
  { id:"oboe",         instrument:"Oboe",                       instrumentJa:"オーボエ", category:"woodwind" },
  { id:"bassoon",      instrument:"Bassoon",                    instrumentJa:"ファゴット", category:"woodwind" },

  /* ドラム */
  { id:"drumkit",      instrument:"Drum Kit",                   instrumentJa:"ドラムキット", category:"drums" },
  { id:"snare",        instrument:"Snare Drum",                 instrumentJa:"スネアドラム", category:"drums" },
  { id:"orchsnare",    instrument:"Orchestral Snare Drum",      instrumentJa:"オーケストラ用スネア", category:"drums" },
  { id:"kick",         instrument:"Kick / Bass Drum",           instrumentJa:"キック / バスドラム", category:"drums" },
  { id:"hihat",        instrument:"Hi-hat",                     instrumentJa:"ハイハット", category:"drums" },
  { id:"toms",         instrument:"Toms / Floor Toms",          instrumentJa:"タム / フロアタム", category:"drums" },

  /* 打楽器 */
  { id:"cymbals",      instrument:"Cymbals",                    instrumentJa:"シンバル", category:"percussion" },
  { id:"clashcymbals", instrument:"Clash Cymbals",              instrumentJa:"合わせシンバル", category:"percussion" },
  { id:"suscymbal",    instrument:"Suspended Cymbal",           instrumentJa:"サスペンデッドシンバル", category:"percussion" },
  { id:"tambourine",   instrument:"Tambourine",                 instrumentJa:"タンバリン", category:"percussion" },
  { id:"timpani",      instrument:"Timpani",                    instrumentJa:"ティンパニ", category:"percussion" },
  { id:"gong",         instrument:"Gong",                       instrumentJa:"ゴング / 銅鑼", category:"percussion" },
  { id:"bells",        instrument:"Bells / Handbells / Chimes", instrumentJa:"ベル / ハンドベル / チャイム", category:"percussion" },
  { id:"shakers",      instrument:"Shakers / Guasá / Seed Shakers", instrumentJa:"シェイカー / グアサ / 種シェイカー", category:"percussion" },
  { id:"woodblock",    instrument:"Woodblock / Wooden Percussion", instrumentJa:"ウッドブロック / 木製打楽器", category:"percussion" },
  { id:"framedrum",    instrument:"Frame Drum",                 instrumentJa:"フレームドラム", category:"percussion" },
  { id:"handdrums",    instrument:"Hand Drums",                 instrumentJa:"ハンドドラム", category:"percussion" },
  { id:"barreldrum",   instrument:"Barrel Drum / Double-headed Drum", instrumentJa:"樽型ドラム / 両面太鼓", category:"percussion" },
  { id:"slitdrum",     instrument:"Slit Drum / Wooden Drum",    instrumentJa:"スリットドラム / 木製ドラム", category:"percussion" },
  { id:"rattles",      instrument:"Rattles / Ankle Rattles / Ankle Bells", instrumentJa:"ラトル / 足鈴", category:"percussion" },
  { id:"metalperc",    instrument:"Metal Percussion / Anvil",   instrumentJa:"金属打楽器 / アンヴィル", category:"percussion" },
  { id:"bodyperc",     instrument:"Body Percussion",            instrumentJa:"ボディパーカッション", category:"percussion" },

  /* 鍵盤打楽器 */
  { id:"xylophone",    instrument:"Xylophone",                  instrumentJa:"シロフォン（木琴）", category:"mallet" },
  { id:"marimba",      instrument:"Marimba",                    instrumentJa:"マリンバ", category:"mallet" },
  { id:"vibraphone",   instrument:"Vibraphone",                 instrumentJa:"ヴィブラフォン", category:"mallet" },
  { id:"glockenspiel", instrument:"Glockenspiel",               instrumentJa:"グロッケンシュピール（鉄琴）", category:"mallet" },
  { id:"malletunspec", instrument:"Mallet Instruments — Unspecified", instrumentJa:"鍵盤打楽器（種類指定なし）", category:"mallet" },

  /* 民族・伝統 */
  { id:"taiko",        instrument:"Taiko / Taiko-like Low Drums", instrumentJa:"和太鼓 / 低音太鼓", category:"world" },
  { id:"shamisen",     instrument:"Shamisen",                   instrumentJa:"三味線", category:"world" },
  { id:"koto",         instrument:"Koto",                       instrumentJa:"琴", category:"world" },
  { id:"shakuhachi",   instrument:"Shakuhachi",                 instrumentJa:"尺八", category:"world" },
  { id:"shinobue",     instrument:"Shinobue",                   instrumentJa:"篠笛", category:"world" },
  { id:"mokugyo",      instrument:"Mokugyo",                    instrumentJa:"木魚", category:"world" },
  { id:"kalimba",      instrument:"Kalimba",                    instrumentJa:"カリンバ", category:"world" },
  { id:"djembe",       instrument:"Djembe",                     instrumentJa:"ジャンベ", category:"world" },
  { id:"pipa",         instrument:"Pipa",                       instrumentJa:"琵琶（ピパ）", category:"world" },
  { id:"oud",          instrument:"Oud",                        instrumentJa:"ウード", category:"world" },
  { id:"jawharp",      instrument:"Jaw Harp",                   instrumentJa:"口琴", category:"world" },
  { id:"ptguitar",     instrument:"Portuguese Guitar",          instrumentJa:"ポルトガルギター", category:"world" },
  { id:"cavaquinho",   instrument:"Cavaquinho",                 instrumentJa:"カヴァキーニョ", category:"world" },
  { id:"zither",       instrument:"Zither / Kannel-like Zither", instrumentJa:"ツィター / カンネル系ツィター", category:"world" },
  { id:"angklung",     instrument:"Angklung",                   instrumentJa:"アンクルン", category:"world" },
  { id:"xiao",         instrument:"Xiao / Bamboo Flute",        instrumentJa:"簫 / 竹笛", category:"world" },
  { id:"ney",          instrument:"Ney",                        instrumentJa:"ネイ", category:"world" },
  { id:"tanpura",      instrument:"Tanpura",                    instrumentJa:"タンプーラ", category:"world" },
  { id:"sarangi",      instrument:"Sarangi",                    instrumentJa:"サーランギー", category:"world" },
  { id:"kamancheh",    instrument:"Kamancheh / Kamancha",       instrumentJa:"カマンチェ", category:"world" },
  { id:"setar",        instrument:"Setar",                      instrumentJa:"セタール", category:"world" },
  { id:"tar",          instrument:"Tar",                        instrumentJa:"タール", category:"world" },
  { id:"daf",          instrument:"Daf",                        instrumentJa:"ダフ", category:"world" },
  { id:"tombak",       instrument:"Tombak",                     instrumentJa:"トンバク", category:"world" },
  { id:"dholak",       instrument:"Dholak",                     instrumentJa:"ドーラク", category:"world" },
  { id:"kendang",      instrument:"Kendang",                    instrumentJa:"クンダン", category:"world" },
  { id:"vihuela",      instrument:"Vihuela",                    instrumentJa:"ビウエラ", category:"world" },
  { id:"golpe",        instrument:"Guitarra de Golpe",          instrumentJa:"ギターラ・デ・ゴルペ", category:"world" },
  { id:"guembri",      instrument:"Guembri / Gimbri",           instrumentJa:"ゲンブリ", category:"world" },
  { id:"suling",       instrument:"Suling",                     instrumentJa:"スリン", category:"world" },
  { id:"algoza",       instrument:"Algoza",                     instrumentJa:"アルゴーザ", category:"world" },
  { id:"been",         instrument:"Been / Pungi-like Reed",     instrumentJa:"ビーン / プーンギ系リード", category:"world" },
  { id:"rubab",        instrument:"Rubab-like Strings",         instrumentJa:"ルバーブ系弦楽器", category:"world" },
  { id:"khanjari",     instrument:"Khanjari",                   instrumentJa:"カンジーラ", category:"world" },
  { id:"bombo",        instrument:"Bombo",                      instrumentJa:"ボンボ", category:"world" },
  { id:"cununo",       instrument:"Cununo",                     instrumentJa:"ククーノ", category:"world" },
  { id:"tbel",         instrument:"Tbel / Tbal",                instrumentJa:"トベル", category:"world" },
  { id:"qraqeb",       instrument:"Qraqeb",                     instrumentJa:"カルカベ", category:"world" },
  { id:"kartal",       instrument:"Kartal / Khartal",           instrumentJa:"カルタール", category:"world" },
  { id:"paiban",       instrument:"Paiban / Wooden Clappers / Bamboo Clappers", instrumentJa:"拍板 / 木製・竹製クラッパー", category:"world" },
  { id:"calung",       instrument:"Calung",                     instrumentJa:"チャルン", category:"world" },
  { id:"tidnit",       instrument:"Tidnit",                     instrumentJa:"ティドニット", category:"world" },
  { id:"ardin",        instrument:"Ardin",                      instrumentJa:"アルディン", category:"world" },
  { id:"mouthbow",     instrument:"Mouth Bow",                  instrumentJa:"マウスボウ（口弓）", category:"world" },
  { id:"monochord",    instrument:"Bowed Monochord",            instrumentJa:"擦弦モノコード", category:"world" },
  { id:"gourdlute",    instrument:"Gourd-bodied Lute",          instrumentJa:"瓢箪胴のリュート", category:"world" },
  { id:"gourdbowed",   instrument:"Gourd-bodied Bowed String Instrument", instrumentJa:"瓢箪胴の擦弦楽器", category:"world" },

  /* シンセ・電子 */
  { id:"synth",        instrument:"Synthesizer / Synth Bass",   instrumentJa:"シンセサイザー / シンセベース", category:"synth" },
  { id:"edrums",       instrument:"Electronic Drums / Drum Machine", instrumentJa:"エレクトロニックドラム / ドラムマシン", category:"synth" },

  /* アンサンブル */
  { id:"strensemble",  instrument:"String Ensemble",            instrumentJa:"ストリングスアンサンブル", category:"ensemble" },
  { id:"brassensemble",instrument:"Brass Ensemble",             instrumentJa:"ブラスアンサンブル", category:"ensemble" },
  { id:"windensemble", instrument:"Woodwinds / Reed Ensemble",  instrumentJa:"木管 / リードアンサンブル", category:"ensemble" },

  /* その他 */
  { id:"bowedglass",   instrument:"Bowed Glass / Bowed Bamboo", instrumentJa:"擦奏グラス / 擦奏竹", category:"other" }
];

/* ---------- 奏法・演奏表現 ----------

   ⚠️ originalPrompt は Suno V6 が使用した英語表現そのもの。書き換え禁止。

   現在ここに入っているのは、実際に元データとして受け取れた分だけです。
   残りの楽器は元データが未着のため、あえて空にしてあります
   （推測で英語表現を作ると、この機能の意味が無くなるため）。
   元データが届いたら、同じ形式で下に足していってください。 */
const TECHNIQUE_ENTRIES = [
  {
    id: "trombone-glissando",
    category: "instrument-technique",
    instrumentId: "trombone",
    technique: "Glissando",
    techniqueJa: "グリッサンド",
    originalPrompt: "breath-supported glissando between two neighboring pitches",
    meaning:"息を支えたまま、隣り合う2つの音程をスライドで滑らかにつなぐ奏法。",
    soundDescription:"「うにょ〜」と音程が途切れずに移動していく音。",
    tags:["うにょ","うにょー","うにょ〜","滑る","音程が滑る","スライド","グリッサンド","glissando","slide","トロンボーン","trombone"],
    sourceType: "v6-instrument-expression",
    verificationStatus: "unverified",
    verifiedPrompt: "",
    verificationNote: "",
    recommendedModifiers: [],
    testedModel: "",
    testedDate: "",
    rating: null,
    exampleAudio: "",
    premium: false
  },
  {
    id: "trombone-legato-slide",
    category: "instrument-technique",
    instrumentId: "trombone",
    technique: "Legato Slide",
    techniqueJa: "レガートスライド",
    originalPrompt: "slow short-distance legato slide, continuous unbroken tone",
    meaning:"短い音程差をゆっくりスライドさせ、音を切らずにつなぐ奏法。",
    soundDescription:"音が途切れず、ぬるっと隣の音へ移る落ち着いた音。",
    tags:["ぬるっ","つながる","切れない","ゆっくり滑る","レガート","legato","slide","トロンボーン","trombone"],
    sourceType: "v6-instrument-expression",
    verificationStatus: "unverified",
    verifiedPrompt: "",
    verificationNote: "",
    recommendedModifiers: [],
    testedModel: "",
    testedDate: "",
    rating: null,
    exampleAudio: "",
    premium: false
  },
  {
    id: "trombone-articulated-repeated-notes",
    category: "instrument-technique",
    instrumentId: "trombone",
    technique: "Articulated Repeated Notes",
    techniqueJa: "同音反復（粒立ち）",
    originalPrompt: "repeat the same adjacent pitches as distinct separated notes, clearly articulated and settled",
    meaning:"隣り合う同じ音を、つなげずに1音ずつ区切って鳴らす吹き方。",
    soundDescription:"「タン、タン」と粒が分かれて、落ち着いて聴こえる音。",
    tags:["タンタン","粒","区切る","はっきり","刻む","反復","articulated","separated","トロンボーン","trombone"],
    sourceType: "v6-instrument-expression",
    verificationStatus: "unverified",
    verifiedPrompt: "",
    verificationNote: "",
    recommendedModifiers: [],
    testedModel: "",
    testedDate: "",
    rating: null,
    exampleAudio: "",
    premium: false
  },
  {
    id: "trombone-sustained-low-muted",
    category: "instrument-technique",
    instrumentId: "trombone",
    technique: "Sustained Low Tones / Muted Answers",
    techniqueJa: "低音ロングトーン＋ミュート応答",
    originalPrompt: "sustained low tones, short answering phrases, muted tone",
    meaning:"低音を長く伸ばしつつ、短い返しのフレーズをミュートした音色で入れる使い方。",
    soundDescription:"下で長く鳴りながら、ときどき「ぽっ」と抑えた音で応える音。",
    tags:["低音","伸ばす","ロングトーン","ミュート","muted","sustained","合いの手","トロンボーン","trombone"],
    sourceType: "v6-instrument-expression",
    verificationStatus: "unverified",
    verifiedPrompt: "",
    verificationNote: "",
    recommendedModifiers: [],
    testedModel: "",
    testedDate: "",
    rating: null,
    exampleAudio: "",
    premium: false
  },
  {
    id: "electric-guitar-palm-muted-playing",
    category: "instrument-technique",
    instrumentId: "eguitar",
    technique: "Palm-muted Playing",
    techniqueJa: "パームミュート",
    originalPrompt: "palm-muted playing, short staccato figures",
    meaning:"ブリッジ付近に手のひらを軽く乗せて弦を抑え、短く歯切れよく刻む奏法。",
    soundDescription:"「ズンズン」と詰まった short な刻みになる音。",
    tags:["ズンズン","ずんずん","刻む","ミュート","パームミュート","palm mute","palm-muted","staccato","ギター","guitar"],
    sourceType: "v6-instrument-expression",
    verificationStatus: "unverified",
    verifiedPrompt: "",
    verificationNote: "",
    recommendedModifiers: [],
    testedModel: "",
    testedDate: "",
    rating: null,
    exampleAudio: "",
    premium: false
  }
];

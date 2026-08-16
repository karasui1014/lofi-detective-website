/* ============================================================
   シーダンス2.5 プロンプト工房 ── 語彙辞書・上限値・プリセット
   ここを編集すれば語彙を増やせます。JSONではなくJSにしているのは
   file:// で直接開いても動くようにするためです。
   ============================================================ */
"use strict";

/* 画面の右下に出す版数。中身を変えたら上げること。
   「更新したのに画面が古い」を一目で切り分けるための目印。 */
const APP_VERSION = "v4 参考・内容・展開・固定";

/* 仕様上限（プラットフォームで変わるのでここだけ直せば追従できます） */
const LIMITS = {
  images: 30,
  videos: 10,
  audios: 10,
  total: 50,
  people: 8,
  maxDuration: 30
};

/* ---------- カメラワーク（1ビートに1つだけ） ---------- */
const CAMERA_MOVES = [
  { en: "locked-off",  ja: "固定（フィックス）" },
  { en: "dolly in",    ja: "寄る（ドリーイン）" },
  { en: "dolly out",   ja: "引く（ドリーアウト）" },
  { en: "truck left",  ja: "左へ平行移動" },
  { en: "truck right", ja: "右へ平行移動" },
  { en: "pan left",    ja: "左へパン" },
  { en: "pan right",   ja: "右へパン" },
  { en: "tilt up",     ja: "上へティルト" },
  { en: "tilt down",   ja: "下へティルト" },
  { en: "crane up",    ja: "クレーンアップ" },
  { en: "crane down",  ja: "クレーンダウン" },
  { en: "arc left",    ja: "左へ回り込み" },
  { en: "arc right",   ja: "右へ回り込み" },
  { en: "tracking",    ja: "追従（トラッキング）" },
  { en: "handheld",    ja: "手持ち" },
  { en: "aerial",      ja: "空撮" },
  { en: "rack focus",  ja: "ラックフォーカス" }
];

const SHOT_SIZES = [
  { en: "extreme wide shot",  ja: "超ロング" },
  { en: "wide shot",          ja: "ロング" },
  { en: "full shot",          ja: "フルショット" },
  { en: "medium shot",        ja: "ミディアム" },
  { en: "medium close-up",    ja: "ミディアムクローズ" },
  { en: "close-up",           ja: "クローズアップ" },
  { en: "extreme close-up",   ja: "大アップ" }
];

const CAMERA_HEIGHTS = [
  { en: "eye level",      ja: "アイレベル" },
  { en: "low angle",      ja: "ローアングル" },
  { en: "high angle",     ja: "ハイアングル" },
  { en: "overhead",       ja: "真俯瞰" },
  { en: "ground level",   ja: "地面すれすれ" },
  { en: "shoulder level", ja: "肩の高さ" }
];

const PACES = [
  { en: "slow",         ja: "ゆっくり" },
  { en: "steady",       ja: "一定" },
  { en: "brisk",        ja: "速め" },
  { en: "accelerating", ja: "加速していく" },
  { en: "decelerating", ja: "減速していく" }
];

/* ---------- 画作り ---------- */
const LIGHTING = [
  { en: "golden hour",             ja: "夕方の斜光" },
  { en: "rim light",               ja: "リムライト（輪郭光）" },
  { en: "natural light",           ja: "自然光" },
  { en: "soft window light",       ja: "柔らかい窓光" },
  { en: "overcast diffused light", ja: "曇天の拡散光" },
  { en: "hard sunlight",           ja: "強い直射日光" },
  { en: "backlit",                 ja: "逆光" },
  { en: "neon",                    ja: "ネオン" },
  { en: "practical light",         ja: "画面内の照明（電球・看板）" },
  { en: "moonlight",               ja: "月明かり" },
  { en: "candlelight",             ja: "ろうそくの灯り" },
  { en: "firelight",               ja: "焚き火の光" }
];

const TEXTURES = [
  { en: "cinematic",              ja: "シネマティック" },
  { en: "35mm film",              ja: "35mmフィルム" },
  { en: "documentary handheld",   ja: "ドキュメンタリー手持ち" },
  { en: "anime style",            ja: "アニメ調" },
  { en: "3D CG render",           ja: "3DCG" },
  { en: "clay render",            ja: "クレイレンダー（白模型）" },
  { en: "stop motion",            ja: "ストップモーション" },
  { en: "vintage 8mm",            ja: "8mmビンテージ" },
  { en: "high fashion editorial", ja: "ファッション誌調" },
  { en: "product studio",         ja: "商品スタジオ撮影" },
  { en: "4K high detail",         ja: "4K高精細" }
];

const COLORS = [
  { en: "warm tone",       ja: "暖色寄り" },
  { en: "cool palette",    ja: "寒色寄り" },
  { en: "desaturated",     ja: "低彩度" },
  { en: "high contrast",   ja: "ハイコントラスト" },
  { en: "pastel",          ja: "パステル" },
  { en: "monochrome",      ja: "モノクロ" },
  { en: "teal and orange", ja: "ティール＆オレンジ" },
  { en: "high key",        ja: "ハイキー（明るめ）" },
  { en: "low key",         ja: "ローキー（暗め）" }
];

/* ---------- 禁止（avoid）・一貫性ロック ---------- */
const AVOID_TAGS = [
  { en: "jitter",              ja: "細かい揺れ・ブレ" },
  { en: "bent limbs",          ja: "手足の曲がり・破綻" },
  { en: "extra fingers",       ja: "指の増殖" },
  { en: "temporal flicker",    ja: "フレーム間のちらつき" },
  { en: "identity drift",      ja: "顔が途中で変わる" },
  { en: "morphing faces",      ja: "顔のモーフィング" },
  { en: "chaotic composition", ja: "散らかった構図" },
  { en: "warped text",         ja: "文字の崩れ" },
  { en: "sudden cuts",         ja: "意図しないカット割り" },
  { en: "watermark",           ja: "ウォーターマーク" },
  { en: "duplicated objects",  ja: "物体の増殖" }
];

const LOCKS = [
  "顔立ち・髪型は最後まで同一に保つ",
  "衣装は途中で変えない",
  "小道具の個数を変えない",
  "背景の世界観・場所を変えない",
  "時間帯と天候を変えない",
  "カメラの動きは1ショットにつき1つだけ",
  "登場人物の人数を増やさない",
  "画面内に文字を勝手に出さない"
];

/* ---------- 用途プリセット ---------- */
const PRESETS = [
  {
    id: "ad", name: "広告（15秒）", duration: 15, aspect: "16:9",
    lighting: ["soft window light"], textures: ["product studio", "4K high detail"], colors: ["high contrast"],
    beats: [4, 7, 4]
  },
  {
    id: "sns", name: "SNSショート（10秒）", duration: 10, aspect: "9:16",
    lighting: ["natural light"], textures: ["cinematic"], colors: ["warm tone"],
    beats: [4, 6]
  },
  {
    id: "mv", name: "MV（30秒）", duration: 30, aspect: "16:9",
    lighting: ["neon", "rim light"], textures: ["cinematic", "35mm film"], colors: ["teal and orange", "low key"],
    beats: [6, 16, 8]
  },
  {
    id: "drama", name: "ショートドラマ（30秒）", duration: 30, aspect: "2.39:1",
    lighting: ["overcast diffused light"], textures: ["35mm film"], colors: ["desaturated"],
    beats: [5, 7, 10, 8]
  },
  {
    id: "product", name: "商品紹介（15秒）", duration: 15, aspect: "1:1",
    lighting: ["soft window light"], textures: ["product studio"], colors: ["high key"],
    beats: [3, 8, 4]
  },
  {
    id: "broll", name: "Bロール・イメージ（5秒）", duration: 5, aspect: "16:9",
    lighting: ["golden hour"], textures: ["cinematic"], colors: ["warm tone"],
    beats: [5]
  }
];

const ASPECTS = ["16:9", "9:16", "1:1", "4:5", "2.39:1"];
const RESOLUTIONS = ["1080p", "2K", "4K"];
const DURATIONS = [5, 10, 15, 20, 30];

const DIALOG_LANGS = ["Japanese", "English", "Chinese", "Korean", "French", "Spanish"];
const DIALOG_MANNERS = [
  { en: "quietly", ja: "静かに" },
  { en: "calmly", ja: "落ち着いて" },
  { en: "cheerfully", ja: "明るく" },
  { en: "urgently", ja: "焦って" },
  { en: "coldly", ja: "冷たく" },
  { en: "warmly", ja: "優しく" },
  { en: "shouting", ja: "叫ぶように" },
  { en: "whispering", ja: "ささやくように" }
];

/* ============================================================
   かんたんモード用
   ============================================================ */

/* 用途を1つ選ぶだけで、尺・画面比・光・質感・色・カメラの流れが決まる */
const SIMPLE_PURPOSES = [
  {
    id: "cm", name: "CM・広告", desc: "商品やサービスをきれいに見せる",
    duration: 15, aspect: "16:9",
    lighting: ["soft window light"], textures: ["product studio", "4K high detail"], colors: ["high contrast"],
    cameras: ["locked-off", "dolly in", "locked-off"],
    startSize: "medium shot", endSize: "close-up", height: "eye level", pace: "steady",
    avoid: ["jitter", "warped text", "duplicated objects"],
    locks: ["小道具の個数を変えない", "画面内に文字を勝手に出さない"],
    fixes: ["product", "count"]
  },
  {
    id: "mv", name: "MV・音楽映像", desc: "曲に合わせた雰囲気重視の画",
    duration: 15, aspect: "16:9",
    lighting: ["neon", "rim light"], textures: ["cinematic", "35mm film"], colors: ["teal and orange", "low key"],
    cameras: ["arc right", "dolly in", "handheld"],
    startSize: "wide shot", endSize: "medium close-up", height: "low angle", pace: "slow",
    avoid: ["jitter", "identity drift", "bent limbs"],
    locks: ["顔立ち・髪型は最後まで同一に保つ"],
    fixes: ["face", "tone"]
  },
  {
    id: "drama", name: "ショートドラマ", desc: "人物の芝居と物語を見せる",
    duration: 30, aspect: "2.39:1",
    lighting: ["overcast diffused light"], textures: ["35mm film"], colors: ["desaturated"],
    cameras: ["locked-off", "dolly out", "arc right", "locked-off"],
    startSize: "wide shot", endSize: "medium close-up", height: "eye level", pace: "slow",
    avoid: ["jitter", "identity drift", "bent limbs"],
    locks: ["顔立ち・髪型は最後まで同一に保つ", "衣装は途中で変えない"],
    fixes: ["face", "wardrobe", "place"]
  },
  {
    id: "product", name: "商品紹介", desc: "手に取って見せる・使ってみせる",
    duration: 15, aspect: "1:1",
    lighting: ["soft window light"], textures: ["product studio"], colors: ["high key"],
    cameras: ["locked-off", "dolly in", "arc left"],
    startSize: "medium shot", endSize: "close-up", height: "eye level", pace: "steady",
    avoid: ["jitter", "warped text", "duplicated objects", "extra fingers"],
    locks: ["小道具の個数を変えない"],
    fixes: ["product", "count"]
  },
  {
    id: "sns", name: "SNSショート", desc: "スマホ縦画面・短くテンポよく",
    duration: 10, aspect: "9:16",
    lighting: ["natural light"], textures: ["cinematic"], colors: ["warm tone"],
    cameras: ["handheld", "dolly in"],
    startSize: "medium shot", endSize: "medium close-up", height: "eye level", pace: "brisk",
    avoid: ["jitter", "identity drift"],
    locks: ["顔立ち・髪型は最後まで同一に保つ"],
    fixes: ["face"]
  },
  {
    id: "image", name: "イメージ映像", desc: "背景・Bロール・雰囲気カット",
    duration: 5, aspect: "16:9",
    lighting: ["golden hour"], textures: ["cinematic"], colors: ["warm tone"],
    cameras: ["dolly in"],
    startSize: "wide shot", endSize: "medium shot", height: "eye level", pace: "slow",
    avoid: ["jitter", "temporal flicker"],
    locks: [],
    fixes: ["place", "tone"]
  }
];

/* 画像の役割を1つ選ぶと、「使う属性」と「使わない属性」が両方入る */
const IMAGE_ROLES = [
  { v: "face",     l: "人物の顔",         uses: "顔立ちと髪型",             notUses: "背景・構図・衣装" },
  { v: "wardrobe", l: "衣装",             uses: "衣装の色と質感",           notUses: "人物とポーズ・背景" },
  { v: "product",  l: "商品・小道具",     uses: "商品の形状と質感",         notUses: "背景・持ち手" },
  { v: "place",    l: "場所・背景",       uses: "ロケーションの空間と光",   notUses: "人物" },
  { v: "tone",     l: "色のトーン見本",   uses: "色トーンの見本",           notUses: "人物と場所・構図" },
  { v: "compose",  l: "構図の参考",       uses: "構図とカメラ位置",         notUses: "人物の見た目・色" }
];

/* ---------- かんたんモードの質問（選ぶだけで埋まるもの） ---------- */

/* 主役の種類。書き出しの「内容」で主語をはっきりさせるために使う */
const SUBJECT_KINDS = [
  { v: "person",  l: "人物",             hint: "実写の人。顔を固定したいならここ" },
  { v: "product", l: "商品・モノ",       hint: "商品PR・物撮り" },
  { v: "place",   l: "風景・場所",       hint: "人が出ない情景カット" },
  { v: "chara",   l: "キャラクター",     hint: "アニメ・イラスト調の登場人物" }
];

/* 場所の候補。チップで選ぶか、自由に書いてもよい */
const PLACE_CHIPS = [
  "商店街", "街角", "室内", "カフェ", "自室", "スタジオ（白背景）",
  "自然・森", "海辺", "夜の街（ネオン）", "電車・駅", "ライブ会場", "屋上"
];

/* 展開の型。選ぶとビートのカメラの流れが決まる。
   空の cameras は「用途におまかせ」= 用途プリセットの流れを使う。 */
const FLOW_PATTERNS = [
  { v: "",        l: "用途におまかせ",   desc: "選んだ用途に合う流れを自動で当てます", cameras: [] },
  { v: "quiet",   l: "静か→動く→静か",  desc: "いちばん破綻しにくい基本形",
    cameras: ["locked-off", "dolly in", "locked-off"] },
  { v: "closein", l: "だんだん寄る",     desc: "主役に注目を集めたいとき",
    cameras: ["dolly in"] },
  { v: "pullout", l: "ゆっくり引く",     desc: "全体像を最後に見せたいとき",
    cameras: ["dolly out"] },
  { v: "steady",  l: "ずっと固定",       desc: "被写体の動きだけを見せたいとき",
    cameras: ["locked-off"] },
  { v: "follow",  l: "手持ちで追う",     desc: "ドキュメンタリー風・臨場感",
    cameras: ["handheld", "tracking"] }
];

/* 「固定」で選べるもの。選んだぶんだけ固定の指示文になる。
   avoid は、その固定を守らせるために効く技術的な禁止語。 */
const FIX_TARGETS = [
  { v: "face",     l: "顔と髪型",       lock: "顔立ち・髪型は最後まで同一に保つ",   avoid: ["identity drift", "morphing faces"] },
  { v: "wardrobe", l: "衣装",           lock: "衣装は途中で変えない",               avoid: [] },
  { v: "product",  l: "商品の形と色",   lock: "商品の形・色・ロゴを変えない",       avoid: ["duplicated objects", "warped text"] },
  { v: "place",    l: "場所",           lock: "背景の世界観・場所を変えない",       avoid: [] },
  { v: "tone",     l: "全体の色味",     lock: "全体の色味と明るさを変えない",       avoid: [] },
  { v: "count",    l: "人数・個数",     lock: "登場人物の人数と小道具の個数を変えない", avoid: ["duplicated objects"] }
];

/* ---------- 素材の役割プリセット（入力補助のdatalist用） ---------- */
const REF_ROLE_PRESETS = {
  image: [
    "顔立ちと髪型", "衣装の色と質感", "商品の形状と質感", "ロケーションの空間と光",
    "小道具の形状", "色トーンの見本",
    "ストーリーボード（コマ割りと読み順）",
    "3Dブロックアウト・粗（人物と物の配置・動線）",
    "3Dブロックアウト・精（構図とカメラ位置）"
  ],
  video: [
    "動作のリズム", "カメラワーク", "テンポと時系列",
    "編集する元の映像そのもの", "延長する元の映像そのもの"
  ],
  audio: ["声質", "台詞", "環境音", "効果音", "音楽"]
};

const REF_NOTUSE_PRESETS = [
  "背景・構図", "見た目と場所", "衣装", "人物とポーズ",
  "色と質感", "照明", "テクスチャと色（形だけ使う）"
];

/* ---------- 境界フレームの方式 ---------- */
const FRAME_MODES = [
  { v: "", l: "使わない" },
  { v: "strict", l: "厳密指定（APIの first_frame / last_frame）" },
  { v: "semantic", l: "意味的参照（本文で「最初のフレームとして参照」と書く）" }
];

/* ---------- 延長の向き ---------- */
const EXTEND_DIRS = [
  { v: "backward", l: "後方へ延長（この続きを作る）" },
  { v: "forward", l: "前方へ延長（この前の場面を作る）" }
];

/* ---------- 検証用の辞書 ---------- */

/* 発話をほのめかす語（台詞の創作を防ぐ検知用） */
const SPEECH_WORDS = [
  "と言う", "と言い", "と話", "と告げ", "と叫", "と呟", "とつぶや", "と答え", "と返事",
  "話しかけ", "呼びかけ", "セリフ", "台詞",
  "says", "said", "speaks", "shouts", "whispers", "tells"
];

/* 曖昧語 → 具体化のヒント */
const VAGUE_WORDS = [
  { w: "素敵",     hint: "何がどう素敵かを、光・色・質感・表情の具体で書く" },
  { w: "かっこい", hint: "シルエット・角度・光の当たり方に置き換える" },
  { w: "すごい",   hint: "大きさ・速さ・数などの計測できる表現に置き換える" },
  { w: "綺麗",     hint: "反射・透明感・彩度など見た目の要素に置き換える" },
  { w: "きれい",   hint: "反射・透明感・彩度など見た目の要素に置き換える" },
  { w: "美しい",   hint: "対称性・光・色の組み合わせなど具体に置き換える" },
  { w: "感動的",   hint: "感情ではなく、目・呼吸・手の動きの変化で表す" },
  { w: "最高",     hint: "評価語は効かない。見える要素に置き換える" },
  { w: "おしゃれ", hint: "年代・素材・配色（例: 70年代・真鍮・くすんだ緑）に置き換える" },
  { w: "epic",     hint: "評価語は効かない。スケールを画角と被写体サイズで示す" },
  { w: "amazing",  hint: "評価語は効かない。具体的な視覚要素に置き換える" },
  { w: "stunning", hint: "評価語は効かない。光と質感の記述に置き換える" },
  { w: "awesome",  hint: "評価語は効かない。具体的な視覚要素に置き換える" },
  { w: "beautiful",hint: "評価語は効かない。具体的な視覚要素に置き換える" },
  { w: "dramatic", hint: "コントラスト・影の落ち方・カメラ位置で表現する" },
  { w: "たくさん動", hint: "「動きが多い」は破綻の元。動作を1つに絞る" }
];

/* 動作動詞（1ビートの詰め込み検知用） */
const ACTION_VERBS = [
  "歩く","歩き","走る","走り","座る","座り","立ち上が","立つ","立ち","振り向","振り返",
  "持ち上げ","持ち","置く","置き","開け","閉め","笑う","笑い","泣く","泣き","渡す","渡し",
  "受け取","見る","見上げ","見下ろ","手を伸ば","かがむ","かがみ","回る","回り","倒れ",
  "投げ","飲む","飲み","食べ","話す","話し","頷く","頷き","首を振","登る","降り","入る","出る",
  "walk","run","sit","stand","turn","lift","place","open","close","smile","cry",
  "hand","reach","kneel","throw","drink","nod","enter","exit","climb"
];

/* 感情語と、身体の具体記述語 */
const EMOTION_WORDS = ["悲し","嬉し","うれし","怒","不安","驚","喜","寂し","切な","焦","安心",
  "sad","happy","angry","anxious","surprised","joy","lonely","nervous","relieved"];
const BODY_WORDS = ["目","眉","呼吸","肩","口元","唇","顎","まばたき","涙","指","手","背中","首",
  "eyes","brow","breath","shoulder","lips","jaw","blink","tears","fingers","hands"];

/* カメラ語（ビート本文への混入検知用） */
const CAMERA_KEYWORDS = [
  "ドリー","パン","ティルト","クレーン","ズーム","寄り","引き","回り込","追従","手持ち","空撮","俯瞰",
  "dolly","pan","tilt","crane","zoom","truck","arc","orbit","tracking","handheld","aerial","rack focus"
];

// Shared diagnosis logic used by BOTH:
//   - the Cloudflare Pages Function (functions/api/diagnose.js) — production
//   - the local Node dev server (server/server.js)
// Uses the Gemini REST API via fetch (no SDK required, works in Workers runtime).

export const MODEL_DEFAULT = "gemini-2.5-flash";
export const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const SYSTEM_PROMPT = `あなたはトップレベルのパーソナルカラーアナリスト兼「顔タイプ診断士」です。
1枚の顔写真から最高精度でパーソナルカラーと顔タイプを診断します。個人の特定・年齢・人種・健康状態などセンシティブな推測は行わず、似合うスタイルの観点のみで判断してください。

━━ パーソナルカラー診断 ━━

【観察順序と重み付け】
① 肌のアンダートーン（最重要・全体の50%）
  ・肌に黄みや赤みがある、透明感よりも血色感が出る → warm（イエベ）
  ・肌にピンクや青みがある、透き通るような清涼感がある → cool（ブルベ）
  ・肌のハイライト部分（頬骨・額・鼻頭）の色みを特に参照する

② 瞳の色と質感（25%）
  ・明るいブラウン・ハニー・オリーブ・茶色がかったオレンジ → warm
  ・ダークブラウン（黒に近い）→ warm/coolどちらにもあり得る、他要素で判断
  ・グレーがかった茶・チャコール・灰みがかった色 → cool

③ 髪の色のニュアンス（25%）
  ・赤みブラウン・キャラメル・ゴールド系黒 → warm
  ・アッシュブラウン・青みがかった黒・シルバーグレー → cool

【写真条件による補正】
  ・電球色（暖かみある照明）→ 実際より黄みが強く見える → わずかにcool寄りに補正
  ・蛍光灯・青白い照明 → 実際より青みが出る → わずかにwarm寄りに補正
  ・屋外の自然光 → 最も信頼性高い、補正不要
  ・暗い・ぼやけている → confidence を low に設定

【4シーズン判定基準】
  spring（イエベ春）: warm × 明るい × 澄んでいる
    肌に透明感と温かみ、瞳がキラキラ明るい、血色が良く見える。
    コーラル・ピーチ・アプリコット・アイボリー・ライトグリーンが映える。
    NG：くすみカラー・深いダーク系・青みが強い色。

  summer（ブルベ夏）: cool × 明るい × くすんでいる
    肌が白く柔らかい印象、瞳は柔らかいブラウン。ソフトな雰囲気。
    ラベンダー・ダスティローズ・スモーキーブルー・モーブ・くすみピンクが映える。
    NG：ビビッドカラー・オレンジ系・強い黄みの色。

  autumn（イエベ秋）: warm × 暗い × くすんでいる
    肌にマット感・深みがある。重厚感のある印象。
    テラコッタ・マスタード・オリーブ・キャメル・バーガンディが映える。
    NG：パステル・明るすぎる色・青みが強い色。

  winter（ブルベ冬）: cool × 暗い × 澄んでいる
    肌の白さとコントラストが際立つ。クールで凛とした印象。
    ピュアホワイト・ジェットブラック・ロイヤルブルー・マゼンタ・エメラルドが映える。
    NG：くすみカラー・オレンジ系・イエロー・暖かみのある中間色。

━━ 顔タイプ診断 ━━

【軸①：子供顔 ↔ 大人顔】
子供顔の特徴（多いほど子供顔）:
  ・輪郭が丸い（円形・やや丸めの卵形・ベース形で丸み強い）
  ・目が大きく丸い・たれ目気味
  ・パーツが顔の中央に集まり、顔の外側に余白がある
  ・鼻が低め・丸みを帯びている
  ・唇が丸くぷっくりしている
  ・全体的にふっくらとした柔らかい印象

大人顔の特徴（多いほど大人顔）:
  ・輪郭が縦長・面長・シャープ（卵形でも縦が長め）
  ・目が細め・切れ長・目尻が水平か上がり気味
  ・パーツが顔全体に広がって配置、余白が少ない
  ・鼻筋が通っていてスッと高い
  ・唇が薄めか直線的なラインを持つ
  ・全体的にシャープ・凛とした印象

【軸②：曲線 ↔ 直線】
曲線の特徴:
  ・輪郭のエッジが丸く流れるライン、角がない
  ・目がアーモンド型・たれ目・やわらかい曲線
  ・鼻の形が丸みを帯びている
  ・唇がぷっくりとカーブし、ボリュームがある
直線の特徴:
  ・輪郭にシャープなエッジ、角ばりがある
  ・目が切れ長・平行気味・スッとした横長
  ・鼻筋が直線的ではっきりしている
  ・唇が薄めか、エッジの立った形

【8タイプ判定】
  キュート      : 子供×曲線の極。最も丸くかわいい印象。
  アクティブキュート: 子供×直線寄り。元気でハキハキ、個性的な愛らしさ。
  フレッシュ    : 子供寄り中間×直線。清潔感・爽やか・スポーティな若さ。
  クールカジュアル: 中間×直線。知的でカジュアル、クールだが親しみやすい。
  クール        : 大人×直線の極。最もシャープでマニッシュ。モード・クール。
  エレガント    : 大人×中間。バランス良く華やか。女優的な存在感。
  ソフトエレガント: 大人×曲線寄り。上品・やわらか・清楚な大人の女性。
  フェミニン    : 大人×曲線の極。最も女性的で甘い。艶やかでロマンティック。

隣接タイプとの境界にいる場合は reasoning でその旨に言及すること。

━━ 出力指針 ━━
  ・reasoning は各2〜3文。「〇〇の特徴から〇〇と判定」のように具体的根拠を書く
  ・palette はその人が実際に映える代表色を6〜8色（16進）
  ・recommendation.items の searchKeyword: ZOZOTOWN・楽天・Amazonで上位に出る日本語キーワード。
    パーソナルカラーのシーズン語＋テイスト＋アイテム名。
    例「イエベ秋 テラコッタ きれいめ フレアスカート」「ブルベ夏 くすみブルー ニット ブラウス」
  ・顔が不明瞭または照明が不適切な場合は faceDetected: false または confidence: low を設定`;

export const USER_INSTRUCTION =
  "この写真の人物に似合うパーソナルカラーと顔タイプを診断し、おすすめコーデと検索キーワードをJSONで返してください。";

export const SCHEMA = {
  type: "object",
  properties: {
    faceDetected: { type: "boolean" },
    personalColor: {
      type: "object",
      properties: {
        season: { type: "string", enum: ["spring", "summer", "autumn", "winter"] },
        seasonLabel: { type: "string" },
        undertone: { type: "string", enum: ["warm", "cool", "neutral"] },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        reasoning: { type: "string" },
        palette: { type: "array", items: { type: "string" } },
      },
      required: ["season", "seasonLabel", "undertone", "confidence", "reasoning", "palette"],
    },
    faceType: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["キュート", "アクティブキュート", "フレッシュ", "クールカジュアル", "クール", "エレガント", "ソフトエレガント", "フェミニン"],
        },
        childAdult: { type: "string", enum: ["子供寄り", "中間", "大人寄り"] },
        curveStraight: { type: "string", enum: ["曲線寄り", "中間", "直線寄り"] },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        reasoning: { type: "string" },
      },
      required: ["type", "childAdult", "curveStraight", "confidence", "reasoning"],
    },
    recommendation: {
      type: "object",
      properties: {
        summary: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              advice: { type: "string" },
              searchKeyword: { type: "string" },
            },
            required: ["category", "advice", "searchKeyword"],
          },
        },
        avoid: { type: "string" },
      },
      required: ["summary", "items", "avoid"],
    },
  },
  required: ["faceDetected", "personalColor", "faceType", "recommendation"],
};

export const EXTRACT_SYSTEM_PROMPT = `あなたはファッション画像から着用アイテムを抽出するスペシャリストです。
1枚の画像から、写っているすべてのファッションアイテムを可能な限り具体的に特定してください。
人物の顔・体型・個人特定につながる属性は無視し、衣類・小物のみに注目してください。

【抽出対象カテゴリ】
トップス / ボトムス / ワンピース / アウター / シューズ / バッグ / アクセサリー（帽子・スカーフ・ベルト・ジュエリーなど）

【各アイテムのフィールド】
- category: 日本語カテゴリ名（上記から選択）
- color: 色の正確な日本語表現。単に「青」でなく「くすみブルー」「ネイビー」「コバルトブルー」のように具体的に
- material: 目視で推定できる素材・テクスチャ（例: リネン / ニット / シフォン / デニム / コーデュロイ / レザー / 綿 / ベロア）。不明な場合は省略可
- silhouette: シルエット・丈・ディテール（例: オーバーサイズ / タイトシルエット / Aライン / ミモレ丈 / ハイウエスト / Vネック / バルーンスリーブ）
- searchKeyword: ZOZOTOWNや楽天ファッションで検索すると「似た商品」が上位に出る日本語キーワード。
  構成: 「色 + 素材/質感 + シルエット/ディテール + カテゴリ名」の順。
  良い例: 「くすみブルー リネン オーバーサイズ シャツ」「ミルクティーベージュ ニット タートルネック」「テラコッタ フレア ミモレ丈 スカート」
  悪い例: 「青いシャツ」「スカート」「きれいめ服」（抽象的すぎてヒットしない）
  ポイント: パーソナルカラーや顔タイプのワードは不要。素材感・色の具体名・シルエット名を優先する。
- searchKeywordShort: 2〜3語のシンプルな検索キーワード。「色 + カテゴリ」のみ。例「くすみブルー シャツ」「テラコッタ スカート」「ベージュ ニット」
- boundingBox: 画像内でそのアイテムが写っている領域を、画像サイズを 1.0 とした正規化座標で指定。
  x = 左端の位置（0.0〜1.0）、y = 上端の位置（0.0〜1.0）、w = 幅の割合、h = 高さの割合。
  例: トップスのみ → {"x":0.1,"y":0.05,"w":0.8,"h":0.45} / ボトムスのみ → {"x":0.1,"y":0.45,"w":0.8,"h":0.5}
  シューズ → {"x":0.15,"y":0.75,"w":0.7,"h":0.25} / バッグ → 手に持っているか肩にかかっている範囲

【注意事項】
- 画像全体をスキャンし、見えているアイテムをすべて列挙する（5〜8点が目安）
- 重なって一部しか見えないアイテムも推測して含める
- ブランドロゴが見える場合はsearchKeywordにブランド名を加えてよい
- 見えない・判断できない場合は該当フィールドを省略する（誤情報を書かない）`;

export const EXTRACT_USER_INSTRUCTION =
  "この画像に写っているファッションアイテムをすべて抽出し、JSONで返してください。";

export const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          color: { type: "string" },
          material: { type: "string" },
          silhouette: { type: "string" },
          searchKeyword: { type: "string" },
          searchKeywordShort: { type: "string" },
          boundingBox: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              w: { type: "number" },
              h: { type: "number" },
            },
            required: ["x", "y", "w", "h"],
          },
        },
        required: ["category", "color", "searchKeyword"],
      },
    },
  },
  required: ["items"],
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Runs one diagnosis. `apiKey` is the Gemini API key string.
export async function runDiagnosis(apiKey, { imageBase64, mediaType, model }) {
  const modelName = model || MODEL_DEFAULT;
  const url = `${GEMINI_API_BASE}/${modelName}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          parts: [
            { inlineData: { mimeType: mediaType, data: imageBase64 } },
            { text: USER_INSTRUCTION },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    const err = new Error(errData?.error?.message || `Gemini API error ${resp.status}`);
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("モデルからテキスト応答が得られませんでした。");

  return { result: JSON.parse(text), usage: data.usageMetadata || {} };
}

// Runs outfit extraction on a (typically AI-generated) fashion image.
export async function runOutfitExtraction(apiKey, { imageBase64, mediaType, model }) {
  const modelName = model || MODEL_DEFAULT;
  const url = `${GEMINI_API_BASE}/${modelName}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: EXTRACT_SYSTEM_PROMPT }] },
      contents: [
        {
          parts: [
            { inlineData: { mimeType: mediaType, data: imageBase64 } },
            { text: EXTRACT_USER_INSTRUCTION },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: EXTRACT_SCHEMA,
      },
    }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    const err = new Error(errData?.error?.message || `Gemini API error ${resp.status}`);
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("モデルからテキスト応答が得られませんでした。");
  return { result: JSON.parse(text), usage: data.usageMetadata || {} };
}

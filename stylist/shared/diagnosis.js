// Shared diagnosis logic used by BOTH:
//   - the Cloudflare Pages Function (functions/api/diagnose.js) — production
//   - the local Node dev server (server/server.js)
// Uses the Gemini REST API via fetch (no SDK required, works in Workers runtime).

export const MODEL_DEFAULT = "gemini-2.0-flash";
export const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const SYSTEM_PROMPT = `あなたはプロのパーソナルカラーアナリスト兼「顔タイプ診断」アドバイザーです。
1枚の顔写真から、その人に似合うファッションを提案します。個人を特定したり、年齢・人種・健康状態などセンシティブな属性を推測したりせず、似合うスタイルの観点だけで判断してください。

# パーソナルカラー（4シーズン）
肌・髪・瞳・唇の色みから、暖寒（黄み/青み）・明暗・清濁を総合して判定します。
- spring（イエベ春）: 暖×明×清。明るく澄んだ暖色（コーラル、ピーチ、ライトイエロー、若草色）。
- summer（ブルベ夏）: 寒×明×濁。やわらかく涼やかな寒色（ラベンダー、ローズ、スカイブルー、くすみ色）。
- autumn（イエベ秋）: 暖×暗×濁。深く落ち着いた暖色（テラコッタ、マスタード、カーキ、ブラウン）。
- winter（ブルベ冬）: 寒×暗×清。鮮やかでコントラストの強い寒色（ロイヤルブルー、純白、黒、マゼンタ）。
写真の照明で色は変わるため、確信度（confidence）を正直に付けてください。

# 顔タイプ（8分類）
2軸「子供っぽさ↔大人っぽさ」「曲線↔直線」で判定します。
- キュート: 子供×曲線。丸み・小さめパーツ。
- アクティブキュート: 子供×やや直線。元気で華やか。
- フレッシュ: 子供寄り中間×直線。爽やかでカジュアル。
- クールカジュアル: 中間〜大人×直線。ほどよくシャープ。
- クール: 大人×直線。シャープでマニッシュ。
- エレガント: 大人×中間。華やかでバランス型。
- ソフトエレガント: 大人寄り×曲線。やわらかく上品。
- フェミニン: 大人×曲線。女性的で甘い。
顔の縦横比、輪郭の丸み/直線、目の大きさ・形、パーツの配置から推定してください。

# 出力
指定されたJSONスキーマに厳密に従って日本語で出力します。
- reasoning は各1〜2文で簡潔に、判断の根拠を述べる。
- palette は似合う色の16進カラーコードを6〜8色（例 "#C8743C"）。
- recommendation.items は3〜4カテゴリ（例 トップス / ボトムス / ワンピース / アウター 等）。
  各 advice は具体的な素材・シルエット・襟・柄の助言。searchKeyword はEC（楽天/Amazon）で検索して良い結果が出る日本語キーワード（季節カラー語＋顔タイプの雰囲気＋アイテム名を含める。例「くすみブルー きれいめ ブラウス」）。
- avoid は避けたい色・素材・シルエットを短く。
- 顔がはっきり写っていない場合は faceDetected を false にし、confidence を low にして、無難な範囲で best-effort を返す。`;

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

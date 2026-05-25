// Backend proxy: serves the static frontend (../public) and exposes
// POST /api/diagnose, which sends the uploaded photo to Claude (vision) and
// returns a structured JSON diagnosis. The API key stays server-side.
//
// Run:  ANTHROPIC_API_KEY=sk-ant-... npm start
//       (or put the key in server/.env — see .env.example)

import { createServer } from "node:http";
import { readFile, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

// --- minimal .env loader (no dependency) ---------------------------------
(function loadEnv() {
  const envPath = join(__dirname, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
})();

const PORT = process.env.PORT || 3000;
const MODEL = process.env.STYLIST_MODEL || "claude-opus-4-7";
const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BODY_BYTES = 12 * 1024 * 1024;

// --- the stylist rubric (stable → prompt-cached) -------------------------
const SYSTEM_PROMPT = `あなたはプロのパーソナルカラーアナリスト兼「顔タイプ診断」アドバイザーです。
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

const USER_INSTRUCTION = "この写真の人物に似合うパーソナルカラーと顔タイプを診断し、おすすめコーデと検索キーワードをJSONで返してください。";

// --- structured output schema --------------------------------------------
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    faceDetected: { type: "boolean" },
    personalColor: {
      type: "object",
      additionalProperties: false,
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
      additionalProperties: false,
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
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
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

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const e = new Error("ANTHROPIC_API_KEY が設定されていません。server/.env に設定してください。");
    e.statusCode = 500;
    throw e;
  }
  if (!client) client = new Anthropic();
  return client;
}

function extractJson(message) {
  const block = message.content.find((b) => b.type === "text");
  if (!block) throw new Error("モデルからテキスト応答が得られませんでした。");
  try {
    return JSON.parse(block.text);
  } catch {
    const s = block.text.indexOf("{");
    const e = block.text.lastIndexOf("}");
    if (s !== -1 && e !== -1) return JSON.parse(block.text.slice(s, e + 1));
    throw new Error("応答のJSON解析に失敗しました。");
  }
}

async function diagnose(imageBase64, mediaType) {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: USER_INSTRUCTION },
        ],
      },
    ],
  });
  const u = message.usage || {};
  console.log(`[diagnose] in=${u.input_tokens} out=${u.output_tokens} cache_read=${u.cache_read_input_tokens || 0} cache_write=${u.cache_creation_input_tokens || 0}`);
  return extractJson(message);
}

// --- HTTP helpers ---------------------------------------------------------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) { reject(Object.assign(new Error("画像サイズが大きすぎます。"), { statusCode: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = normalize(join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end("Forbidden"); return; }
  readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/api/health") {
    return sendJson(res, 200, { ok: true, hasKey: !!process.env.ANTHROPIC_API_KEY, model: MODEL });
  }

  if (req.method === "POST" && (req.url || "").split("?")[0] === "/api/diagnose") {
    try {
      const raw = await readBody(req);
      let payload;
      try { payload = JSON.parse(raw); } catch { return sendJson(res, 400, { error: "リクエストの形式が不正です。" }); }
      const { imageBase64, mediaType } = payload || {};
      if (typeof imageBase64 !== "string" || !imageBase64) return sendJson(res, 400, { error: "画像データがありません。" });
      if (!ALLOWED_MEDIA.has(mediaType)) return sendJson(res, 400, { error: "対応していない画像形式です。" });

      const result = await diagnose(imageBase64, mediaType);
      return sendJson(res, 200, result);
    } catch (err) {
      const status = err?.statusCode || err?.status || 500;
      const known = { 401: "APIキーが無効です。", 429: "リクエストが集中しています。少し待って再試行してください。", 413: err.message };
      console.error("[diagnose error]", err?.message || err);
      return sendJson(res, status >= 400 && status < 600 ? status : 500, { error: known[status] || err?.message || "サーバー内部エラー" });
    }
  }

  if (req.method === "GET") return serveStatic(req, res);
  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method Not Allowed");
});

server.listen(PORT, () => {
  console.log(`stylist server: http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn("⚠ ANTHROPIC_API_KEY 未設定 — /api/diagnose は失敗します（server/.env に設定してください）。");
});
